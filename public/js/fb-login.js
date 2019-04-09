const loaderHTML = '<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>';
const loaderHTMLTop = `<div class="lds-ellipsis" style="top: -18px !important;"><div></div><div></div><div></div><div></div></div>`;
window.fbAsyncInit = function () {
    FB.init({
        appId: '2207619446232939',
        cookie: true, // enable cookies to allow the server to access 
        xfbml: true, // parse social plugins on this page
        version: 'v3.2' // The Graph API version to use for the call
    });
};

// Load the SDK asynchronously
(function (d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s);
    js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

// Here we run a very simple test of the Graph API after login is
// successful.  See statusChangeCallback() for when this call is made.
function GetFbUserObject() {
    FB.login(function (response) {
        const $button = $('body').find('.fb-share-button');
        const actualHTML = $button.html();
        $button.html(loaderHTMLTop);
        if (response.authResponse) {
            FB.api('/me?fields=id,name,first_name,last_name,email,picture.height(960)', function (response) {
                $.ajax({
                    url: '/auth/facebook',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    dataType: 'json',
                    data: JSON.stringify({
                        facebook_id: response.id,
                        name: response.first_name,
                        last_name: response.last_name,
                        avatar: response.picture.data.url,
                        email: response.email,
                        ref: document.getElementById('ref').value
                    }),
                    success: function (data) {
                        // console.log(data);
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
                        $button.html(actualHTML);
                    }
                });
            });
        } else {
            console.log('User cancelled login or did not fully authorize.');
            iziToast.error({
                position: 'topRight',
                title: 'Oops!',
                message: 'User cancelled login or did not fully authorize.'
            });
        }
    }, {
        scope: 'public_profile,email',
        return_scopes: true
    });
}