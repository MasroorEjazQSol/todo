const jwt = require('jsonwebtoken');
const config = require("config");
const dotenv = require("dotenv/config");


module.exports = function (req, res, next) {

    const Origin = req.header("Origin");


    if(Origin==process.env.ORIGIN_URL){
       
    

    const token = req.header("x-auth-token");
    if (!token) return res.status(401).send("Access denied. No token provided.");

    try {
        const decoded = jwt.verify(token, process.env.API_KEY);
        req.user = decoded;
        next();
    } catch (ex) {
        res.status(400).send("Invalid token.");
    }
    }
};