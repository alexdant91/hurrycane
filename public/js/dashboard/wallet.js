// const loaderHTML = '<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>';
$.ajax({
    url: '/dashboard/wallet/total',
    method: 'GET',
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
            $('.total-wallet-amount').html(`€ ${data.total}`)
        }

    },
    error: function (a, b, c) {
        console.log(a, b, c);
        $this.html('<i class="fal fa-eye"></i> Show');
    }
});