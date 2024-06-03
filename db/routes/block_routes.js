const { Chat, validate } = require("../models/chat_db");
const { ChatDetails } = require("../models/chat_details_db");
const { ChatClose } = require("../models/chat_close_db");
const { User } = require("../models/user_db");
const { BlockDB } = require("../models/block_db");
const auth = require("../middleware/auth"); 
const auth_user = require("../middleware/auth_user");
const express = require("express"); 
let fuzzball = require('fuzzball'); 
const router = express.Router();

process.on('unhandledRejection', (reason, promise) => {
    //console.log("Reason: ", reason, "promise: ", promise);
});

process.on('warning', e => console.warn(e.stack));


router.post("/addAdminAcess", auth, async (req, res) => {
    const adminID = req.body.adminID;
  

    const addAdminAccess = await BlockDB.updateMany({ admin_access: { $ne: adminID } }, {
        $push: {
            'admin_access': adminID
        }
    });

    if (addAdminAccess === undefined || addAdminAccess.length == 0) {
        res.send(false);
    }
    else {
        res.send(true);
    }
});


router.post("/removeAdminAcess", auth, async (req, res) => {
    const adminID = req.body.adminID;
     

    const removeAdminAcess = await BlockDB.updateMany({ admin_access: adminID }, {
        $pull: {
            'admin_access': adminID
        }
    });

    if (removeAdminAcess === undefined || removeAdminAcess.length == 0) {
        res.send(false);
    }
    else {
        res.send(true);
    }
}); 

router.get("/checkAdminAcess/:adminID", auth, async (req, res) => {
    const adminID = req.params.adminID;

    // res.send(`${adminID} and ${subAdminID}`);

    const removeAdminAcess = await BlockDB.find({ admin_access: adminID });

    if (removeAdminAcess.length > 0) {
        res.send(true);
    }
    else {
        res.send(false);
    }
}); 


router.post("/blockIPAddress", auth, async (req, res) => {
    const blockIP = req.body.blockIP;

    if(blockIP=="0.0.0.0"){
        res.send(false);
        return;
    }

    const blockIPAddress = await BlockDB.updateMany({ ip_addresses: { $ne: blockIP } }, {
        $push: {
            'ip_addresses': blockIP
        }
    });

    if (blockIPAddress === undefined || blockIPAddress.length == 0) {
        res.send(false);
    }
    else {
        res.send(true);
    }
});


router.post("/unblockIPAddress", auth, async (req, res) => {
    const unblockIP = req.body.unblockIP;


    const unblockIPAddress = await BlockDB.updateMany({ ip_addresses: unblockIP  }, {
        $pull: {
            'ip_addresses': unblockIP
        }
    });

    if (unblockIPAddress === undefined || unblockIPAddress.length == 0) {
        res.send(false);
    }
    else {

        let response = await ChatClose.find({ip_addresses: unblockIP }).select('user_email');
        let length = response.length;

        if(parseInt(length)>0){
            await ChatClose.find({ user_ip_address: unblockIP }).updateMany({ isBlock: false, isActive: false });

            for(let i=0;i<parseInt(length);i++){
                let user_email = response[i].user_email;

                 await BlockDB.updateMany({ email_addresses: user_email }, {
                    $pull: {
                        'email_addresses': user_email
                    }
                });

                await User.updateMany({ email_addresses: user_email }, {
                    $set: {
                        'block': false
                    }
                });
            }
        }


        res.send(true);
    }
});

router.post("/blockEmail", auth, async (req, res) => {
    const blockEmail = req.body.blockEmail; 


    const blockEmailAddress = await BlockDB.updateMany({ email_addresses: { $ne: blockEmail } }, {
        $push: {
            'email_addresses': blockEmail
        }
    });

    if (blockEmailAddress === undefined || blockEmailAddress.length == 0) {
        res.send(false);
    }
    else {
        res.send(true);
    }
});


