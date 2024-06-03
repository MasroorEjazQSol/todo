const express = require('express'); 
const path = require('path');

process.setMaxListeners(0);
 

const app =  express();

const staticPath = path.join(__dirname, '/uploads');
 

app.use(express.static(staticPath));




require("./startup/cors")(app);
require("./startup/routes")(app); // Main work here
app.use('/uploads', express.static('uploads'));
require("./startup/prod")(app); // Production JS
app.use('/uploads',express.static('uploads'));

app.use((req, res, next) => {

  res.status(400).send("Invalid token.");

});


const port = process.env.PORT || config.get("port");
const server = app.listen(port, () =>
    winston.info(`Listening on port ${port}...`)
);

module.exports = server;

 
