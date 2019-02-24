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

$(document).on('click', '.webhooks-main-delete-trigger', function (e) {
    const application_id = $('#application_id').val();
    if (confirm('Are you sure you want to delete this endpoint?')) {
        const $this = $(this);
        const webhook_id = $this.data('id');
        $.ajax({
            url: '/dashboard/api/webhooks/delete',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            dataType: 'json',
            data: JSON.stringify({
                webhook_id: webhook_id
            }),
            success: function (data) {
                if (data.Error) {
                    iziToast.error({
                        position: 'topRight',
                        title: data.title,
                        message: data.text
                    });
                } else if (data.Status == 'done') {
                    location.href = `/dashboard/api/details/${application_id}`;
                }
            },
            error: function (a, b, c) {
                console.log(a, b, c);
            }
        });
    }
});