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