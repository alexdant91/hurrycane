const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt-nodejs');
const db = require('./db');

// configure passport.js to use the local strategy
passport.use(new LocalStrategy({
        usernameField: 'email'
    },
    (email, password, done) => {
        db.User.find({
            email: email
        }).then(res => {
            const user = JSON.parse(JSON.stringify(res[0]));
            if (!user) {
                return done(null, false, {
                    message: 'Invalid credentials.\n'
                });
            }
            if (!bcrypt.compareSync(password, user.password)) {
                return done(null, false, {
                    message: 'Invalid credentials.\n'
                });
            }
            return done(null, user);
        }).catch(error => done(error));
    }
));

// tell passport how to serialize the user
passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser((id, done) => {
    db.User.find({
        _id: id
    }).then(res => {
        const response = typeof res !== undefined && res.length != 0 ? JSON.parse(JSON.stringify(res[0])) : null;
        done(null, response)
    }).catch(error => done(error, false))
});

module.exports = passport;