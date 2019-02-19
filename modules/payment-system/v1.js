/* 
 * This is a class that provide easy conversation with
 * the Stripe API for payment system. It allow you to manage 
 * charges, customers, cards, sources and subscriptions.
 * 
 * Version: 1.0.0
 * Author: Alessandro D'Antoni
 * Company name: Alessandro D'Antoni
 * Created at 07/02/2019
 *
 */

class Payments {

    constructor(params) {
        // Required secret_key string or {secret_key: "secretKey"} object
        this.controls = params != '' && params != null && params != undefined && Object.entries(params).length !== 0 && (typeof params === "object" || typeof params === "string") ? params : false;
        if (this.controls) {
            // Login to the Stripe library with your secret key, it work with both staging and live mode
            this.secret_key = typeof params === "object" ? params.secret_key : params;
            this.stripe = require('stripe')(this.secret_key);
            this.uuid = require('uuid/v4');
            // All the contructor data for calling the Stripe API
            this.charge_id = null;
            this.customer_id = null;
            this.card_id = null;
            this.source_id = null;
            this.subscription_id = null;
            this.amount = 0;
            this.source = null;
            this.currency = "eur";
            this.description = null;
            this.idempotency_key = null;
            this.filters = {};
        } else {
            throw new Error('Missing required init secret_key parameter.');
        }
    }

    set(object) {
        // Set methode for all data needed
        this.charge_id = object.charge_id != null && object.charge_id != undefined ? object.charge_id : this.charge_id;
        this.customer_id = object.customer_id != null && object.customer_id != undefined ? object.customer_id : this.customer_id;
        this.card_id = object.card_id != null && object.card_id != undefined ? object.card_id : this.card_id;
        this.source_id = object.source_id != null && object.source_id != undefined ? object.source_id : this.source_id;
        this.subscription_id = object.subscription_id != null && object.subscription_id != undefined ? object.subscription_id : this.subscription_id;
        this.amount = object.amount != null && object.amount != undefined ? object.amount : this.amount;
        this.source = object.source != null && object.source != undefined ? object.source : this.source;
        this.currency = object.currency != null && object.currency != undefined ? object.currency : this.currency;
        this.description = object.description != null && object.description != undefined ? object.description : this.description;
        this.idempotency_key = object.idempotency_key != null && object.idempotency_key != undefined ? object.idempotency_key : this.uuid();
        this.filters = typeof object.filters === "object" && object.filters != null && object.filters != undefined ? object.filters : {};
        return this;
    }

    /*
     * CHARGES FUNCTIONS
     * 
     * `createCharge(void: done(err, charge));` Create a new charge for the source or token or customer provided.
     * `retrieveCharge(void: done(err, charge));` Retrieve a specific charge information object.
     * `updateCharge(void: done(err, charge));` Update a specific charge information.
     * `captureCharge(void: done(err, charge));` Capture charge if is not already captured.
     * `listAllCharges(void: done(err, charges));` Get an array with all charges objects filtered and paginated.
     *
     */

    async createCharge(done) {
        await this.stripe.charges.create({
            amount: this.amount,
            currency: this.currency,
            source: this.source, // tok_id obtained with Stripe.js elements
            description: this.description // "Charge for jenny.rosen@example.com"
        }, {
            idempotency_key: this.idempotency_key
        }).then(charge => {
            // asynchronously called
            return done(null, charge);
        }).catch(err => {
            // asynchronously called
            return done(err)
        });
    }

    async retrieveCharge(done) {
        await this.stripe.charges.retrieve(this.charge_id).then((charge) => {
            // asynchronously called
            return done(null, charge);
        }).catch(err => {
            // asynchronously called
            return done(err)
        });
    }

    async updateCharge(params, done) {
        if (typeof params === "object") {
            await this.stripe.charges.update(this.charge_id, params).then(charge => {
                // asynchronously called
                return done(null, charge);
            }).catch(err => {
                // asynchronously called
                return done(err);
            });
        } else {
            return await done({
                'err': 'Parameters data must be formatted as an object.'
            });
        }
    }

    async captureCharge(done) {
        // Required charge_id
        const charge_id = this.charge_id != undefined && this.charge_id != null && this.charge_id != '' ? this.charge_id : false;
        if (charge_id) {
            await this.stripe.charges.capture(this.charge_id).then(charge => {
                // asynchronously called
                return done(null, charge);
            }).catch(err => {
                // asynchronously called
                return done(err);
            });
        } else {
            return await done({
                'err': 'Charge ID is required.'
            });
        }
    }

