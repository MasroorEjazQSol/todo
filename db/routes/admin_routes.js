const { Admin } = require("../models/admin_db");
const { Dept} = require("../models/dept_db");
const { AdminToAdminChat } = require("../models/admin_to_admin_chat_db");
const { AdminChatDetails } = require("../models/admin_chat_details_db");
const { AdminChatArchive } = require("../models/admin_chat_archive_db");
const { Chat } = require("../models/chat_db");
const { ChatDetails } = require("../models/chat_details_db");
const { ChatClose } = require("../models/chat_close_db");
const { User } = require("../models/user_db");
const { AppSettings } = require("../models/app_settings_db");
const { ChatCloseDetails } = require("../models/chat_close_details_db");
const { BlockDB } = require("../models/block_db");
const auth = require("../middleware/auth");
const auth_non_secure = require("../middleware/auth_non_secure");
const express = require("express"); 
const jwt = require('jwt-simple');
const router = express.Router();
var ObjectId = require('mongodb').ObjectID;


 
process.on('unhandledRejection', (reason, promise) => {
    //console.log("Reason: ", reason, "promise: ", promise);
});

process.on('warning', e => console.warn(e.stack));

 
router.get("/updateCompanyID", auth, async (req, res) => { 

    await Admin.updateMany({ $set: {
        'company_id': '0'
    }});
    await Dept.updateMany({ $set: {
        'company_id': '0'
    }});
    await AdminToAdminChat.updateMany({ $set: {
        'company_id': '0'
    }});
    await AdminChatDetails.updateMany({ $set: {
        'company_id': '0'
    }});
    await AdminChatArchive.updateMany({ $set: {
        'company_id': '0'
    }});
    await Chat.updateMany({ $set: {
        'company_id': '0'
    }});
    await ChatDetails.updateMany({ $set: {
        'company_id': '0'
    }});
    await ChatClose.updateMany({ $set: {
        'company_id': '0'
    }});
    await User.updateMany({ $set: {
        'company_id': '0'
    }});
    await AppSettings.updateMany({ $set: {
        'company_id': '0'
    }});
    await ChatCloseDetails.updateMany({ $set: {
        'company_id': '0'
    }});
    await BlockDB.updateMany({ $set: {
        'company_id': '0'
    }});




    res.send('www');

});
 

router.get("/getAllAdminStatus/:deptID", auth, async (req, res) => { 

    const adminStatus = await Admin.count({ masterAdmin: true, admin_status: true });
 

    if (parseInt(adminStatus) > 0) {
        res.send(true);
    }
   else {
        const deptID = req.params.deptID;
        const DeptData = await Dept.find({ '_id': deptID }).select('dept_admin');
        let DeptAdminList = DeptData[0].dept_admin;
        let AdminStatusData = await Admin.count({ '_id': { $in : DeptAdminList}, 'admin_status' : true }); 
        if(parseInt(AdminStatusData)>0){
            res.send(true);
        }
      
        else {
            res.send(false);
        }
   }

  

});

router.get("/getAllAdminDataList/:company_id", auth, async (req, res) => {
    try {
        const company_id = req.params.company_id;
        const AllAdmin = await Admin.find({ isBlock: false, company_id: company_id }).select('_id username display_name');
        res.send(AllAdmin);
    }
    catch (e) { 
        res.send(false);
    }
}); 
 


router.get("/getMasterAdminStatus", auth, async (req, res) => {
     
    const adminStatus = await Admin.find({ masterAdmin: true, admin_status: true });

    if (adminStatus.length > 0) {
        res.send(true);
    }
    else {
        res.send(false);
    }
       
    
});

router.get("/getAllAdminData", auth, async (req, res) => {
    const AllAdmin = await Admin.find().sort({username: 1});
    res.send(AllAdmin);
}); 
 
router.get("/getAllAdminDataExceptCurrent/:adminID/:company_id", auth, async (req, res) => {

    try {
        const adminID = ObjectId(req.params.adminID);
        const company_id = req.params.company_id;
        const AllAdmin = await Admin.find({ _id: { $ne: adminID }, company_id: company_id }).select('-password').sort({ username: 1 });
        res.send(AllAdmin);
    }

    catch (e) {
      
        res.send(false);
    }
}); 


router.get("/getAdminAccessDept/:adminID", auth, async (req, res) => {
    try {
        const adminID = ObjectId(req.params.adminID);
        const AllAdmin = await Admin.find({ _id: adminID }).find().select('-password');
        res.send(AllAdmin);
    }

    catch (e) {
       
        res.send(false);
    }
}); 
 

