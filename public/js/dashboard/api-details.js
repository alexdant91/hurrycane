// const loaderHTML = '<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>';
$(document).on('click', '#show-secret-key', function () {
    const $this = $(this);
    const $secret_key = $('#secret_key');
    const application_id = $('#application_id').val();
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
                action: 'revealSecretKey',
                application_id: application_id
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
                    $secret_key.val(data.secret_key).removeClass('blurred');
                }

            },
            error: function (a, b, c) {
                console.log(a, b, c);
                $this.html('<i class="fal fa-eye"></i> Show');
            }
        });
    } else {
        $this.html('<i class="fal fa-eye"></i> Show');
        $secret_key.addClass('blurred').val('fakesecr-etfak-esek-retf-akesecretfak');
    }
});

$(document).on('change', '#application_status', function () {
    const $this = $(this);
    const application_id = $('#application_id').val();
    $this.val() == 'on' ? $this.val('off') : $this.val('on');
    $.ajax({
        url: '/dashboard/api/update',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        dataType: 'json',
        data: JSON.stringify({
            application_id: application_id,
            application_status: $this.val()
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
        },
        error: function (a, b, c) {
            console.log(a, b, c);
        }
    });
})

$(document).on('submit', '#update-api', function (e) {
    e.preventDefault();
    const application_id = $('#application_id').val();
    const $button = $(this).find('button[type="submit"]');
    $button.html(loaderHTML);

    let allowed_origins = [];
    const name = $(this).find('#name').val();
    const origins = $(this).find('#allowed_origins').val();
    origins.replace(/s+/i, "").split(";").forEach(element => {
        if (element != '' && element != undefined && element != null) {
            allowed_origins.push(element.trim());
        }
    });

    $.ajax({
        url: '/dashboard/api/update',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        dataType: 'json',
        data: JSON.stringify({
            name: name,
            application_id: application_id,
            allowed_origins: allowed_origins
        }),
        success: function (data) {
            if (data.Error) {
                iziToast.error({
                    position: 'topRight',
                    title: data.title,
                    message: data.text
                });
            } else if (data.Status == 'done') {
                $('.application-main-title').html(name);
                iziToast.show({
                    theme: 'dark',
                    icon: 'fal fa-check',
                    position: 'topRight',
                    title: data.messages.title,
                    message: data.messages.text,
                    progressBarColor: 'rgb(0, 255, 184)'
                });
            }
            $button.html('<i class="fal fa-save"></i> Save');
        },
        error: function (a, b, c) {
            console.log(a, b, c);
            $button.html('<i class="fal fa-save"></i> Save');
        }
    });

    return false;

});