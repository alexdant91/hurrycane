const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const Schema = mongoose.Schema;

mongoose.connect('mongodb://localhost:27017/url_shortner', {
    useNewUrlParser: true
});

let models = {};

const userSchema = Schema({
    name: String,
    email: String,
    password: String,
    secret_key: String,
    subscription: String,
    avatar: String,
    facebook_id: String,
    last_name: String,
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

userSchema.plugin(mongoosePaginate);
urlSchema.plugin(mongoosePaginate);
planSchema.plugin(mongoosePaginate);

models.User = mongoose.model('User', userSchema);
models.Url = mongoose.model('Url', urlSchema);
models.Plan = mongoose.model('Plan', planSchema);

module.exports = models;