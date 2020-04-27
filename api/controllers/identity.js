const IdentityService = require('../services/user/identityService');
const InvitationService = require('../services/user/invitationService');
const identityService = new IdentityService();
const invitationService = new InvitationService();

function login (req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
        res.status(401).send('Bad login');
    } else {
        identityService.login(username, password)
            .then((loginResponseData) => {
                res.status(200).json(loginResponseData);
            })
            .catch(() => {
                res.status(401).send('Login failed');
            });
    }
}

function refreshToken(req, res) {
    const { token } = req.body;

    if (!token) {
        res.status(400).send('Required fields missing');
    }
    else {
        identityService.handleRefreshToken(token)
            .then((responseData) => {
                res.status(200).json(responseData);
            })
            .catch(e => {
                res.status(401).send(e.message);
            });
    }
}

function register (req, res) {
    const { username, password, firstName, lastName, company } = req.body;

    if (!username || !password) {
        res.status(400).send('Required fields missing');
    } else if (identityService.isBcgEmail(username)) {
        res.status(400).send('BCG users may sign in without registering');
    } else {
        identityService.register(username, password, firstName, lastName, company)
            .then(({token}) => {
                // when a user is registered, then we need to add him to all cases he has been invited to.
                invitationService.addInvitedMemberRelations(username);
                res.status(200).json({token});
            })
            .catch(() => {
                res.status(401).send('Registration failed');
            });
    }
}

function logout (req, res) {
    const { token, refreshToken } = req.body;

    if (!token || !refreshToken) {
        res.status(400).send('Required fields missing');
    }

    identityService.logout(token, refreshToken);
    res.status(200).send();
}

module.exports = { login, register, refreshToken, logout };