    async listAllCharges(done) {
        if (typeof this.filters === "object") {
            await this.stripe.charges.list(this.filters).then(charges => {
                // asynchronously called
                return done(null, charges);
            }).catch(err => {
                // asynchronously called
                return done(err);
            });
        } else {
            return await done({
                'err': 'Filters data must be formatted as an object.'
            });
        }
    }

    /*
     * CUSTOMERS FUNCTIONS
     *
     */

    async createCustomer(params, done) {
        if (typeof params === "object") {
            params.email = params.email != '' && params.email != null && params.email != undefined ? params.email : false;
            if (params.email) {
                await this.stripe.customers.create(params).then(customer => {
                    // asynchronously called
                    return done(null, customer);
                }).catch(err => {
                    // asynchronously called
                    return done(err);
                });
            } else {
                return await done({
                    'err': 'Missing required email parameter.'
                });
            }
        } else {
            return await done({
                'err': 'Parameters data must be formatted as an object.'
            });
        }
    }

    async retrieveCustomer(done) {
        const customer_id = this.customer_id != '' && this.customer_id != null && this.customer_id != undefined ? this.customer_id : false;
        if (customer_id) {
            await this.stripe.customers.retrieve(customer_id).then(customer => {
                // asynchronously called
                return done(null, customer);
            }).catch(err => {
                // asynchronously called
                return done(err);
            });
        } else {
            return await done({
                'err': 'Missing required customer_id parameter.'
            });
        }
    }

    async updateCustomer(params, done) {
        const customer_id = this.customer_id != '' && this.customer_id != null && this.customer_id != undefined ? this.customer_id : false;
        if (customer_id) {
            if (typeof params === "object") {
                await this.stripe.customers.update(customer_id, params).then(customer => {
                    // asynchronously called
                    return done(null, customer);
                }).catch(err => {
                    // asynchronously called
                    return done(err);
                });
            } else {
                return await done({
                    'err': 'Parameters data must be formatted as an object.'
                });
            }
        } else {
            return await done({
                'err': 'Missing required customer_id parameter.'
            });
        }
    }

    async deleteCustomer(done) {
        const customer_id = this.customer_id != '' && this.customer_id != null && this.customer_id != undefined ? this.customer_id : false;
        if (customer_id) {
            await this.stripe.customers.del(customer_id).then(confirmation => {
                // asynchronously called
                return done(null, confirmation);
            }).catch(err => {
                // asynchronously called
                return done(err);
            });
        } else {
            return await done({
                'err': 'Missing required customer_id parameter.'
            });
        }
    }

    async listAllCustomers(done) {
        if (typeof this.filters === "object") {
            await this.stripe.customers.list(this.filters).then(charges => {
                // asynchronously called
                return done(null, charges);
            }).catch(err => {
                // asynchronously called
                return done(err);
            });
        } else {
            return await done({
                'err': 'Filters data must be formatted as an object.'
            });
        }
    }

    /*
     * CARDS FUNCTIONS
     *
     */

    async createCard(params, done) {
        const customer_id = this.customer_id != '' && this.customer_id != null && this.customer_id != undefined ? this.customer_id : false;
        params.source = params.source != '' && params.source != null && params.source != undefined ? params.source : false;
        if (customer_id && params.source) {
            if (typeof params === "object") {
                await this.stripe.customers.createSource(customer_id, params).then(card => {
                    // asynchronously called
                    return done(null, card);
                }).catch(err => {
                    // asynchronously called
                    return done(err);
                });
            } else {
                return await done({
                    'err': 'Parameters data must be formatted as an object.'
                });
            }
        } else {
            return await done({
                'err': 'Missing required customer_id & source parameters.'
            });
        }
    }

    async retrieveCard(done) {
        const card_id = this.card_id != '' && this.card_id != null && this.card_id != undefined ? this.card_id : false;
        const customer_id = this.customer_id != '' && this.customer_id != null && this.customer_id != undefined ? this.customer_id : false;
        if (card_id && customer_id) {
            await this.stripe.customers.retrieveCard(customer_id, card_id).then(card => {
                // asynchronously called
                return done(null, card);
            }).catch(err => {
                // asynchronously called
                return done(err);
            });
        } else {
            return await done({
                'err': 'Missing required customer_id & card_id parameters.'
            });
        }
    }

