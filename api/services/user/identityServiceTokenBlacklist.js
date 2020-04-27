const Redis = require('ioredis');
const {config} = require('../../../config');
const BLACKLIST_TOKEN_PREFIX = 'blacklist';
/**
 * JSON web tokens are stateless. That means the server does not maintain the state of the user.
 * This module will allow us to use Redis as an in-memory database and invalidate JWT tokens when needed (on logout).
 * To achieve this we will be keeping a "blacklist" with all the valid JWT tokens that we do not want to allow anymore.
 */
class IdentityServiceTokenBlacklist {
    constructor(connection) {
        this.redis = new Redis(connection);
    }

    /**
     * Return if this JWT token is currently in the blacklist.
     * @param token JWT token to be searched on the backlist
     * @returns Promise
     */
    contains(token) {
        return this.redis.get(`${BLACKLIST_TOKEN_PREFIX}:${token}`)
            .then(token => Promise.resolve(Boolean(token)))
            .catch(() => Promise.resolve(false));
    }

    /**
     *
     * @param token JWT token to be backlisted
     * @param expiresIn In how many seconds this token will expire
     */
    add(token, expiresIn) {
        // We don't need to return the response. If we cannot store the JWT, there isn't much to do about it :(
        this.redis.setex(`${BLACKLIST_TOKEN_PREFIX}:${token}`, expiresIn, 1);
    }

}

// Singleton pattern
const identityServiceTokenBlacklist = new IdentityServiceTokenBlacklist(config.get('REDIS_CONNECTION_URI'));
module.exports = identityServiceTokenBlacklist;