router.get("/getAllNonMasterAdminData", auth, async (req, res) => {
    const AllAdmin = await Admin.find({ masterAdmin: false}).select('-password').sort({ username: 1 });
    res.send(AllAdmin);
}); 


router.get("/getAllAdminChatData", auth, async (req, res) => {
    const AllAdmin = await Admin.find().select('_id username');
    res.send(AllAdmin);
}); 

router.get("/getAllAdminChatDataExceptCurrent/:adminID", auth, async (req, res) => {
    try {
        const adminID = ObjectId(req.params.adminID);
        const AllAdmin = await Admin.find({ _id: { $ne: adminID }, isBlock: false }).select('_id username display_name');
        res.send(AllAdmin);
    }
    catch (e) { 
        res.send(false);
    }
}); 




router.get("/getAdminData/:adminID", auth, async (req, res) => {
    try {
        const adminID = ObjectId(req.params.adminID);
        const AllAdmin = await Admin.find({ _id: adminID }).select('admin_image isBlock masterAdmin unread_msgs _id username email demo_mode display_name display_limit notification');
        res.send(AllAdmin);
    }

    catch (e) { 
        res.send(false);
    }
}); 



router.get("/getAllAdminIds", auth, async (req, res) => {
    const AllAdmin = await Admin.find().select('_id');
    res.send(AllAdmin);
}); 










router.delete("/removeAdmin/:adminID", auth, async (req, res) => {
    const adminID = req.params.adminID;

    await Dept.updateMany({
        $pull: {
            'dept_admin': adminID
        }
    });
   
    const DeleteAdminData = await Admin.findOneAndDelete({ _id: adminID });
    if (DeleteAdminData) {
        res.send(DeleteAdminData);
    }
    else {
        res.send("Admin not found");
    }

}); 


router.put("/blockAdmin/:adminID", auth, async (req, res) => {

    const adminID = req.params.adminID;
    
    
    const adminBlock = await Admin.updateMany({ _id: adminID }, {
        $set: {
            'isBlock': true
        }
    });

    const adminBlock2 = await AdminChat.updateMany({ receive_id: adminID }, {
        $set: {
            'isBlock': true
        }
    });

    

    const adminBlock3 = await AdminChat.updateMany({ send_id: adminID }, {
        $set: {
            'isBlock': true
        }
    });

    res.send(true);

     
}); 

router.put("/unblockAdmin/:adminID", auth, async (req, res) => {

    const adminID = req.params.adminID;

    const adminBlock = await Admin.updateMany({ _id: adminID }, {
        $set: {
            'isBlock': false
        }
    });

    const adminBlock2 = await AdminChat.updateMany({ receive_id: adminID }, {
        $set: {
            'isBlock': false
        }
    });

    const adminBlock3 = await AdminChat.updateMany({ send_id: adminID }, {
        $set: {
            'isBlock': false
        }
    });

    res.send(true);

     
}); 

router.post("/addSubAdmin", auth, async (req, res) => {
    const adminID = req.body.adminID;
    const subAdminID = req.body.subAdminID;
   // res.send(`${adminID} and ${subAdminID}`);

    const addSubAdmin = await Admin.updateMany({ _id: adminID, sub_admin: { $ne: subAdminID} }, {
        $push: {
            'sub_admin': subAdminID
        }
    });

    if (addSubAdmin) {
        res.send("Sub-Admin Added");
    }
    else {
        res.send("Sub-Admin Not Added");
    }
}); 


router.post("/removeSubAdmin", auth, async (req, res) => {
    const adminID = req.body.adminID;
    const subAdminID = req.body.subAdminID;
    // res.send(`${adminID} and ${subAdminID}`);

    const addSubAdmin = await Admin.updateMany({ _id: adminID }, {
        $pull: {
            'sub_admin': subAdminID
        }
    });

    if (addSubAdmin) {
        res.send("Sub-Admin Removed");
    }
    else {
        res.send("Sub-Admin Not Removed");
    }
}); 

 

router.get("/getSubAdminAssign/:admin_id/:sub_admin_id", auth, async (req, res) => {
    const adminID = req.params.admin_id;
    const subAdminID = req.params.sub_admin_id;
    const getSubAdminList = await Admin.find({ _id: adminID, sub_admin: subAdminID  });

    if (getSubAdminList === undefined || getSubAdminList.length == 0) {
        res.send(false);
    }

    else {
        res.send(true);
    }

}); 



