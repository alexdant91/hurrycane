$(document).on('click', '.application-delete-trigger', function (e) {
    if (confirm('Are you sure you want to delete this application?')) {
        const $this = $(this);
        const application_id = $this.data('id');
        const counter = $('body').find('.active-application-wrapper').length;
        $.ajax({
            url: '/dashboard/api/delete',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            dataType: 'json',
            data: JSON.stringify({
                application_id: application_id
            }),
            success: function (data) {
                if (data.Error) {
                    iziToast.error({
                        position: 'topRight',
                        title: data.title,
                        message: data.text
                    });
                } else if (data.Status == 'done') {
                    $(`#${application_id}`).remove();
                    if (counter <= 1) {
                        $('.active-application-container').append(`
                        <div class="col-xl-4 col-lg-4 col-md-4 col-sm-12 col-xs-12">
                            <div class="active-urls-wrapper relative">
                                <div class="info-box absolute tooltip">
                                    <span class="tooltiptext">Add a new application to activate the API services.</span>
                                    <i class="fal fa-info-circle"></i>
                                </div>
                                <div class="col-xl-12 col-lg-12 col-md-12 col-sm-12 col-xs-12">
                                    <a href="/dashboard/api/new" class="url-external" style="margin-left: 20px;">
                                        Add your first Application! <i class="fal fa-plus right"></i>
                                    </a>
                                </div>
                            </div>
                        </div>
                    `);
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