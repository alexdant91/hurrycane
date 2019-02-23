// const loaderHTML = '<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>';
let secretKeyTimeout;
let secretKeyInterval;
$(document).on('click', '#show-secret-key', function () {
    const $this = $(this);
    const $secret_key = $('#webhook_self_signature');
    const application_id = $('#application_id').val();
    const webhook_self_id = $('#webhook_self_id').val();
    $this.html(loaderHTML);
    if ($secret_key.hasClass('blurred')) {
        $.ajax({
            url: '/dashboard/api/protected-requests',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            dataType: 'json',
            data: JSON.stringify({
                action: 'retrieveWebhooks',
                application_id: application_id,
                webhook_self_id: webhook_self_id
            }),
            success: function (data) {
                if (data.Error) {
                    iziToast.error({
                        position: 'topRight',
                        title: data.title,
                        message: data.text
                    });
                } else if (data.Status == 'done') {
                    $this.html('<i class="fal fa-eye-slash"></i> Hide');
                    $secret_key.val(data.webhook_self_signature).removeClass('blurred');
                    let timer = 60;
                    $('.sign-timer').html(`Hide in ${timer}s`);
                    secretKeyInterval = setInterval(function () {
                        if (timer > 0) {
                            timer--;
                            $('.sign-timer').html(`Hide in ${timer}s`);
                        } else {
                            $('.sign-timer').html('');
                            clearInterval(secretKeyInterval);
                        }
                    }, 1000);
                    secretKeyTimeout = setTimeout(function () {
                        $this.html('<i class="fal fa-eye"></i> Show');
                        $secret_key.addClass('blurred').val('fakesecr-etfak-esek-retf-akesecretfak');
                    }, 60000);
                }

            },
            error: function (a, b, c) {
                console.log(a, b, c);
                $this.html('<i class="fal fa-eye"></i> Show');
            }
        });
    } else {
        $('.sign-timer').html('');
        $this.html('<i class="fal fa-eye"></i> Show');
        $secret_key.addClass('blurred').val('fakesecr-etfak-esek-retf-akesecretfak');
        clearTimeout(secretKeyTimeout);
        clearInterval(secretKeyInterval);
    }
});

$(document).on('submit', '#update-webhooks', function (e) {
    e.preventDefault();
    const $this = $(this);
    const application_id = $('#application_id').val();
    const webhook_self_id = $('#webhook_self_id').val();
    const $button = $(this).find('button[type="submit"]');
    $button.html(loaderHTML);

    const endpoint = $('#endpoint').val();
    const api_version = $('#api_version:checked').val();
    const events = [];
    $('body').find('.events').each((i, event) => {
        events.push($(event).val());
    });

    $.ajax({
        url: $this.attr('action'),
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        dataType: 'json',
        data: JSON.stringify({
            webhook_self_id: webhook_self_id,
            endpoint: endpoint,
            api_version: api_version,
            events: events
        }),
        success: function (data) {
            if (data.Error) {
                iziToast.error({
                    position: 'topRight',
                    title: data.title,
                    message: data.text
                });
            } else if (data.Status == 'done') {
                iziToast.show({
                    theme: 'dark',
                    icon: 'fal fa-check',
                    position: 'topRight',
                    title: data.messages.title,
                    message: data.messages.text,
                    progressBarColor: 'rgb(0, 255, 184)'
                });
            }
            $button.html('<i class="fal fa-save white-text"></i> Save');
        },
        error: function (a, b, c) {
            console.log(a, b, c);
            $button.html('<i class="fal fa-save white-text"></i> Save');
        }
    });

    return false;

});

// $.ajax({
//     url: '/dashboard/api/protected-requests',
//     method: 'POST',
//     headers: {
//         'Content-Type': 'application/json'
//     },
//     dataType: 'json',
//     data: JSON.stringify({
//         action: 'retrieveWebhooks',
//         application_id: application_id,
//         webhook_self_id: webhook_self_id
//     }),
//     success: function (data) {
//         if (data.Error) {
//             iziToast.error({
//                 position: 'topRight',
//                 title: data.title,
//                 message: data.text
//             });
//         } else if (data.Status == 'done') {
//             console.log(data);
//             $("#webhooks_modal").iziModal({
//                 title: 'Manage your webhook',
//                 headerColor: '#88A0B9',
//                 onClosed: function () {
//                     $("#webhooks_modal .iziModal-content").html('');
//                 }
//             });
//             $("#webhooks_modal .iziModal-content").html(`
//                                     <div class="row">
//                                         <div class="container pad-20">
//                                             <div class="row">
//                                                 <div class="container">
//                                                     <div class="input field">
//                                                         <label for="webhook_url"><b>The webhook's url callback endpoint</b></label>
//                                                         <div class="button-input">
//                                                             <input type="text" name="webhook_url" id="webhook_url" value="${data.endpoint}" readonly style="margin-top: 10px;" />
//                                                             <button class="copy-to-clip" data-target="webhook_url"><i class="fal fa-copy"></i> Copy</button>
//                                                         </div>
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                             <div class="row">
//                                                 <div class="container">
//                                                     <div class="input field" style="margin-top: 20px;">
//                                                         <label for="webhook_sign">
//                                                             <b>
//                                                                 <div class="info-box relative inline tooltip">
//                                                                     <span class="tooltiptext">The signature allows you to verify the authenticity of the request. Check in your backend that the signature matches to confirm its origin.</span>
//                                                                     <i class="fal fa-info-circle"></i>
//                                                                 </div> The webhook's unique signature
//                                                             </b>
//                                                         </label>
//                                                         <div class="button-input">
//                                                             <input type="text" name="webhook_sign" id="webhook_sign" value="${data.webhook_self_signature}" readonly style="margin-top: 10px;" />
//                                                             <button class="copy-to-clip" data-target="webhook_sign"><i class="fal fa-copy"></i> Copy</button>
//                                                         </div>
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                             <div class="row">
//                                                 <div class="container text-center" style="padding: 20px 0 10px 0 !important;">
//                                                     <div class="wrapper left text-center" style="width: 100%;    margin-top: 20px;">
//                                                         <a href="/dashboard/api/webhooks/${application_id}/details?webhook_self_id=${webhook_self_id}" class="butt main-button blue-button"><i class="fal fa-cog white-text"></i> Settings</a>
//                                                     </div>
//                                                 </div>
//                                             </div>
//                                         </div>    
//                                     </div>
//                                 `);
//             $("#webhooks_modal").iziModal('open');
//             // modal.stopLoading();
//         }

//     },
//     error: function (a, b, c) {
//         console.log(a, b, c);
//         $this.html('<i class="fal fa-eye"></i> Show');
//     }
// });