const dotenv = require("dotenv/config");

module.exports = function () {
    if (!process.env.API_KEY) {
        throw new Error('FATAL ERROR: jwtPrivateKey is not defined.');
    }
}