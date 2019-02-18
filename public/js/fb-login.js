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
        if (response.authResponse) {
            FB.api('/me?fields=id,name,first_name,last_name,email,picture.height(960)', function (response) {
                console.log(JSON.stringify({
                    facebook_id: response.id,
                    name: response.first_name,
                    last_name: response.last_name,
                    avatar: response.picture.data.url,
                    email: response.email
                }));
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
                        email: response.email
                    }),
                    success: function (data) {
                        if (data.Error) alert(data.Error);
                        if (data.Status === 'done') location.href = '/dashboard';
                    },
                    error: function (a, b, c) {
                        console.log(a, b, c);
                    }
                });
            });
        } else {
            console.log('User cancelled login or did not fully authorize.');
        }
    }, {
        scope: 'public_profile,email',
        return_scopes: true
    });
}