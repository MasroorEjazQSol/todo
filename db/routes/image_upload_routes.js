const auth = require("../middleware/auth");
const auth_socket = require("../middleware/auth_socket");
const express = require("express");
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const aws = require('aws-sdk');
const multerS3 = require('multer-s3');
const router = express.Router(); 
var fs = require('fs');
const path = require( 'path' );
const { decode } = require('quoted-printable');


aws.config.update({
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    region: process.env.AWS_REGION
});
  
var S3 = new aws.S3();

let dateObj = new Date();
let day = dateObj.getUTCDate();
let year = dateObj.getUTCFullYear().toString().substr(-2);
let file_rename_value = Math.floor(Math.random() * 100000)+day+year+Math.floor(Math.random() * 100000); 

process.on('unhandledRejection', (reason, promise) => {
    //console.log("Reason: ", reason, "promise: ", promise);
});

process.on('warning', e => console.warn(e.stack));

const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, 'uploads/');
    },
    filename: function (req, file, callback) {
        let filename_rename = uuidv4();
        callback(null, filename_rename + file.originalname);
    }
});

const fileFilter = (req, file, callback) => {
    const fileSize = parseInt(req.headers['content-length']);
 

    if (parseInt(fileSize) > 2048000) {   
        callback(null, false);

    }

    else if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/x-ms-wma' || file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.mimetype === 'application/msword' || file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.mimetype === 'application/vnd.ms-excel' || file.mimetype === 'audio/wav' || file.mimetype === 'application/vnd.ms-powerpoint' || file.mimetype === 'video/mp4' || file.mimetype === 'application/x-zip-compressed' || file.mimetype === 'application/octet-stream' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'application/pdf') {
        callback(null, true);
    }
    else {
        callback(new Error('Error:Invalid mime type on jpeg or png is allowed'), false);
    }
};


const upload = multer({ storage: storage, fileFilter: fileFilter });

const fileFilterAWS = (req, file, callback) => {
    const fileSize = parseInt(req.headers['content-length']);

    if (parseInt(fileSize) > 200000) {
        //   console.log('fail');
        callback(null, false);
    }

    else if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'application/pdf') {
        callback(null, true);
    }
    else {
        callback(new Error('Error:Invalid mime type on jpeg or png is allowed'), false);
    }
};
 
router.post("/uploadImage", async (req, res) => {

    const upload = await require('../services/file-upload'); 
    const singleUpload = await upload.single('appImage');

    singleUpload(req, res, async (err) => {
        
        if(err!==undefined){
            return false;
        }

        if (err) {
            return res.status(422).send({ Error: 'Invalid mime type. Only jpeg or png is allowed' });
        }

        try { 
            if(req.file.location){
                return res.json({ 'imageURL': req.file.location });
            }
        }
       
        catch(e){       
            console.log(e);  
            return false;
        }

    });

});


router.post("/uploadPDF", async (req, res) => {

    const upload = await require('../services/file-upload-pdf');
    const singleUpload = await upload.single('appImage');

    singleUpload(req, res, async (err) => {
      
        if(err!==undefined){
            return false;
        }

        if (err) {
            return res.status(422).send({ Error: 'Invalid mime type. Only PDF is allowed' });
        }

        try { 
            return res.json({ 'pdfURL': req.file.location });
        }
       
        catch(e){     
            console.log(e);      
            return false;
        }

    });

});

const local_storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, 'uploads/');
    },
    filename: function (req, file, callback) {
        let filename_rename = uuidv4();
        let file_length=parseInt(file.originalname.split(".").length)-1;
        let files_type = file.originalname.split(".")[file_length];
        callback(null, filename_rename + "." + files_type);
    }
});

const local_storage_small = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, 'uploads/');
    },
    filename: function (req, file, callback) {    
        file_rename_value = Math.floor(Math.random() * 100000)+day+year+Math.floor(Math.random() * 100000); 
        let img_split = file.originalname.split('.');
        let length = parseInt(img_split.length)-1;
        let filename_rename = file_rename_value+"-small."+img_split[length];
        callback(null, filename_rename);
    }
});

const local_storage_large = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, 'uploads/');
    },
    filename: function (req, file, callback) {
        file_rename_value = Math.floor(Math.random() * 100000)+day+year+Math.floor(Math.random() * 100000); 
        let img_split = file.originalname.split('.');
        let length = parseInt(img_split.length)-1;
        let filename_rename = file_rename_value+"-large."+img_split[length];
        callback(null, filename_rename);
    }
});

const local_fileFilter = (req, file, callback) => {
    const fileSize = parseInt(req.headers['content-length']);
   

    if (parseInt(fileSize) > 20480000) {
 
        callback(null, false);   
    }

    else if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/x-ms-wma' || file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.mimetype === 'application/msword' || file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.mimetype === 'application/vnd.ms-excel' || file.mimetype === 'audio/wav' || file.mimetype === 'application/vnd.ms-powerpoint' || file.mimetype === 'video/mp4' || file.mimetype === 'application/x-zip-compressed' || file.mimetype === 'application/octet-stream' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'application/pdf') {
      
        callback(null, true);
    }
    else {
  
        callback(null, false);
    }
};  