    async updateCard(params, done) {
        const card_id = this.card_id != '' && this.card_id != null && this.card_id != undefined ? this.card_id : false;
        const customer_id = this.customer_id != '' && this.customer_id != null && this.customer_id != undefined ? this.customer_id : false;
        if (card_id && customer_id) {
            if (typeof params === "object") {
                await this.stripe.customers.updateCard(customer_id, card_id, params).then(card => {
                    // asynchronously called
                    return done(null, card);
                }).catch(err => {
                    // asynchronously called
                    return done(err);
                });
            } else {
                return await done({
                    'err': 'Parameters data must be formatted as an object.'
                });
            }
        } else {
            return await done({
                'err': 'Missing required customer_id & card_id parameter.'
            });
        }
    }

    async deleteCard(done) {
        const card_id = this.card_id != '' && this.card_id != null && this.card_id != undefined ? this.card_id : false;
        const customer_id = this.customer_id != '' && this.customer_id != null && this.customer_id != undefined ? this.customer_id : false;
        if (card_id && customer_id) {
            await this.stripe.customers.deleteCard(customer_id, card_id).then(confirmation => {
                // asynchronously called
                return done(null, confirmation);
            }).catch(err => {
                // asynchronously called
                return done(err);
            });
        } else {
            return await done({
                'err': 'Missing required customer_id & card_id parameters.'
            });
        }
    }

    async listAllCards(done) {
        const customer_id = this.customer_id != '' && this.customer_id != null && this.customer_id != undefined ? this.customer_id : false;
        if (customer_id) {
            await this.stripe.customers.listCards(customer_id).then(cards => {
                // asynchronously called
                return done(null, cards);
            }).catch(err => {
                // asynchronously called
                return done(err);
            });
        } else {
            return await done({
                'err': 'Missing required customer_id parameter.'
            });
        }
    }

    /*
     * SOURCES FUNCTIONS
     *
     */

    async retrieveSource(done) {
        const source_id = this.source_id != '' && this.source_id != null && this.source_id != undefined ? this.source_id : false;
        if (source_id) {
            await this.stripe.sources.retrieve(source_id).then(source => {
                // asynchronously called
                return done(null, source);
            }).catch(err => {
                // asynchronously called
                return done(err);
            });
        } else {
            return await done({
                'err': 'Missing required source_id parameter.'
            });
        }
    }

    async updateSource(params, done) {
        const source_id = this.source_id != '' && this.source_id != null && this.source_id != undefined ? this.source_id : false;
        if (source_id) {
            if (typeof params === "object") {
                await this.stripe.sources.update(source_id, params).then(source => {
                    // asynchronously called
                    return done(null, source);
                }).catch(err => {
                    // asynchronously called
                    return done(err);
                });
            } else {
                return await done({
                    'err': 'Parameters data must be formatted as an object.'
                });
            }
        } else {
            return await done({
                'err': 'Missing required source_id parameter.'
            });
        }
    }

    async createSource(params, done) {
        const customer_id = this.customer_id != '' && this.customer_id != null && this.customer_id != undefined ? this.customer_id : false;
        if (typeof params === "object") {
            params.source = params.source != '' && params.source != null && params.source != undefined ? params.source : false;
            if (customer_id && params.source) {
                await this.stripe.customers.createSource(customer_id, params).then(source => {
                    // asynchronously called
                    return done(null, source);
                }).catch(err => {
                    // asynchronously called
                    return done(err);
                });
            } else {
                return await done({
                    'err': 'Missing required customer_id & source_id parameters.'
                });
            }
        } else {
            return await done({
                'err': 'Parameters data must be formatted as an object.'
            });
        }
    }

    async deleteSource(done) {
        const source_id = this.source_id != '' && this.source_id != null && this.source_id != undefined ? this.source_id : false;
        const customer_id = this.customer_id != '' && this.customer_id != null && this.customer_id != undefined ? this.customer_id : false;
        if (source_id && customer_id) {
            await this.stripe.customers.deleteSource(customer_id, source_id).then(source => {
                // asynchronously called
                return done(null, source);
            }).catch(err => {
                // asynchronously called
                return done(err);
            });
        } else {
            return await done({
                'err': 'Missing required customer_id & source_id parameters.'
            });
        }
    }

    /*
     * SUBSCRIPTIONS FUNCTIONS
     *
     */

