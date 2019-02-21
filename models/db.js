const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const Schema = mongoose.Schema;

// Local host
// mongoose.connect('mongodb://localhost:27017/url_shortner', {
//     useNewUrlParser: true
// });
mongoose.connect('mongodb+srv://alexdant91:18Gmgaa2@clusterhurrycane-nebin.mongodb.net/url_shortner', {
    useNewUrlParser: true
});

let models = {};

const userSchema = Schema({
    name: String,
    email: String,
    password: String,
    secret_key: String,
    subscription: String,
    license_id: String,
    license_expiration: String,
    avatar: String,
    facebook_id: String,
    last_name: String,
    customer_id: {
        type: String,
        default: null
    },
    active: {
        type: Boolean,
        default: true,
        required: true
    },
    allowed_origins: {
        type: Array,
        default: []
    }
});

const urlSchema = Schema({
    long_url: {
        type: String,
        required: true
    },
    domain_name: String,
    user_id: String,
    alias: {
        type: String,
        required: true
    },
    timestamp: {
        type: String,
        required: true
    },
    description: String,
    password: String,
    expiration_time: String,
    head_html: String,
    favicon: String,
    device_select: Array,
    devicetag_url: String,
    geo_select: Array,
    geotag_url: String,
    seo_title: String,
    seo_description: String
});

const planSchema = Schema({
    name: String,
    url_limit: Number,
    price: Number,
    timestamp: String
});

const walletSchema = Schema({

});

const licenseSchema = Schema({
    user_id: {
        type: String,
        required: true
    },
    license_id: {
        type: String,
        required: true
    },
    plan: {
        type: String,
        required: true
    },
    active: {
        type: Boolean,
        default: true
    },
    expiration_time: {
        type: String,
        required: true
    },
    last_update: {
        type: String,
        required: true
    },
    creation_time: {
        type: String,
        required: true
    }
});

const applicationSchema = Schema({
    user_id: {
        type: String,
        required: true
    },
    secret_key: {
        type: String,
        required: true
    },
    allowed_origins: {
        type: Array,
        default: []
    },
    name: String,
    active: {
        type: Boolean,
        required: true,
        default: true
    },
    creation_time: {
        type: String,
        required: true
    }
});

const applicationEventSchema = Schema({
    application_id: String,
    event_description: String,
    event_request: String,
    event_response: String,
    request_origin: String,
    creation_time: String
});

userSchema.plugin(mongoosePaginate);
urlSchema.plugin(mongoosePaginate);
planSchema.plugin(mongoosePaginate);
walletSchema.plugin(mongoosePaginate);
licenseSchema.plugin(mongoosePaginate);
applicationSchema.plugin(mongoosePaginate);
applicationEventSchema.plugin(mongoosePaginate);

models.User = mongoose.model('User', userSchema);
models.Url = mongoose.model('Url', urlSchema);
models.Plan = mongoose.model('Plan', planSchema);
models.Wallet = mongoose.model('Wallet', walletSchema);
models.License = mongoose.model('License', licenseSchema);
models.Application = mongoose.model('Application', applicationSchema);
models.ApplicationEvent = mongoose.model('ApplicationEvent', applicationEventSchema);

module.exports = models;