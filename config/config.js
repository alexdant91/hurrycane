class Config {

    constructor() {
        this.NODE_ENV = process.env.NODE_ENV || 'staging';
        this.port = 80;
        this.host = 'http://localhost:80';
        this.sessionSecretKey = 'sessionsecretkey';
        this.api = {
            requestTimeLimitRange: 60 * 60 * 1000,
            requestNumberLimit: process.env.REQUEST_NUMBER_LIMIT || 2
        };
        this.stripe = {
            secretKey: "sk_test_Y7gX79Tue6uErVfdl0uooR6y"
        };
        this.mongoDbAtlas = {
            user: {
                username: 'alexdant91',
                password: '18Gmgaa2'
            }
        }
    }

}

const adsense_api_config = {
    "web": {
        "client_id": "458098400863-jbv7opdimpo7dvhqdomaj8rnplakkhnd.apps.googleusercontent.com",
        "project_id": "eatita-205009",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_secret": "AuqGbtuV1O5bVGFmA15PIRkK",
        "redirect_uris": ["https://localhost/auth/adsense"]
    }
};

// hostname: hurrycane.io
// shortHostname: huca.io

module.exports = Config;