const local_upload = multer({ storage: local_storage, fileFilter: local_fileFilter });
const local_upload_small = multer({ storage: local_storage_small, fileFilter: local_fileFilter });
const local_upload_large = multer({ storage: local_storage_large, fileFilter: local_fileFilter });


router.post('/uploadBulkFiles', local_upload.array('imgCollection'), (req, res, next) => {
 
    const reqFiles = []; 
    for (var i = 0; i < req.files.length; i++) {
        reqFiles.push(req.files[i].filename)
    }

     res.send(reqFiles);
})

router.post("/localuploadSmallImage", local_upload_small.single('smallappImage'), auth, async (req, res) => {


    if (req.file == null) {
        res.send(false);
    }

    else {
        res.send(req.file.filename);
    }

}); 

router.post("/localuploadLargeImage", local_upload_large.single('appImage'), auth, async (req, res) => {


    if (req.file == null) {
        res.send(false);
    }

    else {
        res.send(req.file.filename);
    }

}); 

router.post("/localuploadImage", local_upload.single('appImage'), auth, async (req, res) => {


    if (req.file == null) {
        res.send(false);
    }

    else {
        res.send(req.file.filename);
    }

}); 

router.post("/deleteAttachments", auth, async (req, res) => { 
  
    let dir = 'uploads';
    let filename = req.body.img_name;
    let file = dir + "/" + filename;

    if (fs.existsSync(file)) {
    
    try {
        fs.unlinkSync(file);
    }

    catch(e){
        console.log(e);
    }
    }   

}); 

router.post("/deleteAttachmentsArray", auth, async (req, res) => { 
  
    let dir = 'uploads';
    let filename = req.body.filenames_array;
   
    
    for(let i=0;i<parseInt(filename.length);i++){
       let delete_filename=filename[i][0];
       let file = dir + "/" + delete_filename;

       if (fs.existsSync(file)) {
       
       try {
           fs.unlinkSync(file);
       }
   
       catch(e){
           console.log(e);
       }
       }  
    }
    
    

}); 

router.post("/deleteAttachmentsAWS", auth, async (req, res) => { 
   
    let filename = req.body.filename;   
     
    try {
        await S3.deleteObject({ Bucket: process.env.S3_BUCKET_NAME, Key: filename }).promise();
        return { success: true, data: "File deleted Successfully" }
      } catch(error) {
        return { success: false, data: null }
      }



}); 

router.post("/deleteAttachmentsArrayAWS", auth, async (req, res) => { 
   
    let filenames_array = req.body.filenames_array;   
 
    let length = filenames_array.length;
    let objects = [];

    for(let i=0;i<parseInt(length);i++){
        let filename=await filenames_array[i][0];
        objects.push({Key : filename});
       
    }
     
    var options = {
        Bucket: process.env.S3_BUCKET_NAME,
        Delete: {
          Objects: objects
        }
      };
   
      S3.deleteObjects(options, function(err, data) {
      //  if (err) console.log(err, err.stack); // an error occurred
      //  else     console.log(data);           // successful response
     });


}); 

const uploadsBusinessGallery = multer({
	storage: multerS3({
        fileFilter: fileFilter,
		s3: S3,
		bucket: process.env.S3_BUCKET_NAME,
		acl: 'public-read',
		key: function (req, file, cb) {
			cb( null, path.basename( file.originalname, path.extname( file.originalname ) ) + '-' + Date.now() + path.extname( file.originalname ) )
		}
	}), 	 
}).array( 'galleryImage');

router.post('/multipleFileUploadAWS', ( req, res ) => {
	uploadsBusinessGallery( req, res, ( error ) => {
	//	console.log( 'files', req.files );
		if( error ){
			console.log( 'errors', error );
			res.json( { error: error } );
		} else {
			// If File not found
			if( req.files === undefined ){
			//	console.log( 'Error: No File Selected!' );
				res.json( 'Error: No File Selected' );
			} else {
				// If Success
				let fileArray = req.files,
					fileLocation;
				const galleryImgLocationArray = [];
				for ( let i = 0; i < fileArray.length; i++ ) {
					fileLocation = fileArray[ i ].location;
				//	console.log( 'filenm', fileLocation );
					galleryImgLocationArray.push( fileLocation )
				}
				// Save the file name into database
				res.json( {
					filesArray: fileArray,
					locationArray: galleryImgLocationArray
				} );
			}
		}
	});
});

const uploadPath = path.join(__dirname, '../uploads');
 
