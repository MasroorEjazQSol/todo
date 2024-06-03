const { Dept, validate } = require("../models/dept_db");
const { Admin } = require("../models/admin_db");
const { Chat } = require("../models/chat_db");
const { ChatDetails } = require("../models/chat_details_db");
const { ChatClose } = require("../models/chat_close_db");
const { User } = require("../models/user_db");
const auth = require("../middleware/auth");
const auth_non_secure = require("../middleware/auth_non_secure");
const express = require("express"); 
const router = express.Router();
var ObjectId = require('mongodb').ObjectID;
var fs = require('fs');
const aws = require('aws-sdk');
const multerS3 = require('multer-s3');

// Remove the unique index on the dept_name field
// Dept.collection.dropIndex({ dept_name: 1 }, (err, result) => {
//     if (err) {
//         console.error('Error dropping index:', err);
//     } else {
//         console.log('Index dropped successfully.');
//     }
// });

aws.config.update({
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    region: process.env.AWS_REGION
});
 
var S3 = new aws.S3();

process.on('unhandledRejection', (reason, promise) => {
    //console.log("Reason: ", reason, "promise: ", promise);
});

process.on('warning', e => console.warn(e.stack));

router.get("/getDeptUnread/:adminID/:masterAdmin/:company_id", auth, async (req, res) => {
    const adminID = req.params.adminID;
    const masterAdmin = req.params.masterAdmin;
    const company_id = req.params.company_id;
    let DeptData;

    
    if(masterAdmin==='true'){    
        DeptData = await Dept.find({company_id:company_id}).select('unread_msgs');
    }

    if(masterAdmin==='false'){ 
        DeptData = await Dept.find({ company_id:company_id, 'dept_admin': adminID }).select('unread_msgs');
    }

    res.send(DeptData);
});

router.get("/getDeptWithAdminID/:adminID", auth, async (req, res) => {
    const adminID = req.params.adminID;
    const DeptData = await Dept.find({ 'dept_admin': adminID }).select('dept_name dept_desc _id unread_msgs demo_mode').sort({ dept_name: 1 });
    res.send(DeptData);
});

router.get("/getDeptWithMasterAdmin/:company_id", auth, async (req, res) => {
    let company_id = req.params.company_id;
    const DeptData = await Dept.find({company_id:company_id}).select('dept_name dept_desc _id unread_msgs demo_mode').sort({ dept_name: 1 });
    res.send(DeptData);
}); 


router.get("/getAdminDeptAssign/:DeptID", auth, async (req, res) => { 
     
    const DeptID = req.params.DeptID;
    const DeptData = await Dept.find({ _id: DeptID }).select('dept_admin');

    if (DeptData === undefined || DeptData.length == 0) {
        res.send(false);
    }

    else {
        res.send(DeptData);
    }
}); 


router.get("/getDeptForAdminChat/:adminID", auth, async (req, res) => {
    const adminID = req.params.adminID;
    const DeptData = await Dept.find({ 'isAdminOnly': 'true', 'dept_admin': { $ne: adminID } });
    res.send(DeptData);
}); 
 
 
router.post("/addNewDept", auth, async (req, res) => {
    const deptName = req.body.dept_name; 
    const adminID = req.body.dept_admin;
    const company_id = req.body.company_id;

    const DeptData = await Dept.find({ company_id: company_id, dept_name: deptName }).select();

    if(DeptData.length>0){
        res.send(false);
        return;
    }


    const dept = new Dept({
        dept_name: deptName, 
        dept_admin: [adminID],
        company_id: company_id
    });

    try {
        await dept.save();
        res.send(true);
    }
    catch (e) {
        console.log(e);
        res.send(false);
    }

}); 


