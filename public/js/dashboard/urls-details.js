const loaderHTMLTop = `<div class="lds-ellipsis" style="top: -20px !important;"><div></div><div></div><div></div><div></div></div>`;
$(document).on('submit', '#update-url', function (e) {
    const $this = $(this);
    const $button = $this.find('button[type="submit"]');
    $button.html(loaderHTML);
    const description = $('#description').val();
    const password = $('#password').val();
    const expiration_time = $('#expire').val();

    // const device_select = $('[name="device_select[]"]').val();
    let device_select = [];
    $('body').find('[name="device_select[]"]').each(function () {
        device_select.push($(this).val());
    });
    const devicetag_url = $('[name="devicetag_url"]').val();
    // const geo_select = $('[name="geo_select[]"]').val();
    let geo_select = [];
    $('body').find('[name="geo_select[]"]').each(function () {
        geo_select.push($(this).val());
    });
    const geotag_url = $('[name="geotag_url"]').val();
    const seo_title = $('[name="seo_title"]').val();
    const seo_description = $('[name="seo_description"]').val();

    const url_id = $('#url_id').val();

    $.ajax({
        url: '/shorten/update',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        dataType: 'json',
        data: JSON.stringify({
            url_id: url_id,
            description: description,
            expiration_time: expiration_time,
            device_select: device_select,
            devicetag_url: devicetag_url,
            geo_select: geo_select,
            geotag_url: geotag_url,
            seo_title: seo_title,
            seo_description: seo_description
        }),
        success: function (data) {
            if (data.Error) {
                iziToast.error({
                    position: 'topRight',
                    title: data.title,
                    message: data.text
                });
            }
            if (data.Status === 'done') {
                iziToast.show({
                    theme: 'dark',
                    icon: 'fal fa-check',
                    position: 'topRight',
                    title: data.message.title,
                    message: data.message.text,
                    progressBarColor: 'rgb(0, 255, 184)'
                });
            }
            $button.html('<i class="fal fa-save white-text"></i> Save');
        },
        error: function (a, b, c) {
            console.log(a, b, c);
            $button.html('<i class="fal fa-save white-text"></i> Save');
            iziToast.error({
                title: 'Oops!',
                message: 'Internal server error.'
            });
        }
    });

    return false;
});

$(document).on('change', '#password_protection', function () {
    if ($(this).val() == 'on') {
        $(this).val('off');
        $('#password').prop('disabled', true).val('');
    } else {
        $(this).val('on');
        $('#password').prop('disabled', false);
    }
});

$(document).on('submit', '#update-url-password', function (e) {
    e.preventDefault();
    const $this = $(this);
    const $button = $this.find('button[type="submit"]');
    $button.html(loaderHTML);
    const url_id = $('#url_id').val();
    const password = $('#password').val();
    $.ajax({
        url: '/shorten/update',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        dataType: 'json',
        data: JSON.stringify({
            url_id: url_id,
            password: password,
            control: 'password'
        }),
        success: function (data) {
            if (data.Error) {
                iziToast.error({
                    position: 'topRight',
                    title: data.title,
                    message: data.text
                });
            }
            if (data.Status === 'done') {
                iziToast.show({
                    theme: 'dark',
                    icon: 'fal fa-check',
                    position: 'topRight',
                    title: data.message.title,
                    message: data.message.text,
                    progressBarColor: 'rgb(0, 255, 184)'
                });
            }
            $button.html('<i class="fal fa-save white-text"></i> Save');
        },
        error: function (a, b, c) {
            console.log(a, b, c);
            $button.html('<i class="fal fa-save white-text"></i> Save');
            iziToast.error({
                title: 'Oops!',
                message: 'Internal server error.'
            });
        }
    });
    return false;
});

$(document).on('click', '.url-main-delete-trigger', function (e) {
    e.preventDefault()
    const $this = $(this);
    const $button = $this;
    $button.html(loaderHTMLTop);
    if (confirm('Are you shure to delete this URL?')) {
        const url_id = $this.data('id');
        $.ajax({
            url: '/shorten/delete',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            dataType: 'json',
            data: JSON.stringify({
                url_id: url_id
            }),
            success: function (data) {
                if (data.Error) {
                    iziToast.error({
                        position: 'topRight',
                        title: data.title,
                        message: data.text
                    });
                }
                if (data.Status === 'done') {
                    location.href = '/dashboard/urls';
                }
                $button.html('<i class="fal fa-trash white-text"></i> Delete This URL');
            },
            error: function (a, b, c) {
                console.log(a, b, c);
                $button.html('<i class="fal fa-trash white-text"></i> Delete This URL');
                iziToast.error({
                    title: 'Oops!',
                    message: 'Internal server error.'
                });
            }
        });
    } else {
        $button.html('<i class="fal fa-trash white-text"></i> Delete This URL');
    }
    return false;
});