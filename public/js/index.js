const loaderHTML = '<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>';
const SerializeFormData = form => JSON.stringify(
    Array.from(new FormData(form).entries()).reduce((m, [key, value]) => Object.assign(m, {
        [key]: value
    }), {})
);

$('body').on('scroll', function () {
    if ($(this).scrollTop() > 100) {
        $('.menu-top').addClass('moved');
    } else {
        $('.menu-top').removeClass('moved');
    }
});

$(document).on('click', '.custom-button-advanced', function (e) {
    $('.advanced-option-wrapper').slideToggle(250);
});

$(document).on('click', '#shortenUrl', function (e) {
    const $this = $(this);
    $this.html(loaderHTML);
    const long_url = $('#long-url-input').val();
    const alias = $('#alias').val();
    const description = $('#description').val();
    const password = $('#password').val();
    const expiration_time = $('#expire').val();

    $.ajax({
        url: '/shorten',
        method: 'POST',
        data: {
            long_url,
            alias,
            description,
            password,
            expiration_time
        },
        success: function (data) {
            console.log(data);
            if (data.Error) {
                iziToast.error({
                    position: 'topRight',
                    title: 'Oops!',
                    message: data.Error
                });
                $this.html("Let's Go!");
            }
            if (data.Status === 'done') {
                $('#long-url-input').val(`That's it -> ${data.short_url}`);
                iziToast.show({
                    theme: 'dark',
                    icon: 'fal fa-check',
                    position: 'topRight',
                    title: data.messages.title,
                    message: data.messages.text,
                    progressBarColor: 'rgb(0, 255, 184)'
                });
                $('#shortenUrl').attr('id', 'newShortenUrl').html('New Url!').css('background-color', '#20b3a5');
            }
        },
        error: function (a, b, c) {
            console.log(a, b, c);
            $this.html("Let's Go!");
        }
    });
    return false;
});

$(document).on('click', '#newShortenUrl', function () {
    const $this = $(this);
    $this.html(loaderHTML);
    $('#long-url-input').val('');
    $('#alias').val('');
    $('#description').val('');
    $('#password').val('');
    $('#expire').val('');
    $this.attr('id', 'shortenUrl').html('Let\'s Go!').prop('style', false);
});