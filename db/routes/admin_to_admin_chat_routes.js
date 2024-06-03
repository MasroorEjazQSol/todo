const { AdminToAdminChat } = require("../models/admin_to_admin_chat_db");
const { Admin } = require("../models/admin_db");
const { AdminChatDetails } = require("../models/admin_chat_details_db");
const { AdminChatArchive } = require("../models/admin_chat_archive_db");
const auth = require("../middleware/auth");
const auth_non_secure = require("../middleware/auth_non_secure");
const express = require("express");
const config = require("config");
const jwt = require('jwt-simple');
let fuzzball = require('fuzzball');
const { ObjectID } = require("mongodb");
const aws = require('aws-sdk');
const multerS3 = require('multer-s3');
var fs = require('fs');
const Db = require("mongodb/lib/db");

aws.config.update({
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    region: process.env.AWS_REGION
});
 
var S3 = new aws.S3();

const router = express.Router();
let flag = 0;

process.on('unhandledRejection', (reason, promise) => {
    //console.log("Reason: ", reason, "promise: ", promise);
});

process.on('warning', e => console.warn(e.stack));

 
router.get("/getAdminChatUnreadCount/:adminID", auth, async (req, res) => {
    const adminID = req.params.adminID; 
   // const company_id = req.params.company_id; 
   const ChatData = await AdminToAdminChat.find({
        $and: [
            { $or: [{ admin_one_id: adminID, admin_one_unread: { $gt: 0 } }, { admin_two_id: adminID, admin_two_unread: { $gt: 0 } }] },        
        ]
    }).select('admin_one_unread admin_two_unread');    
   res.send(ChatData);

}); 


router.post("/updateMainAdminChatMarkAllAsReadMsgs", auth, async (req, res) => {
    const adminID = req.body.adminID;    
    

    try {
        const chatUpdate = await AdminToAdminChat.updateMany({ admin_one_id: adminID }, {
            $set: {
                'admin_one_unread': 0
            }
        });
        const chatUpdate2 = await AdminToAdminChat.updateMany({ admin_two_id: adminID }, {
            $set: {
                'admin_two_unread': 0
            }
        });
        res.send(true);
    }
    catch (e) {
        res.send(false);
    }

}); 


router.delete("/deleteAdminChatRoom/:adminID", auth, async (req, res) => {
    const adminID = req.params.adminID;   
    await AdminToAdminChat.deleteMany({ 'admin_one_id': adminID });
    await AdminToAdminChat.deleteMany({ 'admin_two_id': adminID }); 
    await AdminChatDetails.deleteMany({ 'admin_one_id': adminID });
    await AdminChatDetails.deleteMany({ 'admin_two_id': adminID });
    res.send(true);
}); 

router.get("/getAdminChatList/:adminID/:dept_boolean", auth, async (req, res) => {
    const adminID = req.params.adminID;
    const deptBoolean = req.params.dept_boolean;

    const ChatData2 = await AdminToAdminChat.find({ $or: [{ admin_one_id: adminID }, { admin_two_id: adminID }], isActive: deptBoolean, isBlock: false }).select().sort('-last_msgs_time');
    res.send(ChatData2);



}); 




router.get("/getAdminChatDetails/:chat_id", auth, async (req, res) => {
    const chatID = req.params.chat_id;
 
    let ChatData = await AdminToAdminChat.find({ _id: chatID }).select();
    let ChatData2 = await AdminChatDetails.find({ chat_id: chatID }).select('username messages date usertype');
    let ChatData3 = await AdminChatArchive.find({ chat_id: chatID }).select('_id');
    let ChatArray = [];

    let archive_chat = true;

    if(ChatData3.length==0){
        archive_chat=false;
    }
 
    ChatArray.push(ChatData[0]);
    ChatArray.push(ChatData2[0]);
    ChatArray.push({archive_chat: archive_chat});

     
    
    res.send(ChatArray);
    
}); 


router.post("/closeAdminChat", auth, async (req, res) => {
 
    const chat_id = req.body.chat_id; 
    const close_admin_id = req.body.close_admin_id;

    const ChatData = await AdminToAdminChat.find({ _id: chat_id }).updateMany({ isActive: false, close_admin_id: close_admin_id });

    if (ChatData === undefined || ChatData.length == 0) {
        res.send(false);
    }
    else {
         res.send(true);
    }
});


