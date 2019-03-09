$(document).on('submit', '#new-payout', function (e) {
    e.preventDefault();
    const $button = $(this).find('button[type="submit"]');
    $button.html(loaderHTML);

    const amount = Number($('#amount').val());

    if (confirm('You can not cancel the payout request, are you shure to continue?')) {
        $.ajax({
            url: '/dashboard/wallet/payout/new',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            dataType: 'json',
            data: JSON.stringify({
                amount
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
                $button.html('Let\'s go');
            },
            error: function (a, b, c) {
                console.log(a, b, c);
                $button.html('Let\'s go');
            }
        });
    }

    return false;
});