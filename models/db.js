const Config = require('../config/config');
const config = new Config();
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const Schema = mongoose.Schema;
const uuid = require('uuid/v4');

const url_connection = config.NODE_ENV === 'staging' ? 'mongodb://localhost:27017/url_shortner' : `mongodb+srv://${config.mongoDbAtlas.user.username}:${config.mongoDbAtlas.user.password}@clusterhurrycane-nebin.mongodb.net/url_shortner`;

mongoose.connect(url_connection, {
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
    wallet_amount: {
        type: Number,
        default: 0.00000
    },
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
    application_id: {
        type: String,
        required: false,
        default: null
    },
    sub_user_id: {
        type: String,
        default: null
    },
    alias: {
        type: String,
        required: true
    },
    landing_page: {
        type: String,
        default: 'standard'
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
    page_seotags: Boolean,
    page_screenshot: Boolean,
    seo_title: String,
    seo_description: String,
    clicks: {
        type: Number,
        default: 0
    }
});

const planSchema = Schema({
    name: String,
    url_limit: Number,
    price: Number,
    timestamp: String
});

const walletSchema = Schema({
    user_id: {
        type: String,
        required: true
    },
    application_id: {
        type: String,
        default: null
    },
    sub_user_id: {
        type: String,
        default: null
    },
    description: String,
    url_id: String,
    amount: Number,
    timestamp: {
        type: Number,
        default: config.time()
    }
});

const payoutSchema = Schema({
    user_id: {
        type: String,
        required: true
    },
    application_id: {
        type: String,
        default: null
    },
    sub_user_id: {
        type: String,
        default: null
    },
    amount: {
        type: Number,
        required: true
    },
    payed: {
        type: Boolean,
        default: false
    },
    created_at: {
        type: Number,
        default: config.time()
    },
    payed_at: {
        type: Number,
        default: 0
    }
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
    production: {
        type: Boolean,
        required: true,
        default: false
    },
    creation_time: {
        type: String,
        required: true
    }
});

const applicationEventSchema = Schema({
    user_id: {
        type: String,
        required: false
    },
    application_id: String,
    param: Object,
    event_description: String,
    event_method: String,
    event_request: String,
    event_response: String,
    request_origin: String,
    creation_time: {
        type: String,
        default: config.time()
    }
});

const applicationWebhooksEndpoints = Schema({
    user_id: {
        type: String,
        required: true
    },
    application_id: {
        type: String,
        required: true
    },
    webhook_self_signature: {
        type: String,
        required: true,
        default: uuid()
    },
    endpoint: {
        type: String,
        required: true
    },
    api_version: {
        type: String,
        required: true,
        default: config.api.version,
    },
    events: {
        type: Array,
        required: true,
        default: []
    },
    creation_time: {
        type: String,
        default: config.time()
    }
});

const applicationWebhooksEndpointsEvents = Schema({
    user_id: {
        type: String,
        required: false
    },
    webhook_id: {
        type: String,
        required: true
    },
    application_id: {
        type: String,
        required: true
    },
    endpoint: {
        type: String,
        required: true
    },
    request_response: {
        type: String,
        required: false,
        default: null
    },
    request_method: {
        type: String,
        required: false,
        default: null
    },
    api_version: {
        type: String,
        required: true,
        default: config.api.version,
    },
    event_type: {
        type: String,
        required: true
    },
    creation_time: {
        type: String,
        default: config.time()
    }
});

const analyticsSchema = Schema({
    url_id: String,
    user_id: String,
    uniq_views: {
        type: Array,
        default: []
    },
    device: String,
    clicks: Number,
    referer: String,
    language: String,
    timestamp: {
        type: Number,
        default: config.time()
    }
});

userSchema.plugin(mongoosePaginate);
urlSchema.plugin(mongoosePaginate);
planSchema.plugin(mongoosePaginate);
payoutSchema.plugin(mongoosePaginate);
walletSchema.plugin(mongoosePaginate);
licenseSchema.plugin(mongoosePaginate);
analyticsSchema.plugin(mongoosePaginate);
applicationSchema.plugin(mongoosePaginate);
applicationEventSchema.plugin(mongoosePaginate);
applicationWebhooksEndpoints.plugin(mongoosePaginate);
applicationWebhooksEndpointsEvents.plugin(mongoosePaginate);

models.Url = mongoose.model('Url', urlSchema);
models.Plan = mongoose.model('Plan', planSchema);
models.User = mongoose.model('User', userSchema);
models.Wallet = mongoose.model('Wallet', walletSchema);
models.Payout = mongoose.model('Payout', payoutSchema);
models.License = mongoose.model('License', licenseSchema);
models.Analytic = mongoose.model('Analytic', analyticsSchema);
models.Application = mongoose.model('Application', applicationSchema);
models.Webhook = mongoose.model('Webhook', applicationWebhooksEndpoints);
models.ApplicationEvent = mongoose.model('Application_event', applicationEventSchema);
models.WebhookEvent = mongoose.model('Webhook_event', applicationWebhooksEndpointsEvents);

module.exports = models;