router.post("/openAdminChat", auth, async (req, res) => {
 
    const chat_id = req.body.chat_id; 
    const close_admin_id = req.body.close_admin_id;

    const ChatData = await AdminToAdminChat.find({ _id: chat_id }).select('close_admin_id');
    let adminID = ChatData[0].close_admin_id;
     
 

    if (close_admin_id == adminID) {
        await AdminToAdminChat.find({ _id: chat_id }).updateMany({ isActive: true, close_admin_id: '' });
        res.send(true);
    }

    else {
        res.send(false);
    }
 
}); 


router.post("/updateAdminChatUnreadMsgs", auth, async (req, res) => { 
    const receive_id = req.body.receive_id;
    const send_id = req.body.send_id; 
 

    try {
        const chatUpdate2 = await AdminChat.updateMany({ receive_id: receive_id, send_id: send_id }, {
            $inc: {
                'unread_msgs': 1
            }
        });
       
        if (chatUpdate2 === undefined || chatUpdate2.length == 0) {
            res.send(false);
        }
        else {
            res.send(true);
        }
    }
    catch (e) {
        res.send(false);
    }

}); 

router.post("/updateMainAdminChatMarkAllAsReadMsgs", auth, async (req, res) => {
    const adminID = req.body.adminID;

  

    try {
        const chatUpdate = await AdminChat.updateMany({ receive_id: adminID }, {
            $set: {
                'unread_msgs': 0
            }
        });
        res.send(chatUpdate);
        if (chatUpdate === undefined || chatUpdate.length == 0) {
            res.send(false);
        }
        else {
            res.send(true);
        }
    }
    catch (e) {
     
    }

}); 

 

router.post("/updateChat", auth, async (req, res) => {
    
  //  try {
        const chat_id = req.body.chatID;
        const last_msgs_user = req.body.username;
        let last_msgs_msg = req.body.last_message;         
        const user_msg = req.body.message;
        const last_msgs_date = req.body.chatDate;
        const last_msgs_time = Date.now();
        const admin_id = req.body.admin_id; 

        if (last_msgs_msg.length > 18) {
            let dots = "...";
            last_msgs_msg = last_msgs_msg.substring(0, 18) + dots;
        }

        let ChatData = await AdminToAdminChat.find({ admin_one_id: admin_id, _id: ObjectID(chat_id) }).select('_id');
        let chk_length = ChatData.length;



        await AdminChatDetails.updateMany({ chat_id: chat_id }, {
            $push: {
                username: last_msgs_user,
                messages: user_msg,
                date: last_msgs_date,
                usertype: admin_id
            }
        }

        );


        if (parseInt(chk_length) > 0) {
            //2
            await AdminToAdminChat.updateMany({ _id: ObjectID(chat_id) }, {
                $inc: {
                    'admin_two_unread': 1
                },
                $set: {
                    'admin_one_unread': 0,
                    'last_msgs_user': last_msgs_user,
                    'last_msgs_msg': last_msgs_msg,
                    'last_msgs_date': last_msgs_date,
                    'last_msgs_time': last_msgs_time
                }
            });

        }

        else {
            
            await AdminToAdminChat.updateMany({ _id: ObjectID(chat_id) }, {
                $inc: {
                    'admin_one_unread': 1
                },
                $set: {
                    'admin_two_unread': 0,
                    'last_msgs_user': last_msgs_user,
                    'last_msgs_msg': last_msgs_msg,
                    'last_msgs_date': last_msgs_date,
                    'last_msgs_time': last_msgs_time
                }
            });
        }


    const adminID = admin_id;
 

    const ChatData2 = await AdminToAdminChat.find({ $or: [{ admin_one_id: adminID }, { admin_two_id: adminID }], isActive: true, isBlock: false }).select().sort('-last_msgs_time');
    res.send(ChatData2);

     //   res.send(true);

  //  }


   // catch (e) { res.send(false); }

}); 


