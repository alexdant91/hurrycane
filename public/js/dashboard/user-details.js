// const loaderHTML = '<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>';
$(document).on('submit', '#update-user', function (e) {
    e.preventDefault();
    const $button = $(this).find('button[type="submit"]');
    $button.html(loaderHTML);

    const name = $('#name').val();
    const last_name = $('#last_name').val();
    const email = $('#email').val();

    $.ajax({
        url: '/dashboard/settings/update?action=UpdateUserInfo',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        dataType: 'json',
        data: JSON.stringify({
            name,
            last_name,
            email
        }),
        success: function (data) {
            if (data.Error) {
                iziToast.error({
                    position: 'topRight',
                    title: data.title,
                    message: data.text
                });
            } else if (data.Status == 'done') {
                $('.user-side-name').find('span').html(name);
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

$(document).on('submit', '#update-password', function (e) {
    e.preventDefault();
    const $button = $(this).find('button[type="submit"]');
    $button.html(loaderHTML);

    const pass1 = $('#pass1').val();
    const pass2 = $('#pass2').val();

    $.ajax({
        url: '/dashboard/settings/update?action=UpdateUserPassword',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        dataType: 'json',
        data: JSON.stringify({
            pass1,
            pass2
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
            $('#pass1, #pass2').val('');
        },
        error: function (a, b, c) {
            console.log(a, b, c);
            $button.html('<i class="fal fa-save white-text"></i> Save');
            $('#pass1, #pass2').val('');
        }
    });

    return false;

});

$(document).on('click', '.user-main-delete-trigger', function (e) {
    if (confirm('Are you sure you want to delete your account?')) {
        $.ajax({
            url: '/dashboard/settings/delete',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            dataType: 'json',
            data: {},
            success: function (data) {
                if (data.Error) {
                    iziToast.error({
                        position: 'topRight',
                        title: data.title,
                        message: data.text
                    });
                } else if (data.Status == 'done') {
                    location.href = '/logout';
                }
            },
            error: function (a, b, c) {
                console.log(a, b, c);
            }
        });
    }
});