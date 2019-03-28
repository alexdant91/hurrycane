const SDK = require('./hycn/v1');

const hycn = new SDK('5c74e68c198689170305a334', '6075cf3c-85d5-43d0-9ef1-d1cf7cd937d8');

hycn.token("alexdant91@gmail.com", "18Gmgaa2'", (err, token) => {
    console.log(token);
});