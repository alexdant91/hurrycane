// const loaderHTML = '<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>';
let secretKeyTimeout;
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
        $this.html('<i class="fal fa-eye"></i> Show');
        $secret_key.addClass('blurred').val('fakesecr-etfak-esek-retf-akesecretfak');
        clearTimeout(secretKeyTimeout);
    }
});

$(document).on('change', '#application_status', function () {
    const $this = $(this);
    const application_id = $('#application_id').val();
    $this.val() == 'on' ? $this.val('off') : $this.val('on');
    $.ajax({
        url: '/dashboard/api/update?action=ChangeStatusMode',
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
});

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
        url: '/dashboard/api/update?action=UpdateApplicationInfo',
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
            $button.html('<i class="fal fa-save white-text"></i> Save');
        },
        error: function (a, b, c) {
            console.log(a, b, c);
            $button.html('<i class="fal fa-save white-text"></i> Save');
        }
    });

    return false;

});

$(document).on('change', '#application_env', function () {
    const $this = $(this);
    const application_id = $('#application_id').val();
    $this.val() == 'on' ? $this.val('off') : $this.val('on');
    $.ajax({
        url: '/dashboard/api/update?action=ChangeSandboxStatus',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        dataType: 'json',
        data: JSON.stringify({
            application_id: application_id,
            application_env: $this.val()
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
});

$(document).on('click', '.application-main-delete-trigger', function (e) {
    if (confirm('Are you sure you want to delete this application?')) {
        const $this = $(this);
        const application_id = $this.data('id');
        const counter = $('body').find('.active-application-wrapper').length;
        $.ajax({
            url: '/dashboard/api/delete',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            dataType: 'json',
            data: JSON.stringify({
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
                    location.href = '/dashboard/api';
                }
            },
            error: function (a, b, c) {
                console.log(a, b, c);
            }
        });
    }
});