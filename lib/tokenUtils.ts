const bcrypt = require('bcrypt');

async function verifyToken(token, hash) {
    return bcrypt.compare(token, hash);
}

module.exports = {
    verifyToken,
};
