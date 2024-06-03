const { AdminChatArchive } = require("../models/admin_chat_archive_db");
const { AdminChatDetails } = require("../models/admin_chat_details_db");
const auth = require("../middleware/auth");
const express = require("express");
const { ObjectID } = require("mongodb");
const router = express.Router();
let chat_length = 25;
let min_limit = parseInt(chat_length) - 1; 

process.on('unhandledRejection', (reason, promise) => {
    //console.log("Reason: ", reason, "promise: ", promise);
});

process.on('warning', e => console.warn(e.stack));




router.post("/insertAdminChatArchiveData", auth, async (req, res) => {

    const chat_id = req.body.chat_id;
  
     
    const ChatDataArchive = await AdminChatArchive.find({ chat_id: chat_id });

    if (parseInt(ChatDataArchive.length) == 0) {

        const ChatDataDetails = await AdminChatDetails.find({ chat_id: chat_id }).select('admin_one_id admin_two_id admin_one_username admin_two_username company_id');
 

        let admin_archive = new AdminChatArchive({
            chat_id: chat_id,
            admin_one_id: ChatDataDetails[0].admin_one_id,
            admin_two_id: ChatDataDetails[0].admin_two_id,
            admin_one_username: ChatDataDetails[0].admin_one_username,
            admin_two_username: ChatDataDetails[0].admin_two_username,
            company_id: ChatDataDetails[0].company_id
        });

        try {
            let result = await admin_archive.save();
           
            if (result === undefined || result.length == 0) {
         
                error = 1;
            }
            
        }
        catch (e) {
            
        }

       
    }
    let username_array = [];
    let messages_array = [];
    let date_array = [];
    let usertype_array = [];
    let max_length = 0;
    let no_of_chat;

    let ChatData = await AdminChatDetails.find({ chat_id: chat_id });
 
    if (parseInt(ChatData[0]['messages'].length) > parseInt(chat_length)) {
        
        no_of_chat = parseInt(ChatData[0]['messages'].length) - parseInt(chat_length);
        let max_length = no_of_chat;
        let no_of_chunk = parseInt(no_of_chat) / parseInt(chat_length);
        let chunk = Math.round(parseInt(no_of_chunk));
        let min = 0;
        let max = -1;
        

                
                   
                    for (let j = 0; j <= parseInt(no_of_chat); j++) {

                        if (ChatData[0]['username'][j] !== undefined) {                           
                            username_array.push(ChatData[0]['username'][j]);
                            messages_array.push(ChatData[0]['messages'][j]);
                            date_array.push(ChatData[0]['date'][j]);
                            usertype_array.push(ChatData[0]['usertype'][j]);
                        }


                    }

                 

                    let ChatDataArchive = await AdminChatArchive.find({ chat_id: chat_id });

                    let archive_username_array = ChatDataArchive[0]['username'];
                    let archive_messages_array = ChatDataArchive[0]['messages'];
                    let archive_date_array = ChatDataArchive[0]['date'];
                    let archive_usertype_array = ChatDataArchive[0]['usertype'];

              

                    let new_archive_username_array = archive_username_array.concat(username_array);
                    let new_archive_message_array = archive_messages_array.concat(messages_array);
                    let new_archive_date_array = archive_date_array.concat(date_array);
                    let new_archive_usertype_array = archive_usertype_array.concat(usertype_array);

                  
         
             

                    const chat2 = await AdminChatArchive.updateMany({ chat_id: chat_id }, {
                        $set: {
                                username: new_archive_username_array,
                                messages: new_archive_message_array,
                                date: new_archive_date_array,
                                usertype: new_archive_usertype_array
                            
                        }
                    });

                    username_array = [];
                    messages_array = [];
                    date_array = [];
                    usertype_array = [];
                


            
        

    }

    let get_exsisting_array_length = ChatData[0]['messages'].length;
    let exsisting_username_array = [];
    let exsisting_messages_array = [];
    let exsisting_date_array = [];
    let exsisting_usertype_array = [];
 

 

    for (let i = parseInt(no_of_chat); i < parseInt(get_exsisting_array_length); i++) {
        exsisting_username_array.push(ChatData[0]['username'][i])
        exsisting_messages_array.push(ChatData[0]['messages'][i]);
        exsisting_date_array.push(ChatData[0]['date'][i]);
        exsisting_usertype_array.push(ChatData[0]['usertype'][i]);
    }

    
    
    await AdminChatDetails.updateMany({ chat_id: chat_id }, {
        $set: { 
                username: exsisting_username_array,
                messages: exsisting_messages_array,
                date: exsisting_date_array,
                usertype: exsisting_usertype_array
            
        }
    });

    


    res.send(true);
}); 


router.post("/getAdminChatArchiveData", auth, async (req, res) => { 

    let chat_id = req.body.chat_id;
    let max = parseInt(req.body.limit);
    let min = parseInt(max) - parseInt(min_limit);

    

    if (min <=25) {
        min = 0; 
    }

 

    const ChatDataArchive = await AdminChatArchive.find({ chat_id: chat_id }).select('username messages date usertype');

    let username = ChatDataArchive[0].username;
    let messages = ChatDataArchive[0].messages;
    let date = ChatDataArchive[0].date;
    let usertype = ChatDataArchive[0].usertype;

    let chat_history = {
        username: [],
        messages: [],
        date: [],
        usertype: []
    }; 

    if (parseInt(req.body.limit) > 0) {
    

        let usename_array = username.slice(min, max);
        let messages_array = messages.slice(min, max);
        let date_array = date.slice(min, max);
        let usertype_array = usertype.slice(min, max);


         chat_history = {
            username: usename_array,
            messages: messages_array,
            date: date_array,
            usertype: usertype_array
        }; 

    }

    res.send(chat_history);
    
    
});


router.post("/getAdminChatArchiveDataLimit", auth, async (req, res) => {

    let chat_id = req.body.chat_id; 

    let usename_array = [];
    let messages_array = [];
    let date_array = [];
    let usertype_array = [];
    let limit = 0;

    let ChatDataArchive = await AdminChatArchive.find({ chat_id: chat_id }).select('username messages date usertype');

    if (parseInt(ChatDataArchive.length) > 0) {
        limit = parseInt(ChatDataArchive[0].username.length) - 1;
         
    }  

    let limit_array = {
        limit: limit
    };
   
    res.send(limit_array);
});


router.post("/getAllAdminChatArchiveDataSearch", auth, async (req, res) => {

    let chat_id = req.body.chat_id; 
    const ChatDataArchive = await AdminChatArchive.find({ chat_id: chat_id }).select('username messages date usertype chat_id');
    res.send(ChatDataArchive);
});


module.exports = router;