const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const http2 = require('http2');
const http2Express = require('http2-express-bridge');
const path = require('path');
const { env } = require('process');

process.setMaxListeners(0);


const app = http2Express(express);

const staticPath = path.join(__dirname, '/uploads');
 

app.use(express.static(staticPath));

const options = {
       key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert'),
    allowHTTP1: true
};



require("./startup/cors")(app);
require("./startup/routes")(app); // Main work here
require("./startup/options")(app);
app.use('/uploads', express.static('uploads'));
require("./startup/prod")(app); // Production JS

app.use((req, res, next) => {

  res.status(400).send("Invalid token.");

});


const db = process.env.db;
  
 
  const server = http2.createSecureServer(options, app);
server.listen(process.env.PORT, () => {
    mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true });

    mongoose.connection.on('connected', () => {     
        console.log('Mongo has connected succesfully PORT ' + process.env.PORT);
      });
   
    
       
  
});
 
