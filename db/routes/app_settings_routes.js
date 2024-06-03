const { AppSettings } = require("../models/app_settings_db");
const auth = require("../middleware/auth"); 
const auth_user = require("../middleware/auth_user"); 
const express = require("express");
const router = express.Router();
 
process.on('unhandledRejection', (reason, promise) => {
    //console.log("Reason: ", reason, "promise: ", promise);
});

process.on('warning', e => console.warn(e.stack));


router.get("/getAllSettings/:company_id", auth, async (req, res) => {
    let company_id = req.params.company_id;
    const getAllSettings = await AppSettings.find({company_id:company_id});
    res.send(getAllSettings[0]);

}); 



router.post("/updateNotification", auth, async (req, res) => {
    const notification = req.body.notification;

    try {
        const appSettingsUpdate = await AppSettings.updateMany({ notification: notification });
        //  res.send(result);
        if (appSettingsUpdate === undefined || appSettingsUpdate.length == 0) {
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


router.get("/getNotification", auth, async (req, res) => {
    const getNotification = await AppSettings.find().select('notification');  
    res.send(getNotification[0]['notification']);

}); 



router.get("/getNotificationAndDisplayLimit", auth, async (req, res) => {

    const getNotificationAndDisplayLimitData = await AppSettings.find().select('display_limit notification');
    res.send(getNotificationAndDisplayLimitData[0]);

});
 
 
 

router.post("/updateFooterText", auth, async (req, res) => {
    const footer_text = req.body.footerText;

    try {
        const appSettingsUpdate = await AppSettings.updateMany({ footer_text: footer_text });
        //  res.send(result);
        if (appSettingsUpdate === undefined || appSettingsUpdate.length == 0) {
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

router.get("/getPrivacyPolicyText", auth, async (req, res) => {
    const getPrivacyText = await AppSettings.find().select('privacy_policy');
    try {
        res.send(getPrivacyText[0]['privacy_policy']);
    }

    catch (e) {
        res.send('');
    }
   

}); 


router.post("/updatePrivacyPolicyText", auth, async (req, res) => {
    const privacy_policy = req.body.privacy_policy;

    try {
        const appSettingsUpdate = await AppSettings.updateMany({ privacy_policy: privacy_policy });
 
        if (appSettingsUpdate === undefined || appSettingsUpdate.length == 0) {
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


router.get("/getChatGPTText", auth, async (req, res) => {
    const getChatGPTPromptText = await AppSettings.find().select('chatgpt_prompt');
    try {
        res.send(getChatGPTPromptText[0]['chatgpt_prompt']);
    }

    catch (e) {
        res.send('');
    }
   

}); 


router.post("/updateChatGPTText", auth, async (req, res) => {
    const chatgpt_prompt = req.body.chatgpt_prompt;

    try {
        const appSettingsUpdate = await AppSettings.updateMany({ chatgpt_prompt: chatgpt_prompt });
 
        if (appSettingsUpdate === undefined || appSettingsUpdate.length == 0) {
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

router.get("/getFooterText", auth, async (req, res) => {
    const getFooterText = await AppSettings.find().select('footer_text');
    let footer_text = getFooterText[0]['footer_text'];
    if (res.statusCode) {
        res.send(footer_text);
    }
  

}); 




router.post("/updateLogoImage", auth, async (req, res) => {
    const app_images = req.body.logoImage;

    try {
        const appSettingsUpdate = await AppSettings.updateMany({ app_images: app_images });
      
        if (appSettingsUpdate === undefined || appSettingsUpdate.length == 0) {
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


router.get("/getLogoImage", auth, async (req, res) => {
    const getFooterText = await AppSettings.find().select('app_images');

    try {
        console.log('push');
        res.push(getFooterText[0]['app_images']);
    }

    catch(e){
        console.log('push not working using send');
        res.send(getFooterText[0]['app_images']);
    }
    

}); 

router.get("/getDisplayLimit", auth, async (req, res) => {

    const getDisplayLimitData = await AppSettings.find().select('display_limit');
    res.send(getDisplayLimitData[0]);

});

router.post("/updateDisplayLimit", auth, async (req, res) => {
    const display_limit = parseInt(req.body.display_limit);
    
    try {
        const appSettingsUpdate = await AppSettings.updateMany({ display_limit: display_limit });
        //  res.send(result);
        if (appSettingsUpdate === undefined || appSettingsUpdate.length == 0) {
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






router.post("/updateCompanyName", auth, async (req, res) => {
    const company_name = req.body.companyName;

    try {
        const appSettingsUpdate = await AppSettings.updateMany({ company_name: company_name });

        if (appSettingsUpdate === undefined || appSettingsUpdate.length == 0) {
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

router.post("/updateSendEmailCredentials", auth, async (req, res) => {
    
    const email_smtp_secure = req.body.email_smtp_secure;
    const email_hostname = req.body.email_hostname;
    const email_port = req.body.email_port;
    const email_username = req.body.email_username;
    const email_password = req.body.email_password;
    const company_id = req.body.company_id;

    try {
        const appSettingsUpdate = await AppSettings.find({company_id:company_id}).updateMany({ email_smtp_secure: email_smtp_secure,
            email_hostname: email_hostname, email_port: email_port, email_username: email_username, email_password: email_password });

        if (appSettingsUpdate === undefined || appSettingsUpdate.length == 0) {
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

router.get("/removeSendEmailCredentials", auth, async (req, res) => {
    

    try {
        const appSettingsUpdate = await AppSettings.updateMany({ email_smtp: false, email_smtp_secure: false,
            email_hostname: '', email_port: '', email_username: '', email_password: '' });

        if (appSettingsUpdate === undefined || appSettingsUpdate.length == 0) {
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


router.post("/updateTimezone", auth, async (req, res) => {
    const timezone = req.body.timezone;
    const company_id = req.body.company_id;

    try {
        const appSettingsUpdate = await AppSettings.find({company_id:company_id}).updateMany({ timezone: timezone });
        //  res.send(result);
        if (appSettingsUpdate === undefined || appSettingsUpdate.length == 0) {
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

router.get("/getTimezone/:company_id", auth_user, async (req, res) => {
   
    let company_id = req.params.company_id;
    const getTimezone = await AppSettings.find({company_id:company_id}).select('timezone');
    try {
        res.send(getTimezone[0]['timezone']);
    }

    catch (e) {
        res.send('');
    }
   

}); 




module.exports = router;