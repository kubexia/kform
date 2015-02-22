(function( $ ) {
    $.fn.kform = function(config) {
        var handler = this.selector;
        
        if(!$(handler).is('*')){
            return false;
        }
        
        if(config !== undefined && typeof config.onInit === 'function'){
            config.onInit(handler);
        }
        
        $(document).on('submit',handler,function(e){
            e.preventDefault();
            
            var form = $(this);
            
            $(form).attr('data-type','json');
            
            if(config !== undefined && typeof config.onSubmit === 'function'){
                config.onSubmit(form);
            }
            
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
                        
                        if(data.message){
                            messageNotification(form,data,submitbtn);
                            $(submitbtn).button('reset');
                        }
                        
                    }
                    else{
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
        
        var cb = function(callback,form,data){
            if(callback !== undefined){
                var fn = window[callback];
                if (typeof fn === "function"){
                    return fn(form,data);
                }
            }
            
            return false;
        };
        
        var messageNotification = function(form,data,submitbtn){
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
            
            if(data.message.redirect_to !== undefined){
                submitbtn.remove();
            }
            
            $(form).find(".notification-message").delay(delay).fadeOut('slow',function(){
                $(this).remove();
                if(data.message.redirect_to !== undefined){
                    window.location.href = data.message.redirect_to;
                    return false;
                }
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
                messageNotification(form,data,submitbtn);
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
        
        function resetForm($form) {
            $form.find('input:text, input:password, input:file, select, textarea').val('');
            $form.find('input:radio, input:checkbox').removeAttr('checked').removeAttr('selected');
        }
        
    };
})( jQuery );