router.post("/unblockEmail", auth, async (req, res) => { 
    const unblockEmail = req.body.unblockEmail;
    const company_id = req.body.company_id;

    await BlockDB.updateMany({ email: unblockEmail, company_id: company_id }, {
        $pull: {
            'email_addresses': unblockEmail
        }
    });

    await User.updateMany({ email_addresses: unblockEmail, company_id: company_id }, {
        $set: {
            'block': false
        }
    });

    let response = await ChatClose.find({ user_email: unblockEmail }).select('user_ip_address');

    if(parseInt(response.length)>0){
        let unblockIP = response[0].user_ip_address;

    const unblockIPAddress = await BlockDB.updateMany({ ip_addresses: unblockIP  }, {
        $pull: {
            'ip_addresses': unblockIP
        }
    });

    if (unblockIPAddress === undefined || unblockIPAddress.length == 0) {
        res.send(false);
    }
    else {

        let response = await ChatClose.find({ip_addresses: unblockIP }).select('user_email');
        let length = response.length;

        if(parseInt(length)>0){
            await ChatClose.find({ user_ip_address: unblockIP }).updateMany({ isBlock: false, isActive: false });

            for(let i=0;i<parseInt(length);i++){
                let user_email = response[i].user_email;

                 await BlockDB.updateMany({ email_addresses: user_email, company_id: company_id }, {
                    $pull: {
                        'email_addresses': user_email
                    }
                });

                await User.updateMany({ email_addresses: user_email, company_id: company_id }, {
                    $set: {
                        'block': false
                    }
                });
            }
        }
    }
    
    }

    res.send(true);
});

 

router.get("/checkIPBlock/:ip_address", auth, async (req, res) => {
    const IPAdress = req.params.ip_address;

    const checkIPBlock = await BlockDB.find({ ip_addresses: IPAdress});

    if (checkIPBlock === undefined || checkIPBlock.length == 0) {
        res.send(false);
    }
    else {
        res.send(true);
    }
  
});


router.get("/checkEmailBlock/:email_address", auth, async (req, res) => {
    const EmailAdress = req.params.email_address;

    const checkEmailBlock = await BlockDB.find({ email_addresses: EmailAdress });

    if (checkEmailBlock === undefined || checkEmailBlock.length == 0) {
        res.send(false);
    }
    else {
        res.send(true);
    }

});


router.get("/getAllBlockIPAddress", auth, async (req, res) => {


    const blockIPAdressList = await BlockDB.find().select('ip_addresses');
    res.send(blockIPAdressList);
  

});

router.get("/getAllBlockEmailAddress/:company_id", auth, async (req, res) => {

    const company_id = req.params.company_id;
    const blockIPAdressList = await BlockDB.find({company_id: company_id}).select('email_addresses');
    res.send(blockIPAdressList);


});

router.post("/searchBlockIPAddress", auth, async (req, res) => {
   
    const BlockData = await BlockDB.find().select('ip_addresses');
    let allData = BlockData[0]['ip_addresses'];
    res.send(allData);
}); 


router.post("/searchBlockEmailAddress", auth, async (req, res) => {

    const BlockData = await BlockDB.find().select('email_addresses');
    let allData = BlockData[0]['email_addresses'];
    res.send(allData);

     
}); 

router.get("/getUserRegisterBlockKeywordsData", auth_user, async (req, res) => {
    const getBlockKeywords = await BlockDB.find().select('block_keywords');    
    res.send(getBlockKeywords[0]);

}); 

router.post("/addBlockKeyword", auth, async (req, res) => {
    const keyword = req.body.keyword;
  

    const addNewBlockKeyword = await BlockDB.updateMany({
        $push: {
            'block_keywords': keyword
        }
    });

    if (addNewBlockKeyword === undefined || addNewBlockKeyword.length == 0) {
        res.send(false);
    }
    else {
        res.send(true);
    }
});

router.post("/removeBlockKeyword", auth, async (req, res) => {
    const keyword = req.body.keyword;
    const company_id = req.body.company_id;

    const removeNewBlockKeyword = await BlockDB.find({ company_id: company_id }).updateMany({
        $pull: {
            'block_keywords': keyword
        }
    });

    if (removeNewBlockKeyword === undefined || removeNewBlockKeyword.length == 0) {
        res.send(false);
    }
    else {
        res.send(true);
    }
});

router.get("/getBlockKeywordsData/:company_id", auth, async (req, res) => {
    const company_id = req.params.company_id;
    const getBlockKeywords = await BlockDB.find({company_id:company_id}).select('block_keywords');
    res.send(getBlockKeywords[0]);
 

}); 

module.exports = router;