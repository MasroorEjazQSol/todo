const { Admin, validate } = require("../models/admin_db"); 
const { User } = require("../models/user_db");
const { Dept } = require("../models/dept_db");
const auth = require("../middleware/auth_user");
const auth_socket = require("../middleware/auth_socket");
const express = require("express"); 
const jwt = require('jwt-simple');
const router = express.Router();  


process.on('unhandledRejection', (reason, promise) => {
    //console.log("Reason: ", reason, "promise: ", promise);
});

process.on('warning', e => console.warn(e.stack));

router.put("/addAdminStatus/:adminID/:status", auth_socket, async (req, res) => {

    const adminID = req.params.adminID;
    const status = req.params.status;

    const adminStatus = await Admin.updateMany({ _id: adminID }, {
        $set: {
            'admin_status': status
        }
    });

    if (adminStatus) {
        res.send(true);
    }
    else {
        res.send(false);
    }
});

router.put("/addUserStatus/:userID/:status", auth_socket, async (req, res) => {

    const userID = req.params.userID;
    const status = req.params.status;


    const userStatus = await User.updateMany({ _id: userID }, {
        $set: {
            'user_status': status
        }
    });

    if (userStatus) {
        res.send(true);
    }
    else {
        res.send(false);
    }
});


router.post("/validateUser", auth, async (req, res) => {
    const username= req.body.username;
    const email = req.body.email;
    const chat_id = req.body.chat_id;

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 2);
    const year = tomorrow.getFullYear();
    const month = tomorrow.getMonth() + 1;
    const date = tomorrow.getDate();
    const complete_data = month + "/" + date + "/" + year;

    const AuthDataUser = {        
        user_name: username,
        user_email: email,
        chat_id: chat_id,
        expiry: complete_data
    };

    const UserAuthToken = jwt.encode(AuthDataUser, process.env.API_KEY);
    res.send(UserAuthToken);

}); 


router.post("/updateDeptUnreadMsgs", auth, async (req, res) => {
    const deptID = req.body.deptID;
    const unread_msgs = req.body.unread_msgs;

    try {
        const deptUpdate = await Dept.updateMany({ _id: deptID }, {
            $inc: {
                'unread_msgs': 1
            }
        });
        //  res.send(result);
        if (deptUpdate === undefined || deptUpdate.length == 0) {
            res.send('Unread Messages not updated');
        }
        else {
            res.send(`Unread Messages Updated`);
        }
    }
    catch (e) {
        res.send(e.message);
    }

}); 

router.get("/getAllAdminChatData", auth, async (req, res) => {
    const AllAdmin = await Admin.find().select('_id username');
    res.send(AllAdmin);
}); 







 


 


module.exports = router;
