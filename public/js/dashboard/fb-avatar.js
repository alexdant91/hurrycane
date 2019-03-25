const loaderHTMLTop = `<div class="lds-ellipsis" style="top: -20px !important;"><div></div><div></div><div></div><div></div></div>`;
$(document).on('click', '#get-from-facebook', function (e) {
    e.preventDefault();
    const $button = $(this);
    const actualHTML = $button.html();
    $button.html(loaderHTMLTop);
    $.ajax({
        url: '/dashboard/fbavatar/update',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        dataType: 'json',
        data: JSON.stringify({}),
        success: function (data) {
            // console.log(data);
            if (data.Error) {
                iziToast.error({
                    position: 'topRight',
                    title: 'Oops!',
                    message: data.Error
                });
            } else if (data.Status == 'done') {
                $('.user-side-icon').css('background-image', `url(${data.path})`);
                iziToast.show({
                    theme: 'dark',
                    icon: 'fal fa-check',
                    position: 'topRight',
                    title: data.messages.title,
                    message: data.messages.text,
                    progressBarColor: 'rgb(0, 255, 184)'
                });
            }
            $button.html(actualHTML);
        },
        error: function (a, b, c) {
            console.log(a, b, c);
            $button.html(actualHTML);
        }
    });
    return false;
})