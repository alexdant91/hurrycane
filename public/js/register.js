const SerializeFormData = form => JSON.stringify(
    Array.from(new FormData(form).entries()).reduce((m, [key, value]) => Object.assign(m, {
        [key]: value
    }), {})
);

$('form').on('submit', function (e) {
    e.preventDefault();
    const $button = $(this).find('button[type="submit"]');
    const actualHTML = $button.html();
    $button.html(loaderHTMLTop);
    let json = SerializeFormData(this);
    $.ajax({
        url: '/register',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        dataType: 'json',
        data: json,
        success: function (data) {
            if (data.Error) {
                iziToast.error({
                    position: 'topRight',
                    title: 'Oops!',
                    message: data.Error
                });
                $button.html(actualHTML);
            }
            if (data.Status === 'done') location.href = '/dashboard';
        },
        error: function (a, b, c) {
            console.log(a, b, c);
            iziToast.error({
                position: 'topRight',
                title: 'Oops!',
                message: 'Internal server error.'
            });
            $button.html(actualHTML);
        }
    });
    return false;
});