router.post("/editDept", auth, async (req, res) => {
    const deptName = req.body.dept_name; 


    try {
        const deptID = ObjectId(req.body.dept_id);
        const deptUpdate = await Dept.updateMany({ _id: deptID }, {
            $set: {
                'dept_name': deptName 
            }
        });
        //  res.send(result);
        if (deptUpdate === undefined || deptUpdate.length == 0) {
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


router.delete("/removeDept/:dept_id", auth, async (req, res) => { 

    let chat_delete_array = [];
    let user_delete_array = [];
    
    const dept_id = req.params.dept_id;
    
    try {
        
        const ChatData2 = await Chat.find({ dept_id: dept_id, isActive: true }).select('isActive');
        let ChatDataChk = ChatData2.length;

        if (parseInt(ChatDataChk) > 0) {
            res.send(false);
            return;
        }
     

        let ChatData = await ChatClose.find({dept_id:dept_id}).select('_id user_id');
 

        ChatData.forEach(Items => {         
            let chat_id = Items._id.toString(); 
            let user_id = Items.user_id.toString(); 
            chat_delete_array.push(chat_id); 
            user_delete_array.push(user_id);
        });

      


        for(let i=0;i<parseInt(chat_delete_array.length);i++){
            let chat_id=chat_delete_array[i];
            let ChatDataDetails = await ChatDetails.find({chat_id:chat_id}).select('local_filename aws_filename');
            
            for(let l=0;l<parseInt(ChatDataDetails[0].local_filename.length);l++){
                let delete_filename_temp = ChatDataDetails[0].local_filename[l];
                

                let dir = 'uploads';
        
          
                let file = dir + "/" + delete_filename_temp;
           
    
                if (fs.existsSync(file)) {
           
                try {
                    fs.unlinkSync(file);
                }
       
                    catch(e){
                        console.log(e);
                } 
                 } }
 
                let delete_filename = ChatDataDetails[0].aws_filename;
              
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
               // if (err) console.log(err, err.stack); // an error occurred
            //   else     console.log(data);           // successful response
             });
             
  
        
            await ChatDetails.findOneAndDelete({ chat_id: chat_id });
           await ChatClose.findOneAndDelete({ _id: chat_id });
        }
    

    await Dept.findOneAndDelete({ _id: dept_id });
   
    res.send(true);

    }

    catch(e){}

}); 

router.post("/addDeptAdmin", auth, async (req, res) => {
    const adminID = req.body.adminID;
    const deptID = ObjectId(req.body.deptID);

    const addDeptAdmin = await Dept.updateMany({ _id: deptID }, {
        $push: {
            'dept_admin': adminID
        }
    });

    if (addDeptAdmin) {
        res.send("Dept Admin Added");
    }
    else {
        res.send("Dept Admin Not Added");
    }
});


router.post("/removeDeptAdmin", auth, async (req, res) => {
    const adminID = req.body.adminID;
    const deptID = ObjectId(req.body.deptID);


    const removeDeptAdmin = await Dept.updateMany({ _id: deptID }, {
        $pull: {
            'dept_admin': adminID
        }
    });

    if (removeDeptAdmin) {
        res.send("Dept Admin Removed");
    }
    else {
        res.send("Dept Admin Not Removed");
    }
}); 


router.post("/updateDeptUnreadMsgs", auth, async (req, res) => {
    const deptID = ObjectId(req.body.deptID);
    


    try {
        const deptUpdate = await Dept.updateMany({ _id: deptID }, {
            $inc: {
                'unread_msgs': '1'
            }
        });

        if (deptUpdate) {
            res.send(true);
            
        }
        else {
            res.send(false);
        }
    }
    catch (e) {
        res.send(e.message);
    }

}); 


router.post("/updateDeptReadMsgs", auth, async (req, res) => {
    const deptID = ObjectId(req.body.deptID);
    let unread_msgs_dec = parseInt(req.body.unread_msgs) * -1;
    const DeptData = await Dept.find({ '_id': deptID }).select('unread_msgs');
   
   

    try {
        const deptUpdate = await Dept.updateMany({ _id: deptID }, {
            $inc: {
                'unread_msgs': unread_msgs_dec
            }
        });
         
        await Dept.updateMany({ _id : deptID, unread_msgs: { $lt: 0 } }, { 'unread_msgs': 0 });
        
        res.send(true);
    }
    catch (e) {
        res.send(e.message);

    }


}); 
 

router.get("/addDeptAdminOnly/:deptID", auth, async (req, res) => {
    const deptID = ObjectId(req.params.deptID);
    const DeptData = await Dept.updateMany({ _id: deptID }, { 'isAdminOnly' : 'true' });
    res.send(DeptData);
}); 


router.get("/removeDeptAdminOnly/:deptID", auth, async (req, res) => {
    const deptID = ObjectId(req.params.deptID);
    const DeptData = await Dept.updateMany({ _id: deptID }, { 'isAdminOnly': 'false' });
    res.send(DeptData);
}); 

router.get("/getChatTransferDept/:deptID", auth, async (req, res) => {

    if (req.params.deptID!=0) { 
        let deptID = ObjectId(req.params.deptID);
        const DeptData = await Dept.find({ _id: { $ne: deptID } }).select('_id dept_name');
        res.send(DeptData); 
    }
     
}); 

router.get("/getDeptName/:deptID", auth, async (req, res) => {

    if (req.params.deptID!=0) { 
        try {
            let deptID = ObjectId(req.params.deptID);
            let DeptData = await Dept.find({ _id: deptID }).select('_id dept_name');       
            res.send(DeptData); 
        }
        catch(e){
            let DeptData = [];
            res.send(DeptData); 
        }
        
    }
     
}); 


router.get("/getAllDeptForUser", auth, async (req, res) => {
    const DeptData = await Dept.find().select('_id dept_name');
    res.send(DeptData);
}); 


router.post("/searchDept", auth, async (req, res) => {

    const search_keyword = req.body.keyword;

     let DeptData = await Dept.find({$or:[{dept_name: { '$regex': search_keyword, $options: 'is' }}] }).select(); 

    res.send(DeptData);
}); 


router.put("/updateDeptAllReadMsgs/:adminID", auth, async (req, res) => {
    const adminID = req.params.adminID;
    const DeptData = await Dept.find({ dept_admin: adminID }).select('_id');
    let IDs = [];
    let IDToString = [];
    DeptData.map(Items => {
        IDs.push(Items._id);
        IDToString.push(Items._id.toString());    
    });
 
    
    await Dept.updateMany({ _id: { $in : IDs} }, {
                $set: {
                    'unread_msgs': 0
                }
            });
     
    await Chat.updateMany({ dept_id: { $in : IDToString} }, {
            $set: {
                'unread_msgs': 0
            }
     });

    res.send(true);
});

router.get("/getSmartQuestionsDept/:dept_id", auth, async (req, res) => {
    const deptID = ObjectId(req.params.dept_id);

    const DeptQuestionData = await Dept.find({ _id: deptID }).select('-_id smart_questions');

    res.send(DeptQuestionData[0]);
});


router.post("/addSmartQuestionsDept", auth, async (req, res) => {
    const question = req.body.question;
    const deptID = req.body.dept_id;

    const addNewQuestion = await Dept.updateMany({ _id: deptID },{
        $push: {
            'smart_questions': question
        }
    });

    if (addNewQuestion === undefined || addNewQuestion.length == 0) {
        res.send(false);
    }
    else {
        res.send(true);
    }
});
 
router.post("/removeSmartQuestionsDept", auth, async (req, res) => {
    const question = req.body.question;
    const deptID = req.body.dept_id;

    const removeNewQuestion = await Dept.updateMany({ _id: deptID },{
        $pull: {
            'smart_questions': question
        }
    });

    if (removeNewQuestion === undefined || removeNewQuestion.length == 0) {
        res.send(false);
    }
    else {
        res.send(true);
    }
});


router.get("/getPresetQuestionsDept/:dept_id", auth, async (req, res) => {
    const deptID = ObjectId(req.params.dept_id);

    const DeptQuestionData = await Dept.find({ _id: deptID }).select('-_id preset_questions preset_answers');

    res.send(DeptQuestionData[0]);
});

router.post("/addPresetQuestionsDept", auth, async (req, res) => {
    const question = req.body.question;
    const answers = req.body.answers;
    const deptID = req.body.dept_id;

    const addNewQuestion = await Dept.updateMany({ _id: deptID },{
        $push: {
            'preset_questions': question,
            'preset_answers': answers
        }
    });

    if (addNewQuestion === undefined || addNewQuestion.length == 0) {
        res.send(false);
    }
    else {
        res.send(true);
    }
});


router.post("/updatePresetQuestionsDept", auth, async (req, res) => {
    const question = req.body.question;
    const answers = req.body.answers;
    const deptID = req.body.dept_id;

    const addNewQuestion = await Dept.updateMany({ _id: deptID },{
        $set: {
            'preset_questions': question,
            'preset_answers': answers
        }
    });

    if (addNewQuestion === undefined || addNewQuestion.length == 0) {
        res.send(false);
    }
    else {
        res.send(true);
    }
});

router.get("/getTicketsGuideDept/:dept_id", auth, async (req, res) => {
    const deptID = ObjectId(req.params.dept_id);

    const DeptQuestionData = await Dept.find({ _id: deptID }).select('-_id tickets_dept_guide');

    res.send(DeptQuestionData[0]);
});


router.post("/addTicketsGuideDept", auth, async (req, res) => {
    const tickets_dept_guide = req.body.question;
    const deptID = req.body.dept_id;

    const addNewQuestion = await Dept.updateMany({ _id: deptID },{
        $push: {
            'tickets_dept_guide': tickets_dept_guide
        }
    });

    if (addNewQuestion === undefined || addNewQuestion.length == 0) {
        res.send(false);
    }
    else {
        res.send(true);
    }
});
 
router.post("/removeTicketsGuideDept", auth, async (req, res) => {
    const tickets_dept_guide = req.body.question;
    const deptID = req.body.dept_id;

    const removeNewQuestion = await Dept.updateMany({ _id: deptID },{
        $pull: {
            'tickets_dept_guide': tickets_dept_guide
        }
    });

    if (removeNewQuestion === undefined || removeNewQuestion.length == 0) {
        res.send(false);
    }
    else {
        res.send(true);
    }
});

 
module.exports = router;