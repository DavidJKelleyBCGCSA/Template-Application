const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { User } = require('../../model');
const BCG_EMAIL_SUFFIX = '@bcg.com';
const {config} = require('../../../config');
const tokenBlacklist = require('./identityServiceTokenBlacklist');
const log = require('../../util/log');
const JWT_SECRET = 'JWT_SECRET';
const JWT_REFRESH_SECRET = 'JWT_REFRESH_SECRET';
const JWT_EXPIRATION = 'JWT_EXPIRATION';
const JWT_REFRESH_EXPIRATION = 'JWT_REFRESH_EXPIRATION';

class IdentityService {

    constructor() {
        this.userAttributes = ['id', 'username', 'firstName', 'lastName', 'avatar', 'hashedPassword'];

        if (!config.hasAll([JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRATION, JWT_REFRESH_EXPIRATION])) {
            throw new Error(
                'Config must have JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRATION and JWT_REFRESH_EXPIRATION');
        }
        this.jwtconfig = {
            secret: config.get(JWT_SECRET),
            secretRefresh: config.get(JWT_REFRESH_SECRET),
            tokenExpiration: { expiresIn: parseInt(config.get(JWT_EXPIRATION), 10)},
            refreshTokenExpiration: { expiresIn: parseInt(config.get(JWT_REFRESH_EXPIRATION), 10)}
        };
    }

    /**
     * Generate a JWT
     * @param tokenData {object}
     * @param secret {string}
     * @param expiration {object}
     * @returns {Promise<object>}
     */
    generateToken(tokenData, secret, expiration) {
        return jwt.sign({ ...tokenData, iat: Math.floor(Date.now() / 1000)}, secret, expiration);
    }

    /**
     * handle the process of generate tokens from the refresh one
     * @param token {string}
     * @returns {Promise<object>}
     */
    handleRefreshToken(token) {
        return new Promise((fulfill, reject) => {
            this.validateToken(token, this.jwtconfig.secretRefresh)
            .then(user => {
                User.findOne({attributes: this.userAttributes,
                    where: {id: user.id}})
                    .then(user => {
                        if (!user) {
                            reject(new Error('User not found'));
                        }
                        else {
                            this.generateAccessAndRefreshTokens(user.toJSON(), fulfill);
                        }
                    });
            })
            .catch(e => reject(e));
        });
    }

    /**
     * tell if the tokens if valid
     * @param token {string}
     * @param secret {string}
     * @returns {Promise<object>}
     */
    validateToken(token, secret) {
        return new Promise((resolve, reject) => {

            // validate first if this token is not blacklisted
            tokenBlacklist.contains(token)
                .then(contains => {
                    if (!contains) {
                        jwt.verify(token, secret, (err, decoded) => {
                            if (err) {
                                log.error(token, err.message || 'JWT cannot be verified');
                                reject(err);
                            }
                            else {
                                resolve(decoded);
                            }
                        });
                    }
                    else {
                        log.error(token, 'Blacklisted');
                        reject(new Error('Token is blacklisted'));
                    }
                });
        });
    }

    /**
     * generate fresh new tokens
     * @param userData {object}
     * @param done {function}
     * @returns {null}
     */
    generateAccessAndRefreshTokens(user, done) {
        Reflect.deleteProperty(user, 'hashedPassword');
        const tokenPromise = this.generateToken(user, this.jwtconfig.secret, this.jwtconfig.tokenExpiration);
        const refreshTokenPromise = this.generateToken(
            { id: user.id },
            this.jwtconfig.secretRefresh,
            this.jwtconfig.refreshTokenExpiration
        );
        Promise.all([tokenPromise, refreshTokenPromise]).then(tokens => {
            done({ token: tokens[0], refreshToken: tokens[1], user });
        });
    }

    /**
     * perform the login process
     * @param username {string}
     * @param password {string}
     * @returns {null}
     */
    login (username, password) {
        return new Promise((fulfill, reject) => {
            User.findOne({attributes: this.userAttributes,
                where: {username}})
                .then(user => {
                    if (!user) {
                        reject(new Error('User not found'));
                    }
                    else {
                        bcrypt.compare(password, user.hashedPassword, (err, res) => {
                            if (res) {
                                this.generateAccessAndRefreshTokens(user.toJSON(), fulfill);
                            }
                            else {
                                reject(new Error('Bad password'));
                            }
                        });
                    }
                });
        });
    }

    /**
     * perform the register process
     * @param username {string}
     * @param password {string}
     * @param firstName {string}
     * @param lastName {string}
     * @param company {string}
     * @returns {promise<object>}
     */
    register (username, password, firstName, lastName, company) {
        return new Promise((fulfill, reject) => {
            bcrypt.hash(password, 10, (err, hashedPassword) => {

                // this  avatar is temporal until we know which avatar are we going to show here..
                // maybe a BCG service ?
                const avatar = this.getAvatar(username);

                User.create({ username, hashedPassword, firstName, lastName, company, token: null, avatar })
                    .then(() => {
                        this.generateAccessAndRefreshTokens({username, lastName, firstName, avatar }, fulfill);
                    })
                    .catch(e => reject(new Error(`Error registering: ${e}`)));
            });
        });
    }

    /**
     * Generates a token for use by the event bus.  Note that token expires based on TOKEN_TTL
     * @param userId
     * @returns {string}
     */
    generateAPIKey (userId) {
        return this.generateToken({id: userId}, this.jwtconfig.secret, this.jwtconfig.tokenExpiration);
    }

    /**
     * Returns User object associated with token (if any)
     * @param token
     * @returns {Promise<Model<any, any> | null>}
     */
    identify (token) {
        return this.validateToken(token, this.jwtconfig.secret);
    }

    // Helpers

    /**
     * return an avatar
     * @param username {string}
     * @returns {string}
     */
    getAvatar (username) {
        return `https://api.adorable.io/avatars/150/${username}`;
    }

    /**
     * returns whether the provided email is a BCG address
     * @param email {string}
     * @returns {boolean}
     */
    isBcgEmail (email) {
        return email.endsWith(BCG_EMAIL_SUFFIX);
    }

    /**
     * "Invalidates" the JWT token.
     * As JSON web tokens are stateless, the server does not maintain the state of the user, so we need to add it
     * to a blacklist.
     * @param token JWT token to be invalidated
     */
    logout(token, refreshToken) {
        // TODO: Add OKTA logout too.

        const now = Math.floor(Date.now() / 1000);
        // if they are valid tokens (avoid adding anything that is not a valid token)
        jwt.verify(token, this.jwtconfig.secret, (err, decoded) => {
            if (!err) {
                const remainingTime = decoded.exp - now;
                if (remainingTime > 0) {
                    tokenBlacklist.add(token, remainingTime);
                }
            }
        });

        jwt.verify(refreshToken, this.jwtconfig.secretRefresh, (err, decoded) => {
            if (!err) {
                const remainingTime = decoded.exp - now;
                if (remainingTime > 0) {
                    tokenBlacklist.add(refreshToken, remainingTime);
                }
            }
        });
    }

}

module.exports = IdentityService;