router.post("/updateFilesChat", auth, async (req, res) => { 

    //  try { 
          const chat_id = req.body.chatID;
          const last_msgs_user = req.body.username;
          let last_msgs_msg = 'Attachment';         
          const file = req.body.file;
          const last_msgs_date = req.body.chatDate;
          const last_msgs_time = Date.now();
          const admin_id = req.body.admin_id; 
          const filenames_array = req.body.filenames_array; 
      

          for(let j=0;j<parseInt(filenames_array.length);j++){
            let delete_filename=filenames_array[j][0];
     
  
            if(process.env.AWS_UPLOAD!=='TRUE'){
       
                await AdminChatDetails.updateMany({ chat_id: chat_id }, {
                    $push: {
                        local_filename: delete_filename
                    }
                }
        
                );

           
            }

            if(process.env.AWS_UPLOAD==='TRUE'){
            
                await AdminChatDetails.updateMany({ chat_id: chat_id }, {
                    $push: {
                        aws_filename: delete_filename
                    }
                }
        
                );

            }
            
             
         }

          for(let i=0;i<parseInt(file.length);i++){
              let filename=file[i].file;
          
 
  
          
  
          await AdminChatDetails.updateMany({ chat_id: chat_id }, {
              $push: {
                  username: last_msgs_user,
                  messages: filename,
                  date: last_msgs_date,
                  usertype: admin_id
              }
          }
  
          );
  
        }

        let ChatData = await AdminToAdminChat.find({ admin_one_id: admin_id, _id: ObjectID(chat_id) }).select('_id');
          let chk_length = ChatData.length;
          let file_length = parseInt(file.length);

          if (parseInt(chk_length) > 0) {
          
              await AdminToAdminChat.updateMany({ _id: ObjectID(chat_id) }, {
                  $inc: {
                      'admin_two_unread': file_length
                  },
                  $set: {
                      'admin_one_unread': 0,
                      'last_msgs_user': last_msgs_user,
                      'last_msgs_msg': last_msgs_msg,
                      'last_msgs_date': last_msgs_date,
                      'last_msgs_time': last_msgs_time
                  }
              });
  
          }
  
          else {
              
              await AdminToAdminChat.updateMany({ _id: ObjectID(chat_id) }, {
                  $inc: {
                      'admin_one_unread': file_length
                  },
                  $set: {
                      'admin_two_unread': 0,
                      'last_msgs_user': last_msgs_user,
                      'last_msgs_msg': last_msgs_msg,
                      'last_msgs_date': last_msgs_date,
                      'last_msgs_time': last_msgs_time
                  }
              });
          }
  
  
      const adminID = admin_id;
   
  
      const ChatData2 = await AdminToAdminChat.find({ $or: [{ admin_one_id: adminID }, { admin_two_id: adminID }], 
        isActive: true, isBlock: false }).select().sort('-last_msgs_time');
      res.send(ChatData2);
  
        
         

    //  }
  
  
     // catch (e) { res.send(false); }
  
  }); 





router.post("/deleteAdminChat", auth, async (req, res) => {

    const chat_id = req.body.chat_id;

    let local_filename = await AdminChatDetails.find({ chat_id: chat_id }).select('local_filename aws_filename');

      if(parseInt(local_filename.length)>0){
          
        let delete_filename = local_filename[0].aws_filename;
   
        if(parseInt(delete_filename.length)>0){ 
         
            let length = delete_filename.length;
            let objects = [];
    
            for(let i=0;i<parseInt(length);i++){
                let filename=await delete_filename[i];             
                objects.push({Key : filename});
               
            }
              
            var options = {
                Bucket: process.env.S3_BUCKET_NAME,
                Delete: {
                  Objects: objects
                }
              };
           
              S3.deleteObjects(options, function(err, data) {
          //      if (err) console.log(err, err.stack); // an error occurred
          //      else     console.log(data);           // successful response
             });
        }

       
        
    } 
   
 
    if(parseInt(local_filename.length)>0){
         
        let delete_filename = local_filename[0].local_filename;
         
        if(parseInt(delete_filename.length)>0){
           
            for(let i=0; i<parseInt(delete_filename.length); i++){
                console.log(i);
                let dir = 'uploads';
            
        
                let file = dir + "/" + delete_filename[i];
                console.log(file);
        
               if (fs.existsSync(file)) {
               
               try {
                   fs.unlinkSync(file);
               }
           
               catch(e){
                   console.log(e);
               } 
            }
            }
        }
       
    } 
 
  

 
    await AdminChatArchive.findOneAndDelete({ chat_id: chat_id });
    

    await AdminChatDetails.updateMany({ chat_id: chat_id }, {
        $set: {
            'username': [],
            'messages': [],
            'date': [],
            'usertype': [],
            'local_filename': [],
            'aws_filename': []
        }
    });

    await AdminToAdminChat.updateMany({ _id: chat_id }, {
        $set: {
            'last_msgs_user': '',
            'last_msgs_msg': '',
            'last_msgs_date': '',
            'last_msgs_time': '',
            'admin_one_unread': 0,
            'admin_two_unread': 0
        }
    });

  

    res.send(true);

}); 




