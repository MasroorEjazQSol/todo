const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
//const bcrypt = require('bcryptjs');

class Mongo {
    
    async generate_password(password) {
         const salt = await bcrypt.genSalt(10);
         const bcrypt_password = await bcrypt.hash(password, salt);       
        // const salt = bcrypt.genSaltSync(10);
        // const bcrypt_password = bcrypt.hashSync(password, salt); 
          return bcrypt_password; 
     
    }

    async compare_password(user_password,db_password) {
        console.log('compare_password');
       // return bcrypt.compareSync(user_password, db_password);
        return bcrypt.compare(user_password, db_password);
    }
}

module.exports = new Mongo();