module.exports = function (app) {
    app.options('*', function (req, res) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET,PUT,HEAD,POST,PATCH');
        res.header('Access-Control-Allow-Headers',
            'Authorization,Origin,Referer,Content-Type,Accept,User-Agent');
        res.sendStatus(200);
        res.end(); 
    });
};