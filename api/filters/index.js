const IdentityService = require('../services/user/identityService');
const identityService = new IdentityService();

function getTokenFromHeader(req) {

    const bearerHeader = req.headers.authorization;
    if (typeof bearerHeader !== 'undefined') {
        const bearer = bearerHeader.split(' ');
        return bearer[bearer.length - 1];
    }
    return null;
}

function VerifyToken(req, res, next) {
    // here we can specify later a list of endpoints that can have public access if we want to be more specific
    if (req.originalUrl.startsWith('/api/identity') || req.originalUrl.startsWith('/api/appCatalog/registerApp')) {
        return next();
    }

    const bearerToken = getTokenFromHeader(req);

    if (bearerToken) {
        req.token = bearerToken;
            identityService.identify(req.token)
            .then(user => {
                if (user) {
                    req.user = user;
                    return next();
                }
                return res.sendStatus(403);
            }).catch(e => res.status(403).send({ message: e.name }));
    }
    else {
        return res.sendStatus(403);
    }
}

module.exports = { VerifyToken };