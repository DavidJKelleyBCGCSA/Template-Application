const passport = require('passport');

const BaseRouter = require('./BaseRouter');
const LoginController = require('../../api/controllers/LoginController');
const BASE_PATH = `/login`;
const BCG_PATH = `${BASE_PATH}/bcg`;
const CALLBACK_PATH = `${BASE_PATH}/callback`;
const LOOKUP_PATH = `${BASE_PATH}/lookup`;
const PASSPORT_SAML_STRATERY = 'saml';

// TODO: Use dependency injection
const loginController = new LoginController();

class LoginRouter extends BaseRouter {
    addRoutes(router) {
        router.post(LOOKUP_PATH, loginController.lookup);

        router.post(CALLBACK_PATH,
            passport.authenticate(PASSPORT_SAML_STRATERY, { failureRedirect: '/', failureFlash: true, session: false }),
            loginController.loginCallback
        );

        router.get(BCG_PATH,
            (req, res, next) => {
                passport.authenticate(PASSPORT_SAML_STRATERY, {
                    failureRedirect: '/',
                    failureFlash: true,
                    session: false,
                    additionalParams: {
                        RelayState: req.query.state,
                    }
                })(req, res, next);
            },
            loginController.bcgLogin
        );
    }
}

module.exports = LoginRouter;
