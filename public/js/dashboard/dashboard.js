const loaderHTML = '<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>';
const SerializeFormData = form => JSON.stringify(
    Array.from(new FormData(form).entries()).reduce((m, [key, value]) => Object.assign(m, {
        [key]: value
    }), {})
);

// Custom placeholder for Alias input
if ($('input[name = "alias"]').val() != '') {
    $('input[name = "alias"]').parent().find('.placeholder-label').addClass('hidden');
} else {
    $('input[name = "alias"]').parent().find('.placeholder-label').removeClass('hidden');
}
$(document).on('keyup', 'input[name="alias"]', function () {
    if ($(this).val() != '') {
        $(this).parent().find('.placeholder-label').addClass('hidden');
    } else {
        $(this).parent().find('.placeholder-label').removeClass('hidden');
    }
});

$(document).on('click', '.a-link', function () {
    location.href = $(this).data('href');
});

$(document).find('div.lazy-load').each(function (i, elem) {
    let lazy = $(this);
    let src = lazy.attr('data-src');
    let name = ('lazy-' + Math.random()).toString().replace(".", "");
    let $name = '#' + name;
    $('body').append('<img id="' + name + '" src="' + src + '" />');
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
    const page_screenshot = $('#page_screenshot').is(':checked');
    const page_seotags = $('#page_seotags').is(':checked');

    // const device_select = $('[name="device_select[]"]').val();
    let device_select = [];
    $('body').find('[name="device_select[]"]').each(function () {
        device_select.push($(this).val());
    });
    const devicetag_url = $('[name="devicetag_url"]').val();
    // const geo_select = $('[name="geo_select[]"]').val();
    let geo_select = [];
    $('body').find('[name="geo_select[]"]').each(function () {
        geo_select.push($(this).val());
    });
    const geotag_url = $('[name="geotag_url"]').val();
    const seo_title = $('[name="seo_title"]').val();
    const seo_description = $('[name="seo_description"]').val();

    const endpoint = $('#fast-mode').is(':checked') ? '/shorten/direct' : '/shorten';

    $.ajax({
        url: endpoint,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        dataType: 'json',
        data: JSON.stringify({
            long_url: long_url,
            alias: alias,
            description: description,
            password: password,
            expiration_time: expiration_time,
            device_select: device_select,
            devicetag_url: devicetag_url,
            geo_select: geo_select,
            geotag_url: geotag_url,
            seo_title: seo_title,
            seo_description: seo_description,
            page_screenshot: page_screenshot,
            page_seotags: page_seotags
        }),
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
                // $('#long-url-input').val(data.short_url);
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
                                    <button class="copy-button"><i class="fal fa-clone"></i> Copy</button>
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
                                    <a href="https://www.linkedin.com/sharing/share-offsite/?url=${data.short_url}&source=LinkedIn"
                                    class="in-share-button share-button"
                                    onclick="return false;"><i class="fab fa-linkedin"></i> Share on LinkedIn</a>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="share-right-side">
                        <div id="QRCodeImage">
                            <img src="${QRCode}" alt="Share link QR Code" />
                        </div>
                    </div>`).fadeIn(250);

                $('#shortenUrl').attr('id', 'newShortenUrl').html('New link!').css('background-color', '#20b3a5');
            }
        },
        error: function (a, b, c) {
            console.log(a, b, c);
            $this.html("Let's Go!");
            iziToast.error({
                title: 'Oops!',
                message: 'Internal server error.'
            });
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
    $('#long-url-input').val('').focus().select();
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

$(document).on('focusin', 'input.header-search', function () {
    $('body').find('.overlay-background').fadeIn(350);
    if ($(this).val() != '') {
        $('body').find('.input-search-results').fadeIn(0);
    } else {
        $('body').find('.input-search-results').fadeOut(0);
    }
});

$(document).on('focusout', 'input.header-search', function () {
    if ($(this).val() == '') {
        $('body').find('.overlay-background').fadeOut(350);
        $('body').find('.input-search-results').fadeOut(0);
    }
});

$(document).on('keyup', 'input.header-search', function () {
    if ($(this).val() != '') {
        $('body').find('.input-search-results').fadeIn(0);
    } else {
        $('body').find('.input-search-results').fadeOut(0);
    }

    $.ajax({
        url: '/dashboard/search',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        dataType: 'json',
        data: JSON.stringify({
            value: $('input.header-search').val()
        }),
        success: function (data) {
            if (data.count == 0) {
                $('.input-search-results').html('');
                $('.input-search-results').html(`
                    <div class="row search-field-wrapper">
                        <div class="container">
                            <div class="col-xl-12 col-lg-12 col-md-12 col-sm-12 col-xs-12 text-center name-search-field">
                                No data founded.
                            </div>
                        </div>
                    </div>
                `);
            } else if (data.count > 0) {
                $('.input-search-results').html('');
                $.each(data.data, (i, value) => {
                    console.log(value);
                    let active = value.active ? '<div class="application-active right active"></div>' : '<div class="application-active right disabled"></div>';
                    $('.input-search-results').append(`
                        <div class="row search-field-wrapper a-link" data-href="/dashboard/api/details/${value._id}">
                            <div class="container">
                                <div class="col-xl-1 col-lg-1 col-md-2 col-sm-3 col-xs-3">
                                    <img class="logo-search-field" src="/img/api-logo.png" alt="App api logo" />
                                </div>
                                <div class="col-xl-11 col-lg-11 col-md-10 col-sm-9 col-xs-3 name-search-field">
                                    ${value.name} - ${value._id} ${active}
                                </div>
                            </div>
                        </div>
                    `)
                });
            }

        },
        error: function (a, b, c) {
            console.log(a, b, c);
            $this.html('<i class="fal fa-eye"></i> Show');
        }
    });
});

$(document).on('change', 'input[type="radio"][name="mode"]', function () {
    let fastMode = $('#fast-mode').is(':checked');
    if (fastMode) {
        $('.row.advanced-option-wrapper > .container').find('.row').addClass('disabled');
        $('p.fast-mode').removeClass('hidden');
        $('p.advanced-mode').addClass('hidden');
    } else {
        $('.row.advanced-option-wrapper > .container').find('.row').removeClass('disabled');
        $('p.fast-mode').addClass('hidden');
        $('p.advanced-mode').removeClass('hidden');
    }
});

$(document).on('click', '.copy-button', function () {
    $('body').find('.share-box-url').focus();
    $('body').find('.share-box-url').select();
    if (document.execCommand('copy', false)) {
        iziToast.show({
            theme: 'dark',
            icon: 'fal fa-check',
            position: 'topRight',
            title: 'Copied!',
            message: 'The link was copied to clipboard.',
            progressBarColor: 'rgb(0, 255, 184)'
        });
    };
});

$(document).on('click touchend', '.bars-button', function () {
    $('.left-side-menu, .menu-side-wrapper-bottom').toggleClass('open');
    $('.menu-overflow').fadeToggle();
});

$(document).on('click touchend', '.menu-overflow', function () {
    $('.left-side-menu, .menu-side-wrapper-bottom').toggleClass('open');
    $('.menu-overflow').fadeToggle();
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