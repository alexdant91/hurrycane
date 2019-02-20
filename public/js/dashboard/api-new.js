// const loaderHTML = '<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>';
$(document).on('submit', '#new-api', function (e) {
    e.preventDefault();
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
                iziToast.show({
                    theme: 'dark',
                    icon: 'fal fa-check',
                    position: 'topRight',
                    title: data.messages.title,
                    message: data.messages.text,
                    progressBarColor: 'rgb(0, 255, 184)'
                });
            }
            $button.html("Let's go!");
        },
        error: function (a, b, c) {
            console.log(a, b, c);
            $button.html("Let's go!");
        }
    });

    return false;

});