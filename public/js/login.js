const SerializeFormData = form => JSON.stringify(
    Array.from(new FormData(form).entries()).reduce((m, [key, value]) => Object.assign(m, {
        [key]: value
    }), {})
);

$('form').on('submit', function () {
    let json = SerializeFormData(this);
    $.ajax({
        url: '/login',
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
            };
            if (data.Status === 'done' && data.ref == undefined) location.href = '/dashboard';
            if (data.Status === 'done' && data.ref != undefined) location.href = data.ref;
        },
        error: function (a, b, c) {
            console.log(a, b, c);
        }
    });
    return false;
});