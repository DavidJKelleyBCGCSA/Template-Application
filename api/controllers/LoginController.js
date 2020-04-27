const querystring = require('querystring');

const config = require('../../config');
const OktaService = require('../services/user/OktaService');
const IdentityService = require('../services/user/identityService');

const BCG_PATH = '/login/bcg';
const BCG_LOGIN_COOKIE = 'bcg_login';
const BCG_LOGIN_COOKIE_MAX_AGE_MS = 5 * 60 * 1000;

// TODO: Use dependency injection
const identityService = new IdentityService();
const oktaService = new OktaService(identityService);

class LoginController {
    lookup(req, res) {
        if (!req.body.email) {
            return res.status(400).send('Email required');
        }

        if (identityService.isBcgEmail(req.body.email)) {
            return res.json({
                redirect: `${config.API_URL}${BCG_PATH}`
            });
        }

        return res.status(204).end();
    }

    loginCallback(req, res) {
        const state = req.body.RelayState;

        oktaService.login(req.user)
            .then(({token, refreshToken, user}) => {
                const query = querystring.stringify({
                    token,
                    refreshToken,
                    user: JSON.stringify(user),
                    state,
                });
                res.redirect(`${config.APP_URL}?${query}`);
            })
            .catch((err) => {
                console.log(err);
                res.status(401).send('Login failed');
            });
    }

    bcgLogin(req, res) {
        res.redirect(config.APP_URL);
    }
}

module.exports = LoginController;