const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const dotenv = require("dotenv/config");

const fileFilter = (req, file, callback) => {
    const fileSize = parseInt(req.headers['content-length']);

    if (parseInt(fileSize) > 200000) {
        //   console.log('fail');
        callback(null, false);
    }

    else if (file.mimetype === 'application/pdf') {
        callback(null, true);
    }
    else {
        callback(new Error('Error:Invalid mime type on jpeg or png is allowed'), false);
    }
};

aws.config.update({
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    region: process.env.AWS_REGION
});

var s3 = new aws.S3();

var upload = multer({
    fileFilter: fileFilter,
    storage: multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET_NAME,
        acl: 'public-read',
        metadata: function (req, file, cb) {
            //  cb(null, { fieldName: file.fieldname });
            cb(null, { fieldName: 'TICKETTING-APP' });
        },
        key: function (req, file, cb) {
            cb(null, Date.now().toString()+".pdf")
        },        
        ContentType: 'application/pdf', // from `mimetype`
    })
});
 
module.exports = upload;