const dotenv = require("dotenv/config");



module.exports = function (req, res, next) {

    const Origin = req.header("Origin");

    if(Origin==process.env.ORIGIN_URL){
        return next();
    }
    else {
        res.status(400).send("Invalid token.");
    }

};