router.post('/convert_7bitstring_to_pdf', auth_socket , async (req, res) => {

 

    // try {
    //     const { fileName, sevenBitString } = req.body;

    //     if (!fileName || !sevenBitString) {
    //         return res.status(400).send('Missing fileName or sevenBitString');
    //     }

    //     // Decode the 7-bit string to binary data
    //     const decodedData = decode(sevenBitString);

    //     // Generate a unique filename for the PDF
    //     const originalFilename = fileName.split('.')[0];
    //     const renameFilename = `${originalFilename}_${Date.now()}.pdf`;

    //     // Create a file path for the PDF on your server
    //     const filePath = path.join(__dirname, '../uploads', renameFilename).trim();

    //     // Write the decoded binary data to a PDF file
    //     fs.writeFileSync(filePath, decodedData);

    //     // Upload the PDF file to AWS S3
    //     try {
    //         const uploadParams = {
    //             Bucket: process.env.S3_BUCKET_NAME,
    //             Key: renameFilename,
    //             Body: fs.createReadStream(filePath),
    //             ACL: 'public-read' // Set ACL to public-read for making the file publicly accessible
    //         };

    //         const uploadResult = await S3.upload(uploadParams).promise();

    //         // Delete the temporary PDF file from your server
    //         fs.unlinkSync(filePath);

    //         // Send the URL of the uploaded PDF file in the response
    //         res.send({ imageURL: uploadResult.Location });
    //     } catch (error) {
    //         console.error(error);
    //         res.status(500).send('Error uploading PDF file to AWS S3');
    //     }
    // } catch (error) {
    //     console.error(error);
    //     res.status(500).send('Internal server error');
    // }


    try {
        const { fileName, sevenBitString } = req.body;

        if (!fileName || !sevenBitString) {
            return res.status(400).send('Missing fileName or sevenBitString');
        }

        // Decode the 7-bit string to binary data
        const decodedData = decode(sevenBitString);

        // Generate a unique filename for the PDF
        const originalFilename = fileName.split('.')[0];
        const renameFilename = `${originalFilename}_${Date.now()}.pdf`;

        // Create a file path for the PDF on your server
        const filePath = path.join(uploadPath, renameFilename).trim();

        // Write the decoded binary data to a PDF file
        fs.writeFileSync(filePath, decodedData);

        // Construct the URL to the PDF file
        const fileURL = image_upload_path + renameFilename;

        // Send the URL of the saved PDF file in the response
        res.send({ imageURL: fileURL });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
    }
});
 


router.post('/convert_pdf_img_from_base64', auth_socket, async (req, res) => {
    // try {
    //     const { base64string, file_name } = req.body;

    //     if (!base64string) {
    //         return res.status(400).send('Missing base64string');
    //     }

    //     // Convert base64 string to binary data
    //     const data = Buffer.from(base64string, 'base64');

    //     // Generate a unique filename
    //     const originalFilename = file_name.split('.')[0];
    //     const renameFilename = originalFilename + '-' + Date.now() + '.' + file_name.split('.').pop();

    //     // Create a file path for the image on your server
    //     const filepath = path.join(__dirname, '../uploads', renameFilename).trim();

    //     // Write the binary data to a file
    //     fs.writeFile(filepath, data, 'binary', async (err) => {
    //         if (err) {
    //             console.error(err);
    //             return res.status(500).send(err);
    //         }

    //         // Upload the file to AWS S3
    //         try {
    //             const uploadParams = {
    //                 Bucket: process.env.S3_BUCKET_NAME,
    //                 Key: renameFilename,
    //                 Body: fs.createReadStream(filepath),
    //                 ACL: 'public-read' // Set ACL to public-read for making the file publicly accessible
    //             };

    //             const uploadResult = await S3.upload(uploadParams).promise();

    //             // Delete the temporary file from your server
    //             fs.unlinkSync(filepath);

    //             // Send the URL of the uploaded image in the response
    //             res.send({ imageURL: uploadResult.Location });
    //            // console.log(uploadResult.Location);
    //         } catch (error) {
    //             console.error(error);
    //             res.status(500).send('Error uploading image to AWS S3');
    //         }
    //     });
    // } catch (error) {
    //     console.error(error);
    //     res.status(500).send('Internal server error');
    // }
    try {
        const { base64string, file_name, image_upload_path } = req.body;

        if (!base64string) {
            return res.status(400).send('Missing base64string');
        }

        // Convert base64 string to binary data
        const data = Buffer.from(base64string, 'base64');

        // Generate a unique filename
        const originalFilename = file_name.split('.')[0];
        const renameFilename = originalFilename + '-' + Date.now() + '.' + file_name.split('.').pop();

        // Create a file path for the image on your server
        const filepath = path.join(uploadPath, renameFilename).trim();

        // Write the binary data to a file
        fs.writeFile(filepath, data, 'binary', async (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send(err);
            }

            // Construct the URL to the file
            const fileURL = image_upload_path + renameFilename;

            // Send the URL of the uploaded image in the response
            res.send({ imageURL: fileURL });
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
    }
});



module.exports = router;