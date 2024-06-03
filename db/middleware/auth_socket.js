const dotenv = require("dotenv/config");
const bcrypt = require("bcrypt");


module.exports = function (req, res, next) {

    const token = req.header("x-auth-token");
    
    try {
        const decoded = jwt.verify(token, process.env.API_KEY);
        req.user = decoded;
        next();
    } catch (ex) {
        if (token != process.env.API_KEY) {
            if (!(bcrypt.compare(token, process.env.API_KEY))) {
                res.status(400).send("Invalid token.");
            }
            else {
                return next();
            }
        }
        else {
            return next();
        }

    }



};
