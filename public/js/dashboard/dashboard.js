const loaderHTML = '<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>';
const SerializeFormData = form => JSON.stringify(
    Array.from(new FormData(form).entries()).reduce((m, [key, value]) => Object.assign(m, {
        [key]: value
    }), {})
);

$(document).on('click', '.a-link', function () {
    location.href = $(this).data('href');
});

$(document).find('div.lazy-load').each(function (i, elem) {
    let lazy = $(this);
    let src = lazy.attr('data-src');
    let name = ('lazy-' + Math.random()).toString().replace(".", "");
    let $name = '#' + name;
    $('body').append('<img id="' + name + '" src="' + src + '" />').attr('src', src);
    $('body').find($name).on('load', function () {
        lazy.css('background-image', 'url("' + src + '")');
        $(this).remove();
    });
});

$(document).on('click', '.custom-button-advanced', function (e) {
    $('.advanced-option-wrapper').slideToggle(250);
});

$(document).on('click', '#shortenUrl', function (e) {
    let QRCode = "https://chart.googleapis.com/chart?cht=qr&chs=160x160&chl=%link%&choe=UTF-8&chld=L";

    const $this = $(this);
    $this.html(loaderHTML);
    const long_url = $('#long-url-input').val();
    const alias = $('#alias').val();
    const description = $('#description').val();
    const password = $('#password').val();
    const expiration_time = $('#expire').val();

    // const device_select = $('[name="device_select[]"]').val();
    let device_select = [];
    $('[name="device_select[]"]').each(function () {
        device_select.push($(this).val());
    });
    const devicetag_url = $('[name="devicetag_url"]').val();
    // const geo_select = $('[name="geo_select[]"]').val();
    let geo_select = [];
    $('[name="geo_select[]"]').each(function () {
        geo_select.push($(this).val());
    });
    const geotag_url = $('[name="geotag_url"]').val();
    const seo_title = $('[name="seo_title"]').val();
    const seo_description = $('[name="seo_description"]').val();

    $.ajax({
        url: '/shorten',
        method: 'POST',
        data: {
            long_url,
            alias,
            description,
            password,
            expiration_time,
            device_select,
            devicetag_url,
            geo_select,
            geotag_url,
            seo_title,
            seo_description
        },
        success: function (data) {
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

                // Generate and append the QRCode image
                QRCode = QRCode.replace('%link%', data.short_url);
                $('#QRCodeImage').html(`<img class="qrcode_image" src="${QRCode}" alt="QR Code for the new link." />`);
                $('#share-box-url').html(`<a href="${data.short_url}" target="_blank">${data.short_url}</a>`);

                $('.share-box-wrapper').html(`
                    <div class="share-left-side">
                        <div class="close-share-box">&times;</div>
                        <div class="row">
                            <div class="container">
                                <h5 class="share-box-title">
                                    <i class="fal fa-link"></i> That's it! Your link is ready:
                                </h5>
                            </div>
                        </div>

                        <div class="row">
                            <div class="container">
                                <div class="input field">
                                    <input type="text"
                                    readonly class="share-box-url"
                                    value="${data.short_url}"
                                    onClick="this.select();" />
                                </div>
                            </div>
                        </div>

                        <div class="row">
                            <div class="container">
                                <div class="share-box-buttons left">
                                    <a href="https://www.facebook.com/sharer/sharer.php?u=${data.short_url}"
                                    class="fb-share-button share-button"
                                    onclick="return false;"><i class="fab fa-facebook-square"></i> Share on facebook</a>
                                    <a href="http://twitter.com/share?url=${data.short_url}"
                                    class="tw-share-button share-button"
                                    onclick="return false;"><i class="fab fa-twitter"></i> Share on twitter</a>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="share-right-side">
                        <div id="QRCodeImage">
                            <img src="${QRCode}" alt="Share link QR Code" />
                        </div>
                    </div>`).fadeIn(250);

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

$(document).on('click', '.close-share-box', function () {
    $('.share-box-wrapper').fadeOut(250, function () {
        $(this).html('');
    });
});

$(document).on('click', '#newShortenUrl', function () {
    const $this = $(this);
    $this.html(loaderHTML);
    $('.share-box-wrapper').fadeOut(250, function () {
        $(this).html('');
    });
    $('#long-url-input').val('');
    $('#alias').val('');
    $('#description').val('');
    $('#password').val('');
    $('#expire').val('');
    $('#devicetag_url').val('');
    $('#geotag_url').val('');
    $('#seo_title').val('');
    $('#seo_description').val('');
    $('body').find('.after-select-wrapper').remove();
    $this.attr('id', 'shortenUrl').html('Let\'s Go!').prop('style', false);
});

$(document).on('click', '.add-verbal-select-btn', function () {
    let $verbalSelect = $(this).parent().parent().find('.verbal-select');
    let classname = `select-${(Math.random()).toString().replace(".", "")}`;
    let selectHTML = `<select class="verbal-select ${classname}" name="${$verbalSelect.attr('name')}">${$verbalSelect.html()}</select>`;
    $($verbalSelect[$verbalSelect.length - 1]).parent().after(`<span class="relative after-select-wrapper" id="${classname}"> or ${selectHTML}<span class="remove-verbal-select-btn" data-id="#${classname}"><i class="fal fa-trash"></i></span></span>`);
    $('body').find(`.${classname}`).each(function (e, elem) {
        resizeSelect(this);
        $(this).change(function () {
            resizeSelect(this);
        });
    });
});

$(document).on('click', '.remove-verbal-select-btn', function () {
    let id = $(this).data('id');
    let $selectWrapper = $(id);
    $selectWrapper.remove();
});

// Resize verbal select according to option with.
$('.verbal-select').each(function () {
    resizeSelect(this);
    $(this).change(function () {
        resizeSelect(this);
    });
});

$(document).on('click', '.share-button', function () {
    sharePopup($(this).attr('href'));
});

function sharePopup(url) {
    const left = (document.body.clientWidth / 2) - 250;
    const top = (document.body.clientHeight / 2) - 250;
    window.open(url, "title!", "height=500,width=500,left=" + left + ",top=" + top);
}

function resizeSelect(e) {
    $("#width_tmp_option").html($(e).find('option:selected').text());
    $(e).width($("#width_tmp_select").width());
}