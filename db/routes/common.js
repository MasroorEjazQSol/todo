const { AppSettings } = require("../models/app_settings_db");
const { BlockDB } = require("../models/block_db"); 
const { Admin } = require("../models/admin_db");
const { User } = require("../models/user_db");
const { ChatClose } = require("../models/chat_close_db");
const { ChatCloseDetails } = require("../models/chat_close_details_db");
const auth_socket = require("../middleware/auth_socket");
const auth_user = require("../middleware/auth_user");
const auth_non_secure = require("../middleware/auth_non_secure");
const path = require('path');
const express = require("express");
const router = express.Router();  
var ObjectId = require('mongodb').ObjectID;
const staticPath = path.join(__dirname, '../uploads');
const { Configuration, OpenAIApi } = require("openai");
 
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);


process.on('unhandledRejection', (reason, promise) => {
    //console.log("Reason: ", reason, "promise: ", promise);
});

process.on('warning', e => console.warn(e.stack));
 

router.get("/getCurrentRoute", auth_non_secure, async (req, res) => {
    res.send('First Route');

}); 

router.get("/getFooterText", auth_user, async (req, res) => {
    const getFooterText = await AppSettings.find().select('footer_text');
    res.send(getFooterText[0]['footer_text']);

}); 

router.get("/getLogoImage", auth_user, async (req, res) => {
 

    const getFooterText = await AppSettings.find().select('app_images');
    try {
        res.send(getFooterText[0]);
    }

    catch (e) {
        res.send('');
    }

}); 


router.get("/checkIPBlock/:ip_address", auth_user, async (req, res) => {
    const IPAdress = req.params.ip_address;

    const checkIPBlock = await BlockDB.find({ ip_addresses: IPAdress });

    if (checkIPBlock === undefined || checkIPBlock.length == 0) {
        res.send(false);
    }
    else {
        res.send(true);
    }

});


router.get("/checkEmailBlock/:email_address", auth_user, async (req, res) => {
    const EmailAdress = req.params.email_address;

    const checkEmailBlock = await BlockDB.find({ email_addresses: EmailAdress });

    if (checkEmailBlock === undefined || checkEmailBlock.length == 0) {
        res.send('false');
    }
    else {
        res.send('true');
    }

});



router.get("/getPrivacyPolicyText", auth_non_secure, async (req, res) => {
    const getPrivacyText = await AppSettings.find().select('privacy_policy');
    try {
        res.send(getPrivacyText[0]['privacy_policy']);
    }

    catch (e) {
        res.send('');
    }


});


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



router.get("/getCompanyName/:company_id", auth_user, async (req, res) => {
    let company_id = req.params.company_id;
    const getCompanyName = await AppSettings.find({company_id:company_id}).select('company_name');
    res.send(getCompanyName[0]);
 

});
 
router.post("/updateChatRatingsViaEmail", auth_user, async (req, res) => {
    try { 
    
    const chatID = ObjectId(req.body.chat_id);
    const ratings = parseInt(req.body.ratings);
    await ChatClose.find({ _id: chatID }).updateMany({ chat_ratings: ratings });
    const chat_id = req.body.chat_id;
       
    let ChatData2 = await ChatClose.find({ _id: chatID }).select('subject chat_ratings');

    await ChatCloseDetails.updateMany({ chat_id: chat_id }, {
        $set: {
            'chat_ratings': ratings            
        }
    });

    res.send(ChatData2[0]);
    

    }
    catch (e) {           
        res.send(false);
    }
});

router.post("/updateCustomerFeedback", auth_user, async (req, res) => {
    try { 
    
        const id = ObjectId(req.body.chat_id);
        const feedback = req.body.feedback;
        const chat_id = req.body.chat_id;
        const last_msgs_date = req.body.date;
        let last_msgs_msg = feedback;
        let emoji = "";

        const ChatCloseData = await ChatClose.find({ '_id': id }).select('user_name');
        let user_name = ChatCloseData[0].user_name;

        if (last_msgs_msg.length > 18) {
            let dots = "...";
            last_msg_string = last_msgs_msg.substring(0, 18) + dots;
        }
    
        let ask = "act as a emotion specialist and tell me the emotions of the customer by this following chat in single emoji follow by single word. Emotions should be either Satisfied or Unsatisfied. Customer Chat:"+feedback;

        try {
            const completion = await openai.createCompletion({
              model: "gpt-3.5-turbo-instruct",
              temperature: 1,
              top_p: 1,
              prompt: ask,   
            });

            emoji = completion.data.choices[0].text;
            emoji = emoji.trim(); 
          }
        
          catch(e){
          //  console.log(e);
            emoji = '😊 Waiting';
         }

         await ChatClose.updateMany({ _id: chat_id }, {
            $set: {
                'last_msgs_user': user_name,
                'last_msgs_msg': last_msg_string,
                'last_msgs_date': last_msgs_date,
                'last_emoji': emoji,
                'feedback': feedback
            }
        });

        await ChatCloseDetails.updateMany({ chat_id: chat_id }, {
            $push: {
                username: user_name,
                messages: feedback,
                date: last_msgs_date,
                usertype: "user",
                emoji: emoji
            },$set: {
                last_emoji: emoji,
                feedback: feedback
            }
        }
        );

        res.send(true)
         

    }
    catch (e) {           
        res.send(e);
    }
});

router.get("/getFeedback/:chat_id", auth_user, async (req, res) => {

    try {
        const id = ObjectId(req.params.chat_id);
        let ChatData = await ChatClose.find({ _id: id }).select('feedback');
        let feedback = ChatData[0].feedback;
    
        if(feedback.length>0){
            res.send(false);
        }
    
        else {
            res.send(true);
        }
    }
   
    catch(e){
        res.send(true);
    }

});

router.get("/getCompanyID/:chat_id", auth_user, async (req, res) => {

    try {
        const id = ObjectId(req.params.chat_id);
        let ChatData = await ChatClose.find({ _id: id }).select('company_id');
        let company_id = ChatData[0].company_id;    
        
        res.send(company_id) 
    }
   
    catch(e){
        res.send(false);
    }

});

module.exports = router;