(function( $ ) {
    $.fn.kform = function(config) {
        var handler = this.selector;
        
        if(!$(handler).is('*')){
            return false;
        }
        
        if(!$(handler).hasClass('kform')){
            $(handler).addClass('kform');
        }
        
        $(handler).attr('data-type','json');
        
        if(config !== undefined && typeof config.onInit === 'function'){
            config.onInit(handler);
        }
        
        $('body').on('submit',handler,function(e){
            e.stopPropagation();
            
            var form = $(this);
            var action = $(form).attr('action');
            var data = $(form).serialize();
            var method = $(form).attr('method');
            var data_type = $(form).attr('data-type');
            
            var submitbtn = $(form).find('button.submit-btn');
            if($(submitbtn).attr('data-loading-text') === undefined || $(submitbtn).attr('data-loading-text') === ''){
                $(submitbtn).attr('data-loading-text',"Please wait...");
            }
            $(submitbtn).button('loading');
            
            $(form).find('.form-group.has-error').removeClass('has-error');
            $(form).find('p.error-message').remove();
            
            $.ajax({
                type: method,
                url: action,
                dataType: data_type,
                data: data,
                success: function(data){
                    if(data.success === false){
                        regenerateCSRF(form);
                        $.each(data.errors,function(field,item){
                            var formgroup = $(form).find('.form-group.'+field);
                            if($(formgroup).is('*')){
                                var inputgroup = $(formgroup).find('.input-group');
                                
                                $(formgroup).addClass('has-error');
                                
                                var customMsg = $(formgroup).find('.kform-custom-message');
                                if($(customMsg).is('*')){
                                    $(customMsg).append('<p class="text-danger error-message">'+item.message+'</p>');
                                }
                                else{
                                    if($(inputgroup).is('*')){
                                        $(inputgroup).after('<p class="text-danger error-message">'+item.message+'</p>');
                                    }
                                    else{
                                        if($(formgroup).find('.form-control').is('*')){
                                            $($(formgroup).find('.form-control')).after('<p class="text-danger error-message">'+item.message+'</p>');
                                        }
                                        else{
                                            $(formgroup).append('<p class="text-danger error-message">'+item.message+'</p>');
                                        }
                                    }
                                }
                            }
                            else{
                                var customDiv = $(form).find('.kform-custom-message.'+field);
                                if($(customDiv).is('*')){
                                    $(customDiv).append('<p class="text-danger error-message">'+item.message+'</p>');
                                }
                            }
                        });
                        
                        if($(form).find('input.captcha-field')){
                            $(form).find('input.captcha-field').val('');
                            refreshCaptcha($("a.captcha-refresh"));
                        
                        }
                        
                        $(submitbtn).button('reset');
                        cb($(form).attr('data-callback-error'),form,data);
                        
                        if($(form).hasClass('loaded-as-modal')){
                            performAsModal(form,data,submitbtn);
                            return false;
                        }
                    }
                    else{
                        if($(form).hasClass('loaded-as-modal')){
                            performAsModal(form,data,submitbtn);
                            return false;
                        }
                        
                        doAfterSuccess(form,data,submitbtn);
                    }
                    
                },
                error: function(e){
                    console.log(e.responseText);
                    $(form).append('ERROR: something went really wrong...');
                    $(submitbtn).button('reset');
                }
            });

            return false;
        });
        
        
        $('body').on('click','.kform-btn-save',function(e){
            e.stopPropagation();
            var form = $(this).parent().parent().find(handler);
            
            var modalFooter = $(this).closest('.modal-footer');
            $(modalFooter).find('.kform-btn').addClass('hide');
            $(modalFooter).append('<div class="action-loading">'+$(modalFooter).attr('data-loading-text')+'</div>');
            
            $(form).submit();
            return false;
        });

        $('body').on('click','.kform-btn-cancel',function(e){
            e.stopPropagation();
            var form = $(this).parent().parent().find(handler);
            $(form).find('.form-group.has-error').removeClass('has-error');
            $(form).find('p.error-message').remove();
            destroyModal();
            return false;
        });
        
        $('body').on('hide.bs.modal','.modal-kform', function (e) {
            setTimeout(function() {
                $(".modal-kform").remove();
                $(".modal-backdrop").remove();
            }, 500);
        })
        
        $('body').on('click','.kmodal',function(e){
            //e.stopPropagation();
            var obj = $(this);
            var jsonData = ($(obj).attr('data-form-json') !== undefined ? $(obj).attr('data-form-json') : {});
            jsonData['data_target'] = $(obj).attr('data-target');
            $.ajax({
                type: "POST",
                url: $(obj).attr('data-form'),
                dataType: 'json',
                data: jsonData,
                success: function(data){
                    $('body').append(data.response.form);
                    var loadedForm = $('.modal-kform').find('form');
                    $(loadedForm).addClass('loaded-as-modal');
                    $(loadedForm).append('<input type="hidden" name="is_modal" value="1">');
                    var tg = '#'+$(obj).attr('data-target');
                    $(tg).modal('show');
                    
                    if ( $.isFunction($.fn.select2) ) {
                        $(tg).find(".sel2").select2({
                            allowClear: true
                        });

                        $(tg).find(".sel2").css('min-width','168px');

                        $(tg).find('body').on('blur','.select2-input',function(e){
                            $(this).css('width','auto');
                        });
                    }
                    
                    if ( $.isFunction($.fn.autosize) ) {
                        if($(".autosize").is('*')){
                            $(".autosize").autosize({append: "\n"});
                        }
                    }
                    
                    $($(obj).attr('data-target')).on('hidden.bs.modal', function (e) {
                        if ( $.isFunction($.fn.select2) ) {
                            $(tg).find('.sel2').select2('destroy');
                        }
                        destroyModal();
                    });
                },
                error: function(e){
                    console.log(e.responseText);
                }
            });
            //return false;
        });
        
        var cb = function(callback,form,data){
            if(callback !== undefined){
                var fn = window[callback];
                if (typeof fn === "function"){
                    return fn(form,data);
                }
            }
            
            return false;
        };
        
        var messageNotification = function(form,data){
            $(form).find(".notification-message").remove();
            var delay = (data.message.delay !== undefined ? data.message.delay : 3000);
            var notificationHolder = (data.message.holder !== undefined ? data.message.holder : '.notification-holder');
            if(data.message.formholder !== undefined){
                form = data.message.form_holder;
            }
            if(data.message.text !== undefined){
                switch(data.message.type){
                    case "success":
                        $(form).find(notificationHolder).html('<div class="notification-message alert alert-success text-center">'+data.message.text+'</div>');
                        break;
                        
                    case "warning":
                        $(form).find(notificationHolder).html('<div class="notification-message alert alert-warning text-center">'+data.message.text+'</div>');
                        break;
                    
                    case "danger":
                        $(form).find(notificationHolder).html('<div class="notification-message alert alert-danger text-center">'+data.message.text+'</div>');
                        break;
                        
                    case "info":
                        $(form).find(notificationHolder).html('<div class="notification-message alert alert-info text-center">'+data.message.text+'</div>');
                        break;
                        
                    default:
                        $(form).find(notificationHolder).html('<div class="notification-message">'+data.message.text+'</div>');
                        break;
                }
            }
            else{
                $(form).find(notificationHolder).html('<div class="notification-message">'+data.message+'</div>');
            }
            $(form).find(".notification-message").delay(delay).fadeOut('slow',function(){
                $(this).remove();
            });
        }
        
        var refreshCaptcha = function(object){
            var refreshObject = $(object);
            $(refreshObject).find('i').addClass('fa-spin');
            var currentTime = new Date();
            var time = currentTime.getMilliseconds();
            
            setTimeout(function() {
                $("img.captcha-img").attr('src',$("img.captcha-img").attr('src')+'?time='+time);
                $(refreshObject).find('i').removeClass('fa-spin');
            }, 300);
        };
        
        var appendTo = function(form,data){
            var items = data.response.append_to;
            
            $.each(items, function (item, message) {
                $('body').find(item).html(message);
            });
        };
        
        var performAsModal = function(form,data,submitbtn){
            doAfterSuccess(form,data,submitbtn);
            
            var delay = (data.success === true && data.message.delay !== undefined ? data.message.delay : 0);
            
            if(delay > 0){
                setTimeout(function() {
                    if(data.success === true){
                        if(data.message.redirect_to_after_delay !== undefined){
                            window.location.href = data.message.redirect_to_after_delay;
                            return false;
                        }

                        if(data.message.close_modal_after_delay !== undefined){
                            destroyModal();
                        }
                    }
                    var modalFooter = $(form).parent().parent().find('.modal-footer');
                    $(modalFooter).find('.kform-btn').removeClass('hide');
                    $(modalFooter).find('.action-loading').remove();
                }, delay);
            }
            else{
                if(data.success === true){
                    if(data.message.redirect_to_after_delay !== undefined){
                        window.location.href = data.message.redirect_to_after_delay;
                        return false;
                    }

                    if(data.message.close_modal_after_delay !== undefined){
                        destroyModal();
                    }
                }
                var modalFooter = $(form).parent().parent().find('.modal-footer');
                $(modalFooter).find('.kform-btn').removeClass('hide');
                $(modalFooter).find('.action-loading').remove();
            }
            
        };
        
        var doAfterSuccess = function(form, data, submitbtn){
            if($(form).attr('data-form-reset') === 'y'){
                resetForm(form);
            }

            if($(form).attr('data-callback-success') !== undefined){
                cb($(form).attr('data-callback-success'),form,data);
                $(submitbtn).button('reset');
            }
            
            if(data.response.redirect_to !== undefined){
                window.location.href = data.response.redirect_to;
                return false;
            }
            
            if(data.response.content !== undefined){
                $(submitbtn).button('reset');
                $(form).after(data.response.content);
                $(form).remove();
            }

            if(data.message){
                messageNotification(form,data);
                $(submitbtn).button('reset');
            }

            if(data.response.append_to !== undefined){
                appendTo(form,data);
            }
            
            if(config !== undefined && typeof config.onSuccess === 'function'){
                $(submitbtn).button('reset');
                return config.onSuccess(form,data);
            }
            
            return true;
        };
        
        var destroyModal = function(doHide){
            $('.modal-kform').modal('hide');
            setTimeout(function() {
                $(".modal-kform").remove();
                $(".modal-backdrop").remove();
            }, 500);
        }
        
        function resetForm($form) {
            $form.find('input:text, input:password, input:file, select, textarea').val('');
            $form.find('input:radio, input:checkbox').removeAttr('checked').removeAttr('selected');
            if ( $.isFunction($.fn.select2) ) {
                $form.find('.sel2').select2('val','');
            }
        }
        
        function regenerateCSRF(form){
            var csrf_name = null;
            if($(form).find('input[name="csrf"]').is('*')){
                var csrf = $(form).find('input[name="csrf"]');
                csrf_name = ($(csrf).attr('data-name') !== undefined ? $(csrf).attr('data-name') : 'default');
            }
            
            if(csrf_name !== null){
                $.ajax({
                    type: "GET",
                    url: route('csrf',{name: csrf_name}),
                    dataType: 'json',
                    success: function(data){
                        $(csrf).val(data.response.csrf);
                    },
                    error: function(e){
                        console.log(e.responseText);
                    }
                });
            }
        }
    };
})( jQuery );