    async createSubscription(params, done) {
        const customer_id = this.customer_id != '' && this.customer_id != null && this.customer_id != undefined ? this.customer_id : false;
        if (typeof params === "object") {
            params.plan = params.plan != '' && params.plan != null && params.plan != undefined ? params.plan : false; // Required
            params.billing = params.billing != '' && params.billing != null && params.billing != undefined ? params.billing : "charge_automatically";
            params.coupon = params.coupon != '' && params.coupon != null && params.coupon != undefined ? params.coupon : null;
            params.trial_end = params.trial_end != '' && params.trial_end != null && params.trial_end != undefined ? params.trial_end : "now";
            if (customer_id && params.plan) {
                await this.stripe.subscriptions.create({
                    customer: customer_id,
                    items: [{
                        plan: params.plan
                    }],
                    billing: params.billing, // charge_automatically or send_invoice
                    coupon: params.coupon, // coupon code to apply or null
                    trial_end: params.trial_end // timestamp of the trial period end or 'now' for no trial period
                }).then(subscription => {
                    // asynchronously called
                    return done(null, subscription);
                }).catch(err => {
                    // asynchronously called
                    return done(err);
                });
            } else {
                return await done({
                    'err': 'Missing required customer_id & plan parameters.'
                });
            }
        } else {
            return await done({
                'err': 'Parameters data must be formatted as an object.'
            });
        }
    }

    async retrieveSubscription(done) {
        const subscription_id = this.subscription_id != '' && this.subscription_id != null && this.subscription_id != null ? this.subscription_id : false;
        if (subscription_id) {
            await this.stripe.subscriptions.retrieve(subscription_id).then(subscription => {
                // asynchronously called
                return done(null, subscription);
            }).catch(err => {
                // asynchronously called
                return done(err);
            });
        } else {
            return await done({
                'err': 'Missing required subscription_id parameter.'
            });
        }
    }

    async updateSubscription(params, done) {
        const subscription_id = this.subscription_id != '' && this.subscription_id != null && this.subscription_id != null ? this.subscription_id : false;
        if (subscription_id) {
            if (typeof params === "object") {
                await this.stripe.subscriptions.update(source_id, params).then(subscription => {
                    // asynchronously called
                    return done(null, subscription);
                }).catch(err => {
                    // asynchronously called
                    return done(err);
                });
            } else {
                return await done({
                    'err': 'Parameters data must be formatted as an object.'
                });
            }
        } else {
            return await done({
                'err': 'Missing required subscription_id parameter.'
            });
        }
    }

    async cancelSubscription(done) {
        const subscription_id = this.subscription_id != '' && this.subscription_id != null && this.subscription_id != null ? this.subscription_id : false;
        if (subscription_id) {
            await this.stripe.subscriptions.del(subscription_id).then(confirmation => {
                // asynchronously called
                return done(null, confirmation);
            }).catch(err => {
                // asynchronously called
                return done(err);
            });
        } else {
            return await done({
                'err': 'Missing required subscription_id parameter.'
            });
        }
    }

    async cancelSubscriptionAtPeriodEnd(done) {
        const subscription_id = this.subscription_id != '' && this.subscription_id != null && this.subscription_id != null ? this.subscription_id : false;
        if (subscription_id) {
            await this.stripe.subscriptions.update(subscription_id, {
                cancel_at_period_end: true
            }).then(subscription => {
                // asynchronously called
                return done(null, subscription);
            }).catch(err => {
                // asynchronously called
                return done(err);
            });
        } else {
            return await done({
                'err': 'Missing required subscription_id parameter.'
            });
        }
    }

    async reactivateSubscriptionBeforePeriodEnd(done) {
        const subscription_id = this.subscription_id != '' && this.subscription_id != null && this.subscription_id != null ? this.subscription_id : false;
        if (subscription_id) {
            await this.stripe.subscriptions.update(subscription_id, {
                cancel_at_period_end: false
            }).then(subscription => {
                // asynchronously called
                return done(null, subscription);
            }).catch(err => {
                // asynchronously called
                return done(err);
            });
        } else {
            return await done({
                'err': 'Missing required subscription_id parameter.'
            });
        }
    }

}

function init(secretKey) {
    if (secretKey != '' && secretKey != null && secretKey != undefined) {
        return new Payments(secretKey);
    } else {
        return Payments;
    }
}

// module.exports = Payments;
module.exports = init;

