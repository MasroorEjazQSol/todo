const { User, validate } = require("../models/user_db");
const { Chat } = require("../models/chat_db");
const auth = require("../middleware/auth");
const express = require("express"); 
const jwt = require('jwt-simple');
const router = express.Router(); 
var ObjectId = require('mongodb').ObjectID;

process.on('unhandledRejection', (reason, promise) => {
    //console.log("Reason: ", reason, "promise: ", promise);
});

process.on('warning', e => console.warn(e.stack));


router.get("/userMakeConnectionToDB", auth, async (req, res) => { 
    res.send(true);
}); 

router.put("/addUserStatus/:userID/:status", auth, async (req, res) => {
 
    try {
        let time = new Date().toLocaleString('de-DE', {hour12: true, timeZone: process.env.Timezone }); 
        const userID = req.params.userID;
        const status = req.params.status;


        const userStatus = await User.updateMany({ _id: ObjectId(userID) }, {
            $set: {
                'user_status': status,
                'last_login': time
            }
        });

        if (userStatus) {
            res.send(true);
        }
        else {
            res.send(false);
        }
    }


    catch (e) {
        
    }
});


router.get("/getUserStatus/:userID", auth, async (req, res) => {
    try {
    const userID = req.params.userID;

        const AllUser = await User.find({ _id: ObjectId(userID) }).select('user_status');
        res.send(AllUser[0].user_status);
    }


    catch (e) {
        
    }
}); 
 

router.post("/updateChatRatings", auth, async (req, res) => {
    try { 
    const chatID = ObjectId(req.body.chat_id);
    const ratings = parseInt(req.body.ratings);
    const ChatData = await Chat.find({ _id: chatID }).updateMany({ chat_ratings: ratings });
 

    if (ChatData === undefined || ChatData.length == 0) {
        res.send(false);
    }
    else {
        res.send(true);
    }

    }
    catch (e) { res.send(false);}
});


router.post("/getUserDetailFromToken", auth, async (req, res) => {

    try { 
    const userData = req.body.userData;
    const UserAuthToken = jwt.decode(userData, process.env.API_KEY); 
        res.send(UserAuthToken);
    }
    catch (e) {  }
      
}); 


router.get("/getAllUserData/:company_id", auth, async (req, res) => {
    let company_id = req.params.company_id;
    const AllUser = await User.find({company_id:company_id});
    res.send(AllUser);
}); 



router.get("/getUserData/:limit/:skip/:company_id", auth, async (req, res) => {
    const limit = parseInt(req.params.limit);
    const skip = parseInt(req.params.skip);
    const company_id = req.params.company_id;
    const AllUser = await User.find({company_id:company_id}).select('-password').limit(limit).skip(skip).sort({ firstname: 1 });  
    res.send(AllUser);
}); 




router.put("/blockUser/:userID", auth, async (req, res) => {

    try {
        const userID = ObjectId(req.params.userID);

        const userBlock = await User.updateMany({ _id: userID }, {
            $set: {
                'block': true
            }
        });

        if (userBlock) {
            res.send("User blocked");
        }
        else {
            res.send("User not found");
        }
    }

    catch (e) { }
});

router.put("/unblockUser/:userID", auth, async (req, res) => {

    try {

        const userID = ObjectId(req.params.userID);

        const userBlock = await User.updateMany({ _id: userID }, {
            $set: {
                'block': false
            }
        });

        if (userBlock) {
            res.send("User unblocked");
        }
        else {
            res.send("User not found");
        }
    }

    catch (e) { }
}); 


router.delete("/removeUser/:userID", auth, async (req, res) => {

    try {
        const userID = ObjectId(req.params.userID);
        const DeleteUserData = await User.findOneAndDelete({ _id: userID });
        const DeleteUserDataChat = await Chat.deleteMany({ user_id: userID });

        if (DeleteUserDataChat) {
            res.send(true);
        }
        else {
            res.send("User not found");
        }
    }

    catch (e) { }
}); 


router.post("/updateUserProfile", auth, async (req, res) => {

    try {
        const userID = ObjectId(req.body.userID);
        const firstname = req.body.firstname;
      //  const lastname = req.body.lastname;
        const email = req.body.email;

        const updateProfile = await User.updateMany({ _id: userID }, {
            $set: {
                'firstname': firstname,
           //     'lastname': lastname,
                'email': email
            }
        });


        if (updateProfile) {
            res.send(true);
        }
        else {
            res.send(false);
        }
    }


     catch (e) {
         res.send(false);
     }
}); 


router.post("/searchUser", auth, async (req, res) => {

    const search_keyword = req.body.keyword;

    let UserData = await User.find({$or:[{firstname: { '$regex': search_keyword, $options: 'is' }},
    {email: { '$regex': search_keyword, $options: 'is' }}] }).select(); 

    res.send(UserData);
}); 


router.post("/resendConfirmationCode", auth, async (req, res) => {

    try {
        const userID = ObjectId(req.body.userID);
        let min = 10000;
        let max = 99999;
        let confirmation_code = Math.floor(Math.random() * (max - min + 1)) + min;

        const updateProfile = await User.updateMany({ _id: userID }, {
            $set: {
                'confirmation_code': confirmation_code,
                'resend_confirmation_code': false
            }
        });

        const checkProfile = await User.find({ _id: userID });

        if (checkProfile === undefined || checkProfile.length == 0) {
            res.send(false);
        }
        else {

            res.send(checkProfile);
        }
    }

    catch (e) {
        res.send(false);
    }



}); 


router.post("/checkUserResend", auth, async (req, res) => {

    try {
        const userID = ObjectId(req.body.userID);
        const GetUser = await User.find({ _id: userID }).select('resend_confirmation_code');

        res.send(GetUser);
    }

    catch (e) { }
 

}); 

router.post("/confirmCode", auth, async (req, res) => {

    try {
        const userID = ObjectId(req.body.userID);
        const confirmation_code = req.body.confirmation_code;

        const checkProfile = await User.find({ _id: userID, confirmation_code: confirmation_code });

        if (checkProfile === undefined || checkProfile.length == 0) {
            res.send(false);
        }
        else {
            const checkProfile = await User.updateMany({ _id: userID }, {
                $set: {
                    'account_confirm': true
                }
            });
            res.send(true);
        }
    }

    catch (e) { res.send(false); }
     
  

}); 

router.post("/adminConfirmCode", auth, async (req, res) => {

    try {
        const userID = ObjectId(req.body.userID);

        await User.updateMany({ _id: userID }, {
            $set: {
                'account_confirm': true
            }
        });

        res.send(true);
    }
  

     catch (e) { res.send(false); }

}); 

router.post("/checkUserConfirmAccount", auth, async (req, res) => {

    try {
        const userID = ObjectId(req.body.userID);
        const GetUser = await User.find({ _id: userID }).select('account_confirm');
        res.send(GetUser);
    }
  
    catch (e) { res.send(false); }
}); 

router.post("/checkUser", auth, async (req, res) => {
   
    try {
        const userID = ObjectId(req.body.userID);
        const GetUser = await User.find({ _id: userID }).select('block');
        if (GetUser[0].block) {
            res.send(false);
        }
        else {
            res.send(true);
        } 

       
    } catch (e) {
        
        res.send(false);
    }


}); 


module.exports = router;