router.put("/addMasterAdmin/:adminID", auth, async (req, res) => {
    
    const adminID = req.params.adminID;

    const adminBlock = await Admin.updateMany({ _id: adminID }, {
        $set: {
            'masterAdmin': true,
            'dept_access': true,
            'user_access': true
        }
    });

    if (adminBlock) {
        res.send("Master Admin created");
    }
    else {
        res.send("Master Admin not created");
    }
});

router.put("/removeMasterAdmin/:adminID", auth, async (req, res) => {
 
    const adminID = req.params.adminID;

    const adminBlock = await Admin.updateMany({ _id: adminID }, {
        $set: {
            'masterAdmin': false,
            'dept_access': false,
            'user_access': false
        }
    });

    if (adminBlock) {
        res.send("Master Admin removed");
    }
    else {
        res.send("Master Admin not removed");
    }
}); 
 

router.put("/addAdminStatus/:adminID/:status", auth, async (req, res) => { 
    
    const adminID = req.params.adminID;
    const status = req.params.status;
 
    let time = new Date().toLocaleString('de-DE', {hour12: true, timeZone: process.env.Timezone }); 

    const adminStatus = await Admin.updateMany({ _id: adminID }, {
        $set: {
            'admin_status': status,
            'last_login': time
        }
    });
 

    if (adminStatus) {
        res.send(true);
    }
    else {
        res.send(false);
    }
});


router.put("/addDeptAccess/:adminID", auth, async (req, res) => {
 
    const adminID = req.params.adminID;

    const adminBlock = await Admin.updateMany({ _id: adminID }, {
        $set: {
            'dept_access': true
        }
    });

    if (adminBlock) {
        res.send(true);
    }
    else {
        res.send(false);
    }
});


router.put("/removeDeptAccess/:adminID", auth, async (req, res) => {
   
    const adminID = req.params.adminID;

    const adminBlock = await Admin.updateMany({ _id: adminID }, {
        $set: {
            'dept_access': false
        }
    });

    if (adminBlock) {
        res.send(true);
    }
    else {
        res.send(false);
    }
});


router.put("/addUserAccess/:adminID", auth, async (req, res) => {
    
    const adminID = req.params.adminID;

    const adminBlock = await Admin.updateMany({ _id: adminID }, {
        $set: {
            'user_access': true
        }
    });

    if (adminBlock) {
        res.send(true);
    }
    else {
        res.send(false);
    }
});


router.put("/removeUserAccess/:adminID", auth, async (req, res) => {
 
    const adminID = req.params.adminID;

    const adminBlock = await Admin.updateMany({ _id: adminID }, {
        $set: {
            'user_access': false
        }
    });

    if (adminBlock) {
        res.send(true);
    }
    else {
        res.send(false);
    }
});


router.post("/getAdminTokenResult", auth, async (req, res) => {
    try {
        const adminData = req.body.adminData;
        const AdminAuthToken = jwt.decode(adminData, process.env.API_KEY);
        res.send(AdminAuthToken);
    }

    catch (e) { 
    }

}); 

router.post("/getAdminTokenResultLayout", auth, async (req, res) => {
    try {
        const adminData = req.body.adminData;
        const AdminAuthToken = jwt.decode(adminData, process.env.API_KEY);
        let admin_id = AdminAuthToken[0]._id;
       

        const adminID = ObjectId(admin_id);
        const AllAdmin = await Admin.find({ _id: adminID }).select('admin_image isBlock masterAdmin unread_msgs _id username email demo_mode display_name dept_access user_access display_limit notification admin_ip company_id');
        res.send(AllAdmin); 

     
    }

    catch (e) {
    }

}); 

router.post("/setAdminDisplayandNotificationSettings", auth, async (req, res) => {
    try { 
        let admin_id = req.body.admin_id;
        let display_limit = req.body.display_limit;
        let notification = req.body.notification;

        const adminUpdate = await Admin.updateMany({ _id: admin_id }, { 
            $set: {
                'display_limit': display_limit,
                'notification': notification
            }
        });
        

        if (adminUpdate) {
            res.send(true);
        }
        else {
            res.send(false);
        }
    }

    catch (e) {
    }

}); 