/* 
 * This is a class that provide easy conversation with
 * the Stripe API for payment system. It allow you to manage 
 * charges, customers, cards, sources and subscriptions.
 * 
 * Version: 1.0.0
 * Author: Alessandro D'Antoni
 * Company name: Alessandro D'Antoni
 * Created at 07/02/2019
 *  
 * INIT THE Payments CLASS
 *
 * -> new Payments("your_secret_key");
 * OR
 * -> new Payments({ secret_key: "your_secret_key" });
 * 
 * With `require()` you can do the same as follow
 * 
 * const Payments = require('payment-system/v1'); // Assuming that you store the module in main dir.
 * const payments = new Payments("your_secret_key");
 * payments.set({
 *    amount: 10000,
 *    source: "tok_visa",
 *    currency: "eur",
 *    description: "Charge for jenny.rosen@example.com"
 * }).createCharge((err, charge) => {
 *     // Do stuff here with `charge` object
 *     // It already work in async way
 *     // So meanwhile you can call other functions
 * });
 * 
 * If you prefer the `then().catch()` approatch, 
 * of course you can do the follow
 * 
 * const Payments = require('payment-system/v1'); // Assuming that you store the module in main dir.
 * const payments = new Payments("your_secret_key");
 * payments.set({
 *    amount: 10000,
 *    source: "tok_visa",
 *    currency: "eur",
 *    description: "Charge for jenny.rosen@example.com"
 * }).createCharge().then(charge => {
 *     // Do stuff here with `charge` object
 *     // It already work in async way
 *     // So meanwhile you can call other functions
 * }).catch(err => {
 *     // Do debugging stuff with `err` object.
 * });
 * 
 * Then you can specify the methode needed. All the 
 * functions become as native asyncronous so you
 * can do all the operation you want without affecting 
 * the system performance.
 * 
 * @params: Object
 * @filters: Object
 * 
 * Follow a complete guide for all methode provided here.
 * 
 */

// CREATE A CHARGE

// new Payments("sk_test_F16PeccY5UHTeVXDRcKxrr2h").set({
//     amount: 10000,
//     source: "tok_visa",
//     currency: "eur",
//     description: "Charge for jenny.rosen@example.com",
// }).createCharge((err, charge) => {
//     console.log(err, charge);
// });

// RETRIEVE A CHARGE

// new Payments("sk_test_F16PeccY5UHTeVXDRcKxrr2h").set({
//     charge_id: "ch_1E1A08JeCCrtJUbzQckSjOjn"
// }).retrieveCharge((err, charge) => {
//     console.log(err, charge);
// });

// UPDATE A CHARGE

// new Payments("sk_test_F16PeccY5UHTeVXDRcKxrr2h").set({
//     charge_id: "ch_1E1A08JeCCrtJUbzQckSjOjn"
// }).updateCharge({
//     description: "Una nuova descrizione."
// }, (err, charge) => {
//     console.log(err, charge);
// });

// CAPTURE A CHARGE

// new Payments("sk_test_F16PeccY5UHTeVXDRcKxrr2h").set({
//     charge_id: "ch_1E1A08JeCCrtJUbzQckSjOjn"
// }).captureCharge((err, charge) => {
//     console.log(err, charge);
// });

// LIST ALL CHARGES

// new Payments("sk_test_F16PeccY5UHTeVXDRcKxrr2h").set({
//     filters: {
//         limit: 5
//     }
// }).listAllCharges((err, charges) => {
//     console.log(err, charges);
// });

// CREATE A CUSTOMERS

// new Payments("sk_test_F16PeccY5UHTeVXDRcKxrr2h").createCustomer({
//     email: "customer.email.1@example.com"
// }, (err, customer) => {
//     console.log(err, customer);
// });

// RETRIEVE A CUSTOMER

// new Payments("sk_test_F16PeccY5UHTeVXDRcKxrr2h").set({
//     customer_id: "cus_EUAZLtSSH54YBl"
// }).retrieveCustomer((err, customer) => {
//     console.log(err, customer);
// });

// UPDATE A CUSTOMER

// new Payments("sk_test_F16PeccY5UHTeVXDRcKxrr2h").set({
//     customer_id: "cus_EUAZLtSSH54YBl"
// }).updateCustomer({
//     description: "New customer description."
// }, (err, customer) => {
//     console.log(err, customer);
// });

// DELETE A CUSTOMER

// new Payments("sk_test_F16PeccY5UHTeVXDRcKxrr2h").set({
//     customer_id: "cus_EUBqCsjdeq38cm"
// }).deleteCustomer((err, confirmation) => {
//     console.log(err, confirmation);
// });

// LIST ALL CUSTOMERS

// new Payments("sk_test_F16PeccY5UHTeVXDRcKxrr2h").set({
//     filters: {
//         limit: 5
//     }
// }).listAllCustomers((err, customers) => {
//     console.log(err, customers);
// });

