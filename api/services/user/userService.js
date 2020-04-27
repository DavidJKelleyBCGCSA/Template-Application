const {User, Sequelize} = require('../../model');
const Op = Sequelize.Op;
const { userLight } = require('../util/includes');

class UserService {

    getUserByUsername(username) {
        return User.findOne({where: {username}});
    }

    getUserByEmail(email) {
        return this.getUserByUsername(email);
    }

    /**
     * return a list of users email that starts with that prefix
     * @param {the email prefix} prefix
     * @param {limit the results count. max 10} top
     */
    getUserEmailsByPrefix(prefix, top = 3) {
        const limitTo = top > 0 && top < 10
        ? Number.parseInt(top, 10)
        : 10;

        return User.findAll({
            attributes: [['username', 'email']],
            where: {
                username: {
                    [Op.iLike]: `${prefix}%`
                }
            },
            limit: limitTo,
        });
    }

    getUserByNamePrefix(prefix, top = 3) {
        const limitTo = top > 0 && top < 10
        ? Number.parseInt(top, 10)
        : 10;

        return User.findAll({
            attributes: userLight.attributes,
            where: Sequelize.where(
                Sequelize.fn("CONCAT", Sequelize.col("first_name"), " ", Sequelize.col("last_name")),
                { [Op.iLike]: `%${prefix}%` }),
            limit: limitTo,
        });
    }

}

module.exports = UserService;