router.post("/getAdminDisplayandNotificationSettings", auth, async (req, res) => {
    try { 
        let admin_id = req.body.admin_id;
    
        const AdminSettings = await Admin.find({ _id: admin_id }).select('display_limit notification');
        
        res.send(AdminSettings);
    }

    catch (e) {
    }

}); 

router.post("/searchUser", auth, async (req, res) => {

    const search_keyword = req.body.keyword;

    let AdminData = await Admin.find({$or:[{username: { '$regex': search_keyword, $options: 'is' }},
    {email: { '$regex': search_keyword, $options: 'is' }},
    {display_name: { '$regex': search_keyword, $options: 'is' }}] }).select(); 

    res.send(AdminData);
   
}); 

router.post("/refreshAdminToken", auth, async (req, res) => {

    const admin_id = req.body.admin_id; 
 
    const AuthDataAdmin = await Admin.find({ _id: admin_id }).select('admin_image _id username masterAdmin display_name isBlock demo_mode email dept_access user_access display_limit notification admin_ip');                         
    const AdminAuthToken = jwt.encode(AuthDataAdmin, process.env.API_KEY);
    res.send(AdminAuthToken);     
     
    
}); 

router.post("/updateProfilePictureAWS", auth, async (req, res) => {
    const admin_image = req.body.admin_image;
    const admin_id = req.body.admin_id;
    
 

    const adminUpdate = await Admin.updateMany({ _id: admin_id }, { 
        $set: {
            'admin_image': admin_image
        }
    });
    
    res.send(true);

}); 

 
router.post("/updateProfilePicture", auth, async (req, res) => {
    const admin_image = req.body.admin_image;
    const admin_id = req.body.admin_id;   
 

    const adminUpdate = await Admin.updateMany({ _id: admin_id }, { 
        $set: {
            'admin_image': admin_image
        }
    });
    

    if (adminUpdate) {
        res.send(admin_image);
    }
    else {
        res.send(false);
    }

}); 

router.post("/removeProfilePicture", auth, async (req, res) => {
 
    const admin_id = req.body.admin_id;
  

    const adminUpdate = await Admin.updateMany({ _id: admin_id }, { 
        $set: {
            'admin_image': ''
        }
    });
    

    if (adminUpdate) {
        res.send(true);
    }
    else {
        res.send(false);
    }

}); 