// CREATE A CARD

// new Payments("sk_test_F16PeccY5UHTeVXDRcKxrr2h").set({
//     customer_id: "cus_EUAZLtSSH54YBl"
// }).createCard({
//     source: "tok_visa" // Required source parameter, it's a token retrieved by Stripe.js elements
// }, (err, card) => {
//     console.log(err, card);
// });

// RETRIEVE A CARD

// new Payments("sk_test_F16PeccY5UHTeVXDRcKxrr2h").set({
//     customer_id: "cus_EUAZLtSSH54YBl",
//     card_id: "card_1E1DgWJeCCrtJUbzemsq9MSj"
// }).retrieveCard((err, card) => {
//     console.log(err, card);
// });

// UPDATE A CARD

// new Payments("sk_test_F16PeccY5UHTeVXDRcKxrr2h").set({
//     customer_id: "cus_EUAZLtSSH54YBl",
//     card_id: "card_1E1DgWJeCCrtJUbzemsq9MSj"
// }).updateCard({
//     name: "Alessandro D'Antoni", // Optional
//     address_city: "Palermo", // Optional
//     address_state: "Palermo", // Optional
//     address_country: "Italy", // Optional
//     address_line1: "Piazzale Bellaria, 4", // Optional
//     address_zip: "90126", // Optional
//     exp_month: "05", // Optional
//     exp_year: "2023" // Optional
// }, (err, card) => {
//     console.log(err, card);
// });

// DELETE A CARD

// new Payments("sk_test_F16PeccY5UHTeVXDRcKxrr2h").set({
//     customer_id: "cus_EUAZLtSSH54YBl",
//     card_id: "card_1E1E36JeCCrtJUbzjImPWtZF"
// }).deleteCard((err, card) => {
//     console.log(err, card);
// });

// LIST ALL CARDS

// new Payments("sk_test_F16PeccY5UHTeVXDRcKxrr2h").set({
//     customer_id: "cus_EUAZLtSSH54YBl"
// }).listAllCards((err, card) => {
//     console.log(err, card);
// });

// RETRIEVE A SOURCE

// new Payments("sk_test_F16PeccY5UHTeVXDRcKxrr2h").set({
//     source_id: "src_1E1EH8JeCCrtJUbz9IyeSIaX"
// }).retrieveSource((err, source) => {
//     console.log(err, source);
// });

// UPDATE A SOURCE

// new Payments("sk_test_F16PeccY5UHTeVXDRcKxrr2h").set({
//     source_id: "src_1E1EH8JeCCrtJUbz9IyeSIaX"
// }).updateSource({
//     metadata: {
//         order_id: "6735"
//     }
// }, (err, source) => {
//     console.log(err, source);
// });

// CREATE A SOURCE

// new Payments("sk_test_F16PeccY5UHTeVXDRcKxrr2h").set({
//     customer_id: "cus_EUAZLtSSH54YBl"
// }).createSource({
//     source_id: "src_1E1EH8JeCCrtJUbz9IyeSIaX"
// }, (err, source) => {
//     console.log(err, source);
// });

// DELETE A SOURCE

// new Payments("sk_test_F16PeccY5UHTeVXDRcKxrr2h").set({
//     customer_id: "cus_EUAZLtSSH54YBl",
//     source_id: "src_1E1EH8JeCCrtJUbz9IyeSIaX"
// }).deleteSource((err, source) => {
//     console.log(err, source);
// });

// CREATE A SUBSCRIPTION TO A PLAN

// new Payments("sk_test_F16PeccY5UHTeVXDRcKxrr2h").set({
//     customer_id: "cus_EUAZLtSSH54YBl"
// }).createSubscription({
//     plan: "premium"
// }, (err, subscription) => {
//     console.log(err, subscription);
// });

// RETRIEVE A SUBSCRIPTION

// new Payments("sk_test_F16PeccY5UHTeVXDRcKxrr2h").set({
//     subscription_id: "sub_EUDm6xKFXkzRql"
// }).retrieveSubscription((err, subscription) => {
//     console.log(err, subscription);
// });

// CANCEL A SUBSCRIPTION

// new Payments("sk_test_F16PeccY5UHTeVXDRcKxrr2h").set({
//     subscription_id: "sub_EUDm6xKFXkzRql"
// }).cancelSubscription((err, confirmation) => {
//     console.log(err, confirmation);
// });