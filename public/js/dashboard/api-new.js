// const loaderHTML = '<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>';
$(document).on('submit', '#new-api', function (e) {
    e.preventDefault();
    const $button = $(this).find('button[type="submit"]');
    $button.html(loaderHTML);

    let allowed_origins = [];
    const name = $(this).find('#name').val();
    const origins = $(this).find('.selectize-input').find('div');
    origins.each((i, elem) => {
        const element = $(elem).data('value');
        if (element != '' && element != undefined && element != null) {
            allowed_origins.push(element.trim());
        }
    });

    $.ajax({
        url: '/dashboard/api/new',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        dataType: 'json',
        data: JSON.stringify({
            name: name,
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
                location.href = '/dashboard/api';
            }
        },
        error: function (a, b, c) {
            console.log(a, b, c);
            $button.html("Let's go!");
        }
    });

    return false;

});