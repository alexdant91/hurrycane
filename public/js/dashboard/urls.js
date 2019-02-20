$(document).on('click', '.url-delete-trigger', function (e) {
    if (confirm('Are you sure you want to delete this application?')) {
        const $this = $(this);
        const url_id = $this.data('id');
        const counter = $('body').find('.active-urls-wrapper').length;
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
                } else if (data.Status == 'done') {
                    $(`#${url_id}`).remove();
                    if (counter <= 1) {
                        $('.active-urls-container').append(`
                                <div class="col-xl-4 col-lg-4 col-md-4 col-sm-12 col-xs-12">
                                    <div class="active-urls-wrapper">
                                        <div class="col-xl-12 col-lg-12 col-md-12 col-sm-12 col-xs-12">
                                            <a href="/dashboard" class="url-external">
                                                <i class="fal fa-link"></i> Add your first URL! <i class="fal fa-plus right"></i>
                                            </a>
                                        </div>
                                    </div>
                                </div>`);
                    }
                    iziToast.show({
                        theme: 'dark',
                        icon: 'fal fa-check',
                        position: 'topRight',
                        title: data.messages.title,
                        message: data.messages.text,
                        progressBarColor: 'rgb(0, 255, 184)'
                    });
                }
            },
            error: function (a, b, c) {
                console.log(a, b, c);
            }
        });
    }
});