router.post("/searchAdminChatDeptList", auth, async (req, res) => {
    const search_keyword = req.body.keyword.toLowerCase();
    const admin_id = req.body.admin_id;
    const admin_id_two = req.body.admin_id_two;
    const admin_id_temp = req.body.admin_id_temp;
    const company_id = req.body.company_id;

    let chat_id_array = [];
    let foundSearch = [];
    let ChatData = '';
    let ChatData2 = '';

    if (admin_id == 'all' && admin_id_two == 'all') {
        ChatData = await AdminChatDetails.find({ 
            company_id: company_id,
            messages: { $exists: true, $ne: [] } 
        }).select('chat_id admin_one_id admin_two_id admin_one_username').sort('-last_msgs_time');   
    }
    
    if (admin_id != 'all' && admin_id_two == 'all') {
        ChatData = await AdminChatDetails.find({ 
            company_id: company_id,
            $or: [{ admin_one_id: admin_id }, { admin_two_id: admin_id }], 
            messages: { $exists: true, $ne: [] } 
        }).select('chat_id').sort('-last_msgs_time');
    }
    
    if (admin_id == 'all' && admin_id_two != 'all') {
        ChatData = await AdminChatDetails.find({ 
            company_id: company_id,
            $or: [{ admin_one_id: admin_id_two }, { admin_two_id: admin_id_two }], 
            messages: { $exists: true, $ne: [] } 
        }).select('chat_id').sort('-last_msgs_time');
    }
    
    if (admin_id != 'all' && admin_id_two != 'all') {
        ChatData = await AdminChatDetails.find({ 
            company_id: company_id,
            $and: [{ admin_one_id: admin_id }, { admin_two_id: admin_id_two }], 
            messages: { $exists: true, $ne: [] } 
        }).select('chat_id').sort('-last_msgs_time');
    
        if (ChatData.length <= 0) {
            ChatData = await AdminChatDetails.find({ 
                company_id: company_id,
                $and: [{ admin_one_id: admin_id_two }, { admin_two_id: admin_id }], 
                messages: { $exists: true, $ne: [] } 
            }).select('chat_id').sort('-last_msgs_time');
        }
    }

    ChatData.map(Items => {
        chat_id_array.push(Items.chat_id);
    });

 

    ChatData2 = await AdminChatDetails.find({$and: 
         [{messages: { '$regex': search_keyword, $options: 'is' }},
     { "chat_id" : { $in : chat_id_array}}]}).select().sort('-last_msgs_time'); 

    foundSearch.push(ChatData2); 


    ChatData2 = await AdminChatArchive.find({$and: 
                [{messages: { '$regex': search_keyword, $options: 'is' }},
    { "chat_id" : { $in : chat_id_array}}]}).select().sort('-last_msgs_time'); 
      
    foundSearch.push(ChatData2); 

    res.send(foundSearch);

   
 
}); 


  

router.post("/getAdminChatID", auth, async (req, res) => {

    const receive_id = req.body.receive_id;
    const send_id = req.body.send_id;

    try {
        const chatUpdate2 = await AdminChat.find({ receive_id: receive_id, send_id: send_id }).select('_id');
        //  res.send(result);
        if (chatUpdate2 === undefined || chatUpdate2.length == 0) {
            res.send(false);
        }
        else {
            res.send(chatUpdate2);
        }
    }
    catch (e) {
        res.send(false);
    }

}); 

 


module.exports = router;