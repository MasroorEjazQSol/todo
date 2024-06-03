const express = require('express'); 
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

process.setMaxListeners(0);
 

const app =  express();

const staticPath = path.join(__dirname, '/uploads');
 

app.use(express.static(staticPath));

// increase the limit to 100 MB
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));


 

require("./startup/cors")(app);
require("./startup/routes")(app); // Main work here
app.use('/uploads', express.static('uploads'));
require("./startup/prod")(app); // Production JS
app.use('/uploads',express.static('uploads'));

app.use((req, res, next) => {

  res.status(400).send("Invalid token.");

});

const db = process.env.db;
const port = process.env.PORT || config.get("port");
app.listen(process.env.PORT, () => {
    mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true });

    mongoose.connection.on('connected', () => {     
        console.log('Mongo has connected succesfully PORT ' + port);
      });
    });


 