router.post("/updateAdminProfile", auth, async (req, res) => {

    const adminID = req.body.adminID;
    const usernameAdmin = req.body.username;
    const emailAdmin = req.body.email;
    const display_name = req.body.display_name;
    const old_display_name = req.body.old_display_name;

    let chk_response = await Admin.find({$and: [
    { _id: { $ne: ObjectId(adminID) } },
    {$or: [
        // {display_name: {
        //     $regex: new RegExp('^' + display_name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i')
        // }},
        // {username: {
        //     $regex: new RegExp('^' + usernameAdmin.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i')
        // }},
        {email:  {
            $regex: new RegExp('^' + emailAdmin.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i')
        }} ]}
    ]}).select('_id');
    
    if(parseInt(chk_response.length)>0){
        res.send(false);
    }

    else {
        try {
             await Admin.updateMany({ _id: ObjectId(adminID) }, {
            $set: {
                'display_name': display_name,
                'username': usernameAdmin,
                'email': emailAdmin
            }
            });

            await ChatClose.updateMany({ last_msgs_user: old_display_name }, {
                $set: {
                    'last_msgs_user': display_name
                }
            });

            await Chat.updateMany({ last_msgs_user: old_display_name }, {
                $set: {
                    'last_msgs_user': display_name
                }
            });

            await AdminToAdminChat.updateMany({ admin_one_id: adminID }, {
                $set: {
                    'admin_one_username': display_name
                }
            });
    
            await AdminToAdminChat.updateMany({ admin_two_id: adminID }, {
                $set: {
                    'admin_two_username': display_name
                }
            });
    
            await AdminChatDetails.updateMany({ admin_one_id: adminID }, {
                $set: {
                    'admin_one_username': display_name
                }
            });
    
            await AdminChatDetails.updateMany({ admin_two_id: adminID }, {
                $set: {
                    'admin_two_username': display_name
                }
            });

            await AdminChatArchive.updateMany({ admin_one_id: adminID }, {
                $set: {
                    'admin_one_username': display_name
                }
            });
    
            await AdminChatArchive.updateMany({ admin_two_id: adminID }, {
                $set: {
                    'admin_two_username': display_name
                }
            });

            await AdminToAdminChat.updateMany({ _id: ObjectId(adminID) }, {
                $set: {
                    'last_msgs_user': display_name
                }
            });
    
             await AdminToAdminChat.updateMany({$and: [
                    { last_msgs_user: old_display_name },
                    {$or: [
                        {admin_one_id: ObjectId(adminID)},
                        {admin_two_id: ObjectId(adminID)} ]}
                    ]}, {
                        $set: {
                            last_msgs_user: display_name                            
                        }
            });

            let chat_details = await AdminChatDetails.find({$and: [
                { 'username': old_display_name },
                {$or: [
                    {admin_one_id: adminID},
                    {admin_two_id: adminID} ]}
                ]}
            ).select('username _id');


            if(parseInt(chat_details.length)>0){
               
                for(let i=0;i<parseInt(chat_details.length);i++){
                    let id=chat_details[i]._id;
                    let username_array = chat_details[i].username;
                    let new_username_array = [];

                    for(let j=0;j<parseInt(username_array.length);j++){
                        if(username_array[j]==old_display_name){
                            new_username_array.push(display_name);
                        }
                        else {
                            new_username_array.push(username_array[j]);
                        }
                    }

                    await AdminChatDetails.updateMany({ _id: id }, {
                        $set: {
                            'username': new_username_array
                        }
                    });
                }
            }


            chat_details = await AdminChatArchive.find({$and: [
                { 'username': old_display_name },
                {$or: [
                    {admin_one_id: adminID},
                    {admin_two_id: adminID} ]}
                ]}
            ).select('username _id');


            if(parseInt(chat_details.length)>0){
               
                for(let i=0;i<parseInt(chat_details.length);i++){
                    let id=chat_details[i]._id;
                    let username_array = chat_details[i].username;
                    let new_username_array = [];

                    for(let j=0;j<parseInt(username_array.length);j++){
                        if(username_array[j]==old_display_name){
                            new_username_array.push(display_name);
                        }
                        else {
                            new_username_array.push(username_array[j]);
                        }
                    }

                    await AdminChatArchive.updateMany({ _id: id }, {
                        $set: {
                            'username': new_username_array
                        }
                    });
                }
            }


            chat_details = await ChatDetails.find({'username': old_display_name}).select('username _id');
            

            if(parseInt(chat_details.length)>0){ 
                for(let i=0;i<parseInt(chat_details.length);i++){
                    let id=chat_details[i]._id;
                    let username_array = chat_details[i].username;
                    let new_username_array = [];

                    for(let j=0;j<parseInt(username_array.length);j++){
                        if(username_array[j]==old_display_name){
                            new_username_array.push(display_name);
                        }
                        else {
                            new_username_array.push(username_array[j]);
                        }
                    }

                    await ChatDetails.updateMany({ _id: id }, {
                        $set: {
                            'username': new_username_array
                        }
                    });
                   
                }
            }
            
           

            res.send(true);
        }

        catch (e) {
         
            res.send(false);
        }
   

    
    }

    
}); 


router.get("/changeUsertypeToAdminID", auth, async (req, res) => {
    const AllAdmin = await Admin.find().select('_id username display_name');
    const Chat = await ChatDetails.find().select('username _id');
 


    for(let j=0;j<parseInt(Chat.length);j++){

        
       
        let chat_id = Chat[j]._id;
        let username = Chat[j].username;    
        let new_usertype = [];
        let flag=true;

      

       
        for(let k=0;k<parseInt(username.length);k++){
            let temp_username = username[k]; 
            
            for(let i=0;i<parseInt(AllAdmin.length);i++){
                let username_admin=AllAdmin[i].username;
                let display_name_admin=AllAdmin[i].display_name;
                let admin_id = AllAdmin[i]._id.toString();
               
                
                if(temp_username==username_admin || temp_username==display_name_admin){
                    new_usertype.push(admin_id);
                    flag=false;
                }

                
            }

            if(flag) {
                new_usertype.push('user');
            }
            flag=true;

            

        }

        //  console.log(chat_id);
        //  console.log(username); 
        //  console.log(new_usertype);
 
      

        await ChatDetails.updateMany({ _id: chat_id.toString() }, {
            $set: {
                'usertype': new_usertype
            }
        });

    }

    
}); 



router.get("/getAllAdminImages", auth, async (req, res) => { 

    const adminImageData = await Admin.find().select('_id admin_image admin_status'); 
    res.send(adminImageData);
});


module.exports = router;
