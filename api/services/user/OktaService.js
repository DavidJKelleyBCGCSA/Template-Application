const { User } = require('../../model');

const USER_COMPANY = 'BCG';

class OktaService {
    constructor(identityService) {
        this.identityService = identityService;

        this.userAttributes = ['id', 'username', 'firstName', 'lastName', 'avatar'];
    }

    /**
     * finds the Okta user or creates it if needed
     * @param oktaUser {object}
     * @returns {Promise<any>}
     */
    login(oktaUser) {
        console.log(oktaUser);
        return User.findOne({attributes: this.userAttributes, where: {
                username: oktaUser.email,
                source: oktaUser.issuer,
                sourceUserId: oktaUser.nameID,
            }})
            .then((user) => {
                if (!user) {
                    return this.register(oktaUser)
                        .then((_user) => {
                            if (!_user) {
                                throw new Error('User not found');
                            }
                            return _user;
                        });
                }
                return user;
            })
            .then((user) => {
                return new Promise((resolve) => {
                    this.identityService.generateAccessAndRefreshTokens(user.toJSON(), resolve);
                })
            });
    }

    /**
     * perform the registration process with an Okta user
     * @param oktaUser {object}
     * @returns {Promise<User>}
     */
    register(oktaUser) {
        const username = oktaUser.email;
        return User.create({
            username,
            firstName: oktaUser.firstName,
            lastName: oktaUser.lastName,
            company: USER_COMPANY,
            token: null,
            avatar: this.identityService.getAvatar(username),
            source: oktaUser.issuer,
            sourceUserId: oktaUser.nameID,
        }).catch(e => new Error(`Error registering: ${e}`));
    }
}

module.exports = OktaService;