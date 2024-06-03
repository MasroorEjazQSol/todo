const { Chat, validate } = require("../models/chat_db");
const { ChatDetails } = require("../models/chat_details_db");
const { ChatCloseDetails } = require("../models/chat_close_details_db");
const { ChatClose } = require("../models/chat_close_db");
const { Dept } = require("../models/dept_db");
const { BlockDB } = require("../models/block_db");
const { User } = require("../models/user_db");
const auth = require("../middleware/auth"); 
const auth_non_secure = require("../middleware/auth_non_secure"); 
const express = require("express"); 
const jwt = require('jwt-simple'); 
const aws = require('aws-sdk');
const multerS3 = require('multer-s3');
const router = express.Router();
var ObjectId = require('mongodb').ObjectID;
var fs = require('fs');
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

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

router.get("/testDept", auth, async (req, res) => {
    let DeptArray = await Dept.find().select('_id dept_name tickets_dept_guide');
    let query = "<div>Hello,</div><br><div> Please send me discount code.</div><div>Thank you.</div>";
    let ask = DeptArray+" go thorugh all the tickets_dept_guide arrays and return the _id which matches according to customer query. If unable to match go through the dept_name and match then return the _id. Ignore html elements.  Customer query: "+query+" Don't write code just return single _id not dept_name. Return only one single string of _id. Result should not exceeds more then one single _id and/or word not any other details.";
    

    try {
        const completion = await openai.createCompletion({
            model: "gpt-3.5-turbo-instruct",
            temperature: 1,
            top_p: 1,
            max_tokens: 1000,
            prompt: ask,   
          }); 
      
         let dept_id=completion.data.choices[0].text;
         res.send(dept_id); 

    } catch (e) {      
        console.log(e);
        res.send('ERROR');
    }
     
}); 


router.get("/updateEndDateChat", auth, async (req, res) => {
    

     
     let chatDate = await ChatClose.find().select('_id last_msgs_time');

     for(let i=0;i<chatDate.length;i++){
        let id=chatDate[i]._id.toString();
        let last_msgs_time = chatDate[i].last_msgs_time;
         

        try {
            await ChatCloseDetails.updateMany({ chat_id: id }, {
                $set: {
                    'last_msgs_time': last_msgs_time
                }
            });
        }

        catch(e){
            console.log(e)
        }
       
     }
     
    res.send('www');
 
}); 

 
router.get("/addStartDateToChat", auth, async (req, res) => {
    

    let chatDate = await ChatDetails.find().select('_id date');
   
  

    for(let i=0;i<parseInt(chatDate.length);i++){
       let id = chatDate[i]._id;
       let date = chatDate[i].date[0];
       
       //  // Split the original date string using dots
       let dateParts = date.split('.');

       // // Switch the positions of the first and second values
       let switchedDate = dateParts[1] + '.' + dateParts[0] + '.' + dateParts.slice(2).join('.');


        
       
       date = new Date(switchedDate);
 

       try {
           await ChatDetails.updateMany({ _id: id, first_msgs_time: '' }, {
               $set: {
                   'first_msgs_time': date
               }
           });
       }

       catch(e){
           console.log(e)
       }
      
      
    }

    chatDate = await ChatCloseDetails.find().select('_id date');

    for(let i=0;i<parseInt(chatDate.length);i++){
       let id = chatDate[i]._id;
       let date = chatDate[i].date[0];

       // Split the original date string using dots
       let dateParts = date.split('.');

       // Switch the positions of the first and second values
       let switchedDate = dateParts[1] + '.' + dateParts[0] + '.' + dateParts.slice(2).join('.');

      

       date = new Date(switchedDate);

      

       try {
           await ChatCloseDetails.updateMany({ _id: id }, {
               $set: {
                   'first_msgs_time': date
               }
           });
       }

       catch(e){
           console.log(e)
       }
      
     
    }

   res.send('www');

}); 
 
// router.get("/transferCloseChat", auth, async (req, res) => { 

//     try {
//         let ChatData = await ChatClose.find({ isActive: false }).select('_id');

        
        
//        for (const chat of ChatData) {
//         let chat_id = chat._id.toString();

//         // Find data from ChatDetails
//         let ChatDetailsData = await ChatDetails.find({ chat_id: chat_id }).select('-_id');

//         const ChatCloseDetailsData = new ChatCloseDetails({
//             chat_id: chat_id,
//             dept_id: ChatDetailsData[0].dept_id,
//             username: ChatDetailsData[0].username,
//             messages: ChatDetailsData[0].messages,
//             date: ChatDetailsData[0].date,
//             usertype: ChatDetailsData[0].usertype,
//             emoji: ChatDetailsData[0].emoji,
//             last_msgs_time: ChatDetailsData[0].last_msgs_time,
//             user_name: ChatDetailsData[0].user_name,
//             user_email: ChatDetailsData[0].user_email,
//             subject: ChatDetailsData[0].subject,  
//             ticket_number: ChatDetailsData[0].ticket_number,
//             last_msgs_user: ChatDetailsData[0].last_msgs_user,  
//             last_msgs_msg: ChatDetailsData[0].last_msgs_msg, 
//             last_msgs_date: ChatDetailsData[0].last_msgs_date, 
//             local_filename: ChatDetailsData[0].local_filename, 
//             aws_filename: ChatDetailsData[0].aws_filename,  
//             last_emoji: ChatDetailsData[0].last_emoji                     
//         });
        
//         await ChatCloseDetailsData.save();
//         await ChatDetails.deleteMany({ chat_id: chat_id });
       
//     }

//         res.send(ChatData);
//     } catch (error) {
//         console.error(error);
//         res.status(500).send("Internal Server Error");
//     }
// }); 
 


 
router.post("/startNewChat", auth, async (req, res) => { 

     
  
    const dept_id = req.body.deptID;
    const admin_id = req.body.adminID;
    const user_name = req.body.username;
    const user_email = req.body.email;
    const unread_msgs = req.body.unread;
    const last_msgs_user = req.body.last_msgs_user;
    const last_msgs_msg = req.body.last_msgs_msg;
    const message = req.body.message;
    const last_msgs_date = req.body.chatDate;
    const user_ip_address = req.body.IPAddress;
    const subject = req.body.subject;
    const priority = req.body.priority;
    const user_id = req.body.user_id;
    const dept_name = req.body.dept_name;
    const local_filename = req.body.local_filename; 
    const emoji = req.body.emoji;
    const company_id = req.body.company_id;
    
    var digits=String(new Date().valueOf()).slice(-4);    
    var digits_two = Math.floor(10000 + Math.random() * 90000);

    let ticket_number = dept_name[0].toUpperCase() + digits_two + digits;

    let  last_msg_string = last_msgs_msg;
 
    let ask = 'Recognize the issue customer is facing. Return in the following ; seperated value for example ISSUE_SHORT_HERE; ISSUE_LONG_HERE in ISSUE_SHORT_HERE return the issue custoemer is facing in 1 word and in ISSUE_LONG_HERE return in max 5 words. Replace both ISSUE_SHORT_HERE; ISSUE_LONG_HERE and return the result in single line. Only recognize and retrun the issue ignore things like "please","thank you" etc. Ignore file attachments and html elements. Focus on customer message. Customer query:'+message;
    let issue_short = "";
    let issue_long = "";
    

    try {
        const completion = await openai.createCompletion({
            model: "gpt-3.5-turbo-instruct",
            temperature: 1,
            top_p: 1,
            max_tokens: 1000,
            prompt: ask,   
          }); 
      
         let issues=completion.data.choices[0].text;
         issues = issues.split(';');
         issue_short = issues[0].trim();
         issue_long = issues[1].trim();

    } catch (e) {      
        console.log(e);
        return '';
    }
     
   

    const chat = new Chat({
        dept_id: dept_id,
        dept_name: dept_name,
        admin_id: admin_id,
        user_name: user_name,
        user_email: user_email,
        unread_msgs: unread_msgs,
        last_msgs_user: last_msgs_user,
        last_msgs_msg: last_msg_string,
        last_msgs_date: last_msgs_date,
        user_ip_address: user_ip_address,
        subject: subject,
        priority: priority,
        user_id: user_id,
        ticket_number: ticket_number,
        last_emoji: emoji,
        company_id: company_id
    });

     
        const result = await chat.save();
        let chat_id = String(result._id);

        let new_ticket_subject = subject + ' - ' + ticket_number;

        await Chat.updateMany({ _id: chat_id }, {
            $set: {
                'subject': new_ticket_subject
            }
        });
    
 
        if(process.env.AWS_UPLOAD!=='TRUE'){ 
            const chat_details =   new ChatDetails({
                chat_id: chat_id,
                dept_id: dept_id,
                username: user_name,
                messages: message,
                date: last_msgs_date,
                usertype: "user",
                last_msgs_date: last_msgs_date,
                last_msgs_msg: last_msgs_msg,
                last_msgs_user: user_name,
                subject: subject,
                ticket_number: ticket_number,
                user_email: user_email,
                user_name: user_name,
                local_filename: local_filename,
                emoji: emoji,
                last_emoji: emoji,
                issue_short: issue_short,
                issue_long: issue_long,
                company_id: company_id
            });
    
      
            await chat_details.save();
        }

        if(process.env.AWS_UPLOAD==='TRUE'){ 
            const chat_details =   new ChatDetails({
                chat_id: chat_id,
                dept_id: dept_id,
                username: user_name,
                messages: message,
                date: last_msgs_date,
                usertype: "user",
                last_msgs_date: last_msgs_date,
                last_msgs_msg: last_msgs_msg,
                last_msgs_user: user_name,
                subject: subject,
                ticket_number: ticket_number,
                user_email: user_email,
                user_name: user_name,
                aws_filename: local_filename,
                emoji: emoji,
                last_emoji: emoji,
                issue_short: issue_short,
                issue_long: issue_long,
                company_id: company_id
            });
    
      
            await chat_details.save();
        }

   

    const deptID = ObjectId(dept_id);
    await Dept.updateMany({ _id: deptID }, {
        $inc: {
            'unread_msgs': '1'
        }
    });

    let user_open_chat= await Chat.count({user_id: user_id});
    let user_close_chat= await ChatClose.count({user_id: user_id});
    let total_chats = parseInt(user_open_chat) + parseInt(user_close_chat);

    await User.updateMany({ _id: user_id }, {
        $set: {
            'total_no_of_tickets': total_chats
        }
    });

    let ChatDataFind = await Chat.find({ _id: chat_id }).select('_id ticket_number');

    res.send(ChatDataFind);

}); 


router.get("/getUserEmailAndIPAddress/:chat_id", auth, async (req, res) => {
    const chatID = req.params.chat_id;
    let ChatData = await Chat.find({ _id: chatID }).select('user_ip_address user_email');

 

    if(ChatData.length===0){
      
        ChatData = await ChatClose.find({ _id: chatID }).select('user_ip_address user_email');
       
    }

    res.send(ChatData[0]);
}); 


router.post("/updateChat", auth, async (req, res) => {
   
    let chat_id = ObjectId(req.body.chatID);
    let deptID = ObjectId(req.body.deptID);
    const user_name = req.body.username;
    const last_msgs_user = req.body.username;
    const last_msgs_msg = req.body.last_message;
    const user_msg = req.body.message;
    const last_msgs_date = req.body.chatDate;
    const last_msgs_time = Date.now();
    const user_ip_address = req.body.IPAddress; 
    const local_filename = req.body.local_filename; 
    const emoji = req.body.emoji;


    if (last_msgs_msg.match(/\.(jpeg|jpg|gif|png)$/) != null) {
        last_msgs_msg = 'image';
    }

    let last_msg_string = "";

    if (last_msgs_msg.length > 18) {
        let dots = "...";
        last_msg_string = last_msgs_msg.substring(0, 18) + dots;
    }

    else {
        last_msg_string = last_msgs_msg;
    }

     await Chat.updateMany({ _id: chat_id }, {
        $set: {
            'last_msgs_user': last_msgs_user,
            'last_msgs_msg': last_msg_string,
            'last_msgs_date': last_msgs_date,
            'last_msgs_time': last_msgs_time,
            'user_unread_msgs': 0,
            'user_ip_address': user_ip_address,
            'last_emoji': emoji
        }
    });


    const ChatData = await Chat.find({ '_id': chat_id }).select('unread_msgs');

    let unread_chat_chk = ChatData[0].unread_msgs;

   

    
    await Chat.updateMany({ _id: chat_id }, {
        $inc: {
            'unread_msgs': 1           
        }
    });

 
    if(process.env.AWS_UPLOAD!=='TRUE'){
       
        await ChatDetails.updateMany({ chat_id: chat_id }, {
            $push: {
                username: user_name,
                messages: user_msg,
                date: last_msgs_date,
                usertype: "user",
                local_filename: local_filename,
                emoji: emoji
            }
        }

        );
    }

    if(process.env.AWS_UPLOAD==='TRUE'){
        await ChatDetails.updateMany({ chat_id: chat_id }, {
            $push: {
                username: user_name,
                messages: user_msg,
                date: last_msgs_date,
                usertype: "user",
                aws_filename: local_filename,
                emoji: emoji
            }
        }

        );
    }
    

        await ChatDetails.updateMany({ chat_id: chat_id }, {
            $set: {
                last_msgs_user: user_name,
                last_msgs_msg: user_msg,
                last_msgs_date: last_msgs_date,
                last_emoji: emoji
            }
        }
        );


        if(parseInt(unread_chat_chk)==0){
            await Dept.updateMany({ _id: deptID }, {
                $inc: {
                    'unread_msgs': 1
                }
            });
        }
    
        
    
        if (req.body.adminID != 0) {
            const admin_id = req.body.adminID;
            await Chat.updateMany({ _id: chat_id }, {
                $set: {
                    'admin_id': admin_id,
                    'draft': ''
                }
            });
        }

       
   res.send(true);

}); 


router.post("/updateChatAdmin", auth, async (req, res) => {
     

    let chat_id = ObjectId(req.body.chatID);
    let deptID = ObjectId(req.body.deptID);
    let user_name = req.body.username; 
    let last_msgs_user = req.body.username;
    let last_msgs_msg = req.body.last_message;
    let user_msg = req.body.message;
    let last_msgs_date = req.body.chatDate;
    let last_msgs_time = Date.now(); 
    let unread_one = parseInt(1);
    let admin_id = req.body.adminID;
    let local_filename = req.body.local_filename; 
    let emoji = '😃 Happy';


    try {
        const ChatDataUnread = await Chat.find({ '_id': chat_id, unread_msgs: { $gt: 0 } } ).select('unread_msgs');
        
         if(parseInt(ChatDataUnread.length) > 0){
                await Dept.updateMany({ _id: deptID, unread_msgs: { $gt: 0 } }, {
                    $inc: {
                        'unread_msgs': -1
                    }
        
                })
         }   

          
    }
    catch (e) {
   

    }
  

    if (last_msgs_msg.match(/\.(jpeg|jpg|gif|png)$/) != null) {
        last_msgs_msg = 'image';
    }

    let last_msg_string = "";

    if (last_msgs_msg.length > 18) {
        let dots = "...";
        last_msg_string = last_msgs_msg.substring(0, 18) + dots;
    }

    else {
        last_msg_string = last_msgs_msg;
    }

    

    if ((!user_msg.includes('Ticket has been transfer'))) {
         await Chat.updateMany({ _id: chat_id },
            {
                $set: {
                    'last_msgs_user': last_msgs_user,
                    'last_msgs_msg': last_msg_string,
                    'last_msgs_date': last_msgs_date,
                    'last_msgs_time': last_msgs_time,
                    'admin_id' : admin_id,
                    'unread_msgs': 0,
                    'draft': ''             
                },
                $inc: { 
                    'user_unread_msgs': unread_one                           
                }
            });

        
    

    }

    else {
        await Chat.updateMany({ _id: chat_id },
            {
                $set: {
                    'last_msgs_user': last_msgs_user,
                    'last_msgs_msg': last_msg_string,
                    'last_msgs_date': last_msgs_date,
                    'last_msgs_time': last_msgs_time,
                    'admin_id' : admin_id,
                    'draft': ''                             
                },
                $inc: {
                    'unread_msgs': '1',
                    'user_unread_msgs': '1'
                }
            });
    }

    try {

        await ChatDetails.updateMany({ chat_id: chat_id }, {
            $push: {
                username: user_name,
                messages: user_msg,
                date: last_msgs_date,
                usertype: admin_id,
                emoji: emoji,
                local_filename: local_filename
            },$set: {
                last_msgs_user: user_name,
                last_msgs_msg: user_msg,
                last_msgs_date: last_msgs_date,
                last_msgs_time: last_msgs_time,
                admin_id: admin_id
            }
        }
        );
         

        // if(process.env.AWS_UPLOAD!=='TRUE'){
        //     await ChatDetails.updateMany({ chat_id: chat_id }, {
        //         $push: {
        //             username: user_name,
        //             messages: user_msg,
        //             date: last_msgs_date,
        //             usertype: admin_id,
        //             emoji: emoji,
        //             local_filename: local_filename
        //         },$set: {
        //             last_msgs_user: user_name,
        //             last_msgs_msg: user_msg,
        //             last_msgs_date: last_msgs_date,
        //             last_msgs_time: last_msgs_time
        //         }
        //     }
        //     );
        //  }
        

    
        // if(process.env.AWS_UPLOAD==='TRUE'){
        //     await ChatDetails.updateMany({ chat_id: chat_id }, {
        //         $push: {
        //             username: user_name,
        //             messages: user_msg,
        //             date: last_msgs_date,
        //             usertype: admin_id,
        //             emoji: emoji,
        //             aws_filename: local_filename
        //         },$set: {
        //             last_msgs_user: user_name,
        //             last_msgs_msg: user_msg,
        //             last_msgs_date: last_msgs_date,
        //             last_msgs_time: last_msgs_time
        //         }
        //     }
        //     );
        // }

        



    
    }

    catch (e) {
       
    }

 

   

    res.send(true);

});  



router.get("/getDeptChatList/:dept_id/:dept_boolean", auth, async (req, res) => { 
    
    const deptID = req.params.dept_id;
    const deptBoolean = req.params.dept_boolean;    
    let ChatData = [];
  

    if(deptBoolean=='true'){
        ChatData = await Chat.find({ dept_id: deptID, isActive: deptBoolean }).select('_id last_msgs_user last_msgs_msg last_msgs_date unread_msgs user_name subject priority user_id chat_ratings isActive isBlock dept_id user_email ticket_number last_emoji email_service').sort('-last_msgs_time');
        const priorityOrder = {
            High: 3,
            Medium: 2,
            Low: 1,
          };
          
          const sortedTickets = ChatData.sort((a, b) => {
            const aPriority = priorityOrder[a.priority] || 0;
            const bPriority = priorityOrder[b.priority] || 0;
          
            // Sort by priority in descending order
            if (aPriority > bPriority) {
              return -1; // a comes before b
            } else if (aPriority < bPriority) {
              return 1; // b comes before a
            }
          
            // Sort by unread messages
            if (a.unread_msgs > 0 && b.unread_msgs <= 0) {
              return -1; // a comes before b
            } else if (a.unread_msgs <= 0 && b.unread_msgs > 0) {
              return 1; // b comes before a
            }
          
            // Sort by latest time
            return new Date(b.last_msgs_date) - new Date(a.last_msgs_date);
          });

          const unreadTickets = sortedTickets.filter((ticket) => ticket.unread_msgs > 0);
          const readTickets = sortedTickets.filter((ticket) => ticket.unread_msgs <= 0);

          const combinedTickets = unreadTickets.concat(readTickets);
      
         ChatData = combinedTickets;
    }
    
    else {
        ChatData = await ChatClose.find({ dept_id: deptID }).select('_id last_msgs_user last_msgs_msg last_msgs_date unread_msgs user_name subject priority user_id chat_ratings isActive isBlock dept_id user_email ticket_number last_emoji email_service').sort('-last_msgs_time');
    }
    
  
    res.send(ChatData);
}); 

 



router.get("/getUserChatList/:user_id/:isActive", auth, async (req, res) => {
  
    const userID = req.params.user_id; 
    const isActive = req.params.isActive; 
    let ChatData = [];


    if(isActive=='true'){
        ChatData = await Chat.find({ user_id: userID }).select('_id last_msgs_user last_msgs_msg last_msgs_date user_unread_msgs user_name subject priority dept_name chat_ratings isActive ticket_number dept_id last_emoji').sort('-last_msgs_time');
     
    }

    else {
        ChatData = await ChatClose.find({ user_id: userID }).select('_id last_msgs_user last_msgs_msg last_msgs_date user_unread_msgs user_name subject priority dept_name chat_ratings isActive ticket_number dept_id chat_ratings last_emoji').sort('-last_msgs_time');
  
    }


    res.send(ChatData);
}); 

router.get("/getUserChatDetailsForEmail/:chat_id", auth, async (req, res) => {
    const chat_id = ObjectId(req.params.chat_id);
    const ChatData = await Chat.find({ _id: chat_id }).select('user_name user_email subject ticket_number');
    res.send(ChatData);
}); 

  

router.get("/closeChat/:chat_id/:dept_id", auth, async (req, res) => {
    const chatID = ObjectId(req.params.chat_id);
    const deptID = ObjectId(req.params.dept_id);

    const ChatData2 = await Chat.find({ '_id': chatID }).select('unread_msgs');
    let unread_msgs = ChatData2[0].unread_msgs;
    
 
    let ChatData = '';

     ChatData = await Chat.find({ _id: chatID }).updateMany({ isActive: false, unread_msgs: 0, user_unread_msgs: 0 });
 
  
     if(unread_msgs>0){
         await Dept.updateMany({ _id: deptID, unread_msgs: { $gt: 0 } }, {
            $inc: {
                'unread_msgs': -1
            }
        });

        
    }


        ChatData = await Chat.find({ _id: chatID });

 
 
        let dept_id = ChatData[0].dept_id;
        let admin_id = ChatData[0].admin_id;
        let user_name = ChatData[0].user_name;
        let user_email = ChatData[0].user_email;    
        let last_msgs_user = ChatData[0].last_msgs_user;
        let last_msgs_msg = ChatData[0].last_msgs_msg;       
        let last_msgs_date = ChatData[0].last_msgs_date;          
        let user_ip_address = ChatData[0].user_ip_address;     
        let subject = ChatData[0].subject;
        let priority = ChatData[0].priority;
        let user_id =ChatData[0].user_id;
        let dept_name =ChatData[0].dept_name; 
        let ticket_number =ChatData[0].ticket_number;
        let isBlock =ChatData[0].isBlock;
        let chat_id = ChatData[0]._id;
        let chat_id_string = String(ChatData[0]._id);
        let last_emoji = ChatData[0].last_emoji;  
        let email_service = ChatData[0].email_service;          
        let last_msgs_time = Date.now();     
        let company_id = ChatData[0].company_id;  

        let chat = new ChatClose({
            dept_id: dept_id,
            dept_name: dept_name,
            admin_id: admin_id,
            user_name: user_name,
            user_email: user_email, 
            last_msgs_user: last_msgs_user,
            last_msgs_msg: last_msgs_msg,
            last_msgs_date: last_msgs_date,
            user_ip_address: user_ip_address,
            subject: subject,
            priority: priority,
            user_id: user_id,
            ticket_number: ticket_number,  
            isBlock: isBlock,
            isActive: false,
            last_emoji: last_emoji,
            email_service: email_service,
            last_msgs_time: last_msgs_time,
            company_id: company_id
        });

      

        let result = await chat.save(); 
        let close_chat_id = String(result._id);   
       

        // await ChatDetails.updateMany({ chat_id: chat_id_string }, {
        //     $set: {
        //         'chat_id': close_chat_id,
        //         'isActive': false
        //     }
        // });

        let ChatDetailsData = await ChatDetails.find({ chat_id: chat_id_string }).select('-_id');

        const ChatCloseDetailsData = new ChatCloseDetails({
            chat_id: close_chat_id,
            dept_id: ChatDetailsData[0].dept_id,
            username: ChatDetailsData[0].username,
            messages: ChatDetailsData[0].messages,
            date: ChatDetailsData[0].date,
            usertype: ChatDetailsData[0].usertype,
            emoji: ChatDetailsData[0].emoji,
            last_msgs_time: last_msgs_time,
            user_name: ChatDetailsData[0].user_name,
            user_email: ChatDetailsData[0].user_email,
            subject: ChatDetailsData[0].subject,  
            ticket_number: ChatDetailsData[0].ticket_number,
            last_msgs_user: ChatDetailsData[0].last_msgs_user,  
            last_msgs_msg: ChatDetailsData[0].last_msgs_msg, 
            last_msgs_date: ChatDetailsData[0].last_msgs_date, 
            local_filename: ChatDetailsData[0].local_filename, 
            aws_filename: ChatDetailsData[0].aws_filename,  
            last_emoji: ChatDetailsData[0].last_emoji,
            issue_long: ChatDetailsData[0].issue_long,
            issue_short: ChatDetailsData[0].issue_short,
            first_msgs_time: ChatDetailsData[0].first_msgs_time,
            admin_id: admin_id,
            company_id: company_id                     
        });
        
        await ChatCloseDetailsData.save();
       

        await Chat.deleteMany({ _id: chatID });
        await ChatDetails.deleteMany({ chat_id: chat_id_string });
    


    res.send(close_chat_id);
}); 


router.get("/openChat/:chat_id", auth, async (req, res) => {
    const chatID = ObjectId(req.params.chat_id);
    const ChatData = await Chat.find({ _id: chatID }).updateMany({ isActive: true });
 

    if (ChatData === undefined || ChatData.length == 0) {
        res.send(false);
    }
    else {
        res.send(true);
    }
}); 

router.post("/transferChatToDept", auth, async (req, res) => {
    const chatID = ObjectId(req.body.chatID);
    const chat_id = req.body.chatID;
    const deptID = req.body.deptID;
    const deptName = req.body.deptName;
    const old_deptID = req.body.old_deptID;

    const ChatData2 = await Chat.find({ _id: chatID }).select('unread_msgs');
    let unread_msgs_dec = parseInt(ChatData2[0].unread_msgs);
    let old_deptID2 = ObjectId(old_deptID);
    let deptID2 = ObjectId(deptID);
 

    await Dept.updateMany({ _id: deptID2 }, {
        $inc: {
            'unread_msgs': 1
        }
    });

 
    await Dept.updateMany({ _id: old_deptID2, unread_msgs: { $lt: 0 } }, { 'unread_msgs': 0 });
    await Chat.updateMany({ _id: chatID, unread_msgs: { $lt: 0 } }, { 'unread_msgs': 0 });
   

    await Chat.find({ _id: chatID }).updateMany({ dept_id: deptID, dept_name: deptName });
    await ChatDetails.find({  chat_id: chat_id }).updateMany({ dept_id: deptID });
    
 
    res.send(true);
}); 

router.post("/changeChatPriority", auth, async (req, res) => {
    const chatID = ObjectId(req.body.chatID);
    const priority = req.body.priority;   

    try {
        await Chat.find({ _id: chatID }).updateMany({ priority: priority });
   
        res.send(true);
    }
    catch (e) {
        console.log(e);
        res.send(false);
    }
    
}); 


router.post("/updateChatUnreadMsgs", auth, async (req, res) => {
    const chatID = ObjectId(req.body.chatID); 
 
    try {
        const chatUpdate = await Chat.updateMany({ _id: chatID }, {
            $inc: {
                'unread_msgs': '1'
            }
        });

        if (chatUpdate === undefined || chatUpdate.length == 0) {
            res.send(false);
        }
        else {
            res.send(true);
        }
    }
    catch (e) {
        res.send(e.message);
    }

}); 

router.post("/updateUserChatUnreadMsgs", auth, async (req, res) => {
    const chatID = ObjectId(req.body.chatID);
    const unread_msgs = parseInt(req.body.unread_msgs);

    try {
        const chatUpdate = await Chat.updateMany({ _id: chatID }, {
            $inc: {
                'user_unread_msgs': unread_msgs
            }
        });
  
        if (chatUpdate === undefined || chatUpdate.length == 0) {
            res.send(false);
        }
        else {
            res.send(true);
        }
    }
    catch (e) {
        res.send(e.message);
    }

}); 

router.post("/updateUserChatReadMsgs", auth, async (req, res) => {
   

    try {
        const chatID = ObjectId(req.body.chatID); 
        const chatUpdate = await Chat.updateMany({ _id: chatID }, {  
                'user_unread_msgs': 0              
        });
      
        if (chatUpdate === undefined || chatUpdate.length == 0) {
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


router.post("/updateChatReadMsgs", auth, async (req, res) => {
    const chatID = ObjectId(req.body.chatID);

    let unread_msgs_dec = parseInt(req.body.unread_msgs) * -1;

    try {
        const chatUpdate = await Chat.updateMany({ _id: chatID },
            {
                $inc: {
                    'unread_msgs': unread_msgs_dec
                }
            });
        res.send(chatUpdate);

    }
    catch (e) {
        res.send(e.message);
    }

   

}); 


router.get("/getChatStatus/:chat_id", auth, async (req, res) => {
    const chatID = ObjectId(req.params.chat_id);
    const ChatData = await Chat.find({ _id: chatID }).select('isActive');
    res.send(ChatData[0]['isActive']);
}); 


 



router.get("/blockBulkChatEmail/:email/:company_id", auth, async (req, res) => { 
 
   

    let flag=false;
    const email = req.params.email;
    const company_id = req.params.company_id;

    let response = await BlockDB.find({ email_addresses: email, company_id: company_id }).select('email_addresses');

    if(parseInt(response.length)>0){
      
        res.send(false)
    }

    if(parseInt(response.length)<=0){

        await BlockDB.updateMany({ email_addresses: { $ne: email }, company_id: company_id }, {
            $push: {
                'email_addresses': email
            }
        });
       
        await User.updateMany({ email: email, block: false, company_id: company_id }, {
            $set: {
                'block': true
            }
        });
    
        let ChatData4 = await Chat.find({ user_email: email, company_id: company_id }).select('user_ip_address user_email');
        let user_email;
        
    
        if(parseInt(ChatData4.length)>0){
            flag=true;
            user_email = ChatData4[0].user_email;
       
        
            await BlockDB.updateMany({ email_addresses: { $ne: user_email }, company_id: company_id }, {
                $push: {
                    'email_addresses': user_email
                }
            });
    
            await User.updateMany({ email_addresses: user_email, company_id: company_id }, {
                $set: {
                    'block': true
                }
            });
            
          
        
            const ChatData3 = await Chat.find({ user_email: user_email, company_id: company_id }).select('_id dept_id');
            for(let i=0;i<parseInt(ChatData3.length);i++){        
                const chatID = ChatData3[i]._id.toString();
                const deptID = ChatData3[i].dept_id;
            
                const ChatData2 = await Chat.find({ '_id': chatID }).select('unread_msgs');
                let unread_msgs = ChatData2[0].unread_msgs;
                
         
             let ChatData = '';
        
              ChatData = await Chat.find({ _id: chatID }).updateMany({ isActive: false, unread_msgs: 0, user_unread_msgs: 0 });
          
             if(unread_msgs>0){
                 await Dept.updateMany({ _id: deptID, unread_msgs: { $gt: 0 } }, {
                    $inc: {
                        'unread_msgs': -1
                    }
                });
        
                
            }
        
        
                ChatData = await Chat.find({ _id: chatID });
        
         
         
                let dept_id = ChatData[0].dept_id;
                let admin_id = ChatData[0].admin_id;
                let user_name = ChatData[0].user_name;
                let user_email = ChatData[0].user_email;    
                let last_msgs_user = ChatData[0].last_msgs_user;
                let last_msgs_msg = ChatData[0].last_msgs_msg;       
                let last_msgs_date = ChatData[0].last_msgs_date;          
                let user_ip_address = ChatData[0].user_ip_address;     
                let subject = ChatData[0].subject;
                let priority = ChatData[0].priority;
                let user_id =ChatData[0].user_id;
                let dept_name =ChatData[0].dept_name; 
                let ticket_number =ChatData[0].ticket_number;
                let isBlock = true;
                let chat_id = ChatData[0]._id;
                let chat_id_string = String(ChatData[0]._id);
        
                let chat = new ChatClose({
                    dept_id: dept_id,
                    dept_name: dept_name,
                    admin_id: admin_id,
                    user_name: user_name,
                    user_email: user_email, 
                    last_msgs_user: last_msgs_user,
                    last_msgs_msg: last_msgs_msg,
                    last_msgs_date: last_msgs_date,
                    user_ip_address: user_ip_address,
                    subject: subject,
                    priority: priority,
                    user_id: user_id,
                    ticket_number: ticket_number,  
                    isBlock: isBlock,
                    isActive: false
                });
        
              
        
                let result = await chat.save(); 
                let close_chat_id = String(result._id);   
               
        
                let ChatDetailsData = await ChatDetails.find({ chat_id: chat_id_string }).select();

                        const ChatCloseDetailsData = new ChatCloseDetails({
                        chat_id: close_chat_id,
                        dept_id: ChatDetailsData[0].dept_id,
                        username: ChatDetailsData[0].username,
                        messages: ChatDetailsData[0].messages,
                        date: ChatDetailsData[0].date,
                        usertype: ChatDetailsData[0].usertype,
                        emoji: ChatDetailsData[0].emoji,
                        last_msgs_time: ChatDetailsData[0].last_msgs_time,
                        user_name: ChatDetailsData[0].user_name,
                        user_email: ChatDetailsData[0].user_email,
                        subject: ChatDetailsData[0].subject,  
                        ticket_number: ChatDetailsData[0].ticket_number,
                        last_msgs_user: ChatDetailsData[0].last_msgs_user,  
                        last_msgs_msg: ChatDetailsData[0].last_msgs_msg, 
                        last_msgs_date: ChatDetailsData[0].last_msgs_date, 
                        local_filename: ChatDetailsData[0].local_filename, 
                        aws_filename: ChatDetailsData[0].aws_filename,  
                        last_emoji: ChatDetailsData[0].last_emoji,
                        isActive: false,
                        company_id: company_id
                    });
        
               await ChatCloseDetailsData.save();
               await Chat.findOneAndDelete({ _id: chat_id });
               await ChatDetails.findOneAndDelete({ chat_id: chat_id_string });
                
            }  
        }
    
     
            ChatData4 = await ChatClose.find({ 'user_email': email  }).select('user_email user_ip_address');

            if(parseInt(ChatData4.length)>0){
                user_email = ChatData4[0].user_email; 
                await ChatClose.find({ user_email: user_email, company_id: company_id }).updateMany({ isBlock: true });
    
                if(flag===false){
                
            
            
                await BlockDB.updateMany({ email_addresses: { $ne: user_email }, company_id: company_id }, {
                    $push: {
                        'email_addresses': user_email
                    }
                });
               
                }
        
            }
           
            res.send(true);
       
    }

    
    
}); 


router.get("/blockBulkChatIP/:ip_address", auth, async (req, res) => { 
 
   

    let flag=false;
    const ip_address = req.params.ip_address;

    let response = await BlockDB.find({ ip_addresses: ip_address }).select('ip_addresses');

    if(parseInt(response.length)>0){
        res.send(false)
    }

    else {
        await BlockDB.updateMany({ ip_addresses: { $ne: ip_address } }, {
            $push: {
                'ip_addresses': ip_address
            }
        });
      
    
        let ChatData4 = await Chat.find({ user_ip_address: ip_address }).select('user_ip_address user_email');
        let user_email;
    
        
     
    
        if(parseInt(ChatData4.length)>0){
            flag=true; 
            let user_ip_address = ChatData4[0].user_ip_address;
            
        
           
        
            const ChatData3 = await Chat.find({ user_ip_address: user_ip_address }).select('_id dept_id');
            for(let i=0;i<parseInt(ChatData3.length);i++){        
                const chatID = ChatData3[i]._id.toString();
                const deptID = ChatData3[i].dept_id;
            
                const ChatData2 = await Chat.find({ '_id': chatID }).select('unread_msgs');
                let unread_msgs = ChatData2[0].unread_msgs;
                
         
             let ChatData = '';
        
              ChatData = await Chat.find({ _id: chatID }).updateMany({ isActive: false, unread_msgs: 0, user_unread_msgs: 0 });
          
             if(unread_msgs>0){
                 await Dept.updateMany({ _id: deptID, unread_msgs: { $gt: 0 } }, {
                    $inc: {
                        'unread_msgs': -1
                    }
                });
        
                
            }
        
        
                ChatData = await Chat.find({ _id: chatID });
        
         
         
                let dept_id = ChatData[0].dept_id;
                let admin_id = ChatData[0].admin_id;
                let user_name = ChatData[0].user_name;
                let user_email = ChatData[0].user_email;    
                let last_msgs_user = ChatData[0].last_msgs_user;
                let last_msgs_msg = ChatData[0].last_msgs_msg;       
                let last_msgs_date = ChatData[0].last_msgs_date;          
                let user_ip_address = ChatData[0].user_ip_address;     
                let subject = ChatData[0].subject;
                let priority = ChatData[0].priority;
                let user_id =ChatData[0].user_id;
                let dept_name =ChatData[0].dept_name; 
                let ticket_number =ChatData[0].ticket_number;
                let isBlock = true;
                let chat_id = ChatData[0]._id;
                let chat_id_string = String(ChatData[0]._id);
                let last_emoji =ChatData[0].last_emoji;
        
                let chat = new ChatClose({
                    dept_id: dept_id,
                    dept_name: dept_name,
                    admin_id: admin_id,
                    user_name: user_name,
                    user_email: user_email, 
                    last_msgs_user: last_msgs_user,
                    last_msgs_msg: last_msgs_msg,
                    last_msgs_date: last_msgs_date,
                    user_ip_address: user_ip_address,
                    subject: subject,
                    priority: priority,
                    user_id: user_id,
                    ticket_number: ticket_number,  
                    isBlock: isBlock,
                    isActive: false,
                    last_emoji: last_emoji
                });
    
                
        
              
        
                let result = await chat.save(); 
                let close_chat_id = String(result._id);   
    
                
               
        
                await ChatDetails.updateMany({ chat_id: chat_id_string }, {
                    $set: {
                        'chat_id': close_chat_id,
                        'isActive': false
                    }
                });
               await Chat.findOneAndDelete({ _id: chat_id });
    
               await BlockDB.updateMany({ email_addresses: { $ne: user_email } }, {
                $push: {
                    'email_addresses': user_email
                }
                });
    
                await User.updateMany({ email_addresses: user_email }, {
                    $set: {
                        'block': true
                    }
                });
         
        
                
            }  
        }
    
        
      
           ChatData4 = await ChatClose.find({ 'user_ip_address': ip_address  }).select('user_email user_ip_address');
           
       
     
    
            if(parseInt(ChatData4.length)>0){
                let length = ChatData4.length;
           
    
                for(let i=0;i<parseInt(length);i++){
                    user_email = ChatData4[i].user_email;
                
                    await ChatClose.find({ user_email: user_email }).updateMany({ isBlock: true });
    
                    await BlockDB.updateMany({ email_addresses: { $ne: user_email } }, {
                        $push: {
                            'email_addresses': user_email
                        }
                    });
                }
    
               
            
        
                if(flag===false){
                    let user_ip_address = ChatData4[0].user_ip_address;
    
                    await BlockDB.updateMany({ ip_addresses: { $ne: user_ip_address } }, {
                        $push: {
                            'ip_addresses': user_ip_address
                        }
                    });       
    
                    
                
                    
                   
                }
            }
           
        
           
        
       
        res.send(true);
    }

    
}); 

router.get("/blockChat/:chat_id/:email/:ip", auth, async (req, res) => {
    const chatID = ObjectId(req.params.chat_id);
    const email = req.params.email;
    const blockIP = req.params.ip;
    const chat = await Chat.find({ _id: chatID }).updateMany({ isBlock: true });

    await BlockDB.updateMany({ email_addresses: { $ne: email } }, {
        $push: {
            'email_addresses': email,
            'ip_addresses': blockIP
        }
    });

    try { 
        if (chat === undefined || chat.length == 0) {
          //  res.send(false);
        }
        else {
           // res.send(true);
        }


    }
    catch (e) {
       // res.send(false);
    }  

    res.send(true);
}); 


router.get("/unblockChat/:email/:ip", auth, async (req, res) => {
 
    const unblockEmail = req.params.email;
    const unblockIP = req.params.ip;
   
    await BlockDB.updateMany({ ip_addresses: unblockIP }, {
        $pull: {
            'ip_addresses': unblockIP
        }
    });

    await BlockDB.updateMany({ email_addresses: unblockEmail }, {
        $pull: {
            'email_addresses': unblockEmail
        }
    });

    await ChatClose.find({ user_email: unblockEmail }).updateMany({ isBlock: false, isActive: false });

    await User.updateMany({ email: unblockEmail }, {
        $set: {
            'block': false
        }
    });

    res.send(true);
}); 


router.post("/getChatTokenResult", auth, async (req, res) => {
    const chatData = req.body.chatData;
    const ChatAuthToken = jwt.decode(chatData, process.env.API_KEY);
    res.send(ChatAuthToken);
}); 


router.get("/getChatUserCheck/:chat_id/:user_id", auth, async (req, res) => {
    const chatID = ObjectId(req.params.chat_id);
    const userID = req.params.user_id;
    const ChatData = await Chat.find({ _id: chatID, user_id: userID });

    if (ChatData === undefined || ChatData.length == 0) {
        res.send(false);
    }
    else {
        res.send(true);
    }
}); 

router.get("/setChatAllReadUser/:chat_id", auth, async (req, res) => {
    const chatID = ObjectId(req.params.chat_id);
     
    const ChatData = await Chat.find({ _id: chatID }).updateMany({ user_unread_msgs: 0 });

    if (ChatData === undefined || ChatData.length == 0) {
        res.send(false);
    }
    else {
        res.send(true);
    }
}); 


router.post("/deleteAllChat", auth, async (req, res) => {
    const authKey = req.body.authKey;
    if (authKey == process.env.API_KEY) {      
        await Chat.deleteMany({}, callback);
        res.send(true);
    }
    else {
        res.send(false);
    }
}); 

router.post("/updateChatRatings", auth, async (req, res) => {
    const chatID = ObjectId(req.body.chat_id);
    const ratings = parseInt(req.body.ratings);
    const ChatData = await ChatClose.find({ _id: chatID }).updateMany({ chat_ratings: ratings });
    // res.send(ChatData);

    if (ChatData === undefined || ChatData.length == 0) {
        res.send(false);
    }
    else {
        res.send(true);
    }
}); 

router.post("/deleteChat", auth, async (req, res) => { 
    
     const chat_id = req.body.chatID;

     const ChatCloseData = await ChatClose.find({ chat_id: chat_id }).select('user_id');
     let user_id = ChatCloseData[0].user_id;
    

   

     const ChatData = await ChatDetails.find({ chat_id: chat_id }).select('local_filename aws_filename');
  
     let local_filename = ChatData[0].local_filename; 
     let aws_filename = ChatData[0].aws_filename; 

     if(parseInt(local_filename.length)>0){
        let delete_filename = ChatData[0].local_filename;
        if(parseInt(delete_filename.length)>0){
            for(let i=0; i<delete_filename.length; i++){
                let dir = 'uploads';
            
              
                let file = dir + "/" + delete_filename[i];
               
 
               if (fs.existsSync(file)) {
               
               try {
                   fs.unlinkSync(file);
               }
           
               catch(e){
                  // console.log(e);
               } 
            }
            }

          }
        
    }
 
    if(parseInt(aws_filename.length)>0){
        let delete_filename = ChatData[0].aws_filename;
 
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
            //    if (err) console.log(err, err.stack); // an error occurred
            //    else     console.log(data);           // successful response
             });
        }
    }

    await ChatDetails.findOneAndDelete({ chat_id: chat_id });
    await ChatClose.findOneAndDelete({ _id: chat_id });
     res.send(true);
  
}); 



router.post("/searchChatDeptListNew", auth, async (req, res) => {
    const search_keyword = req.body.keyword.toLowerCase();
    let dept_id = req.body.dept_id;
    let master_admin = req.body.master_admin;
    let dept_array = req.body.dept_array;   
    let company_id = req.body.company_id;  
    let ChatDataTemp = '';
    let ChatCloseDataTemp = '';
    let ChatData = [];
    let ChatCloseData = [];

    if (dept_id == 'all') { 
        if (master_admin) {
            ChatDataTemp = await ChatDetails.find({
                $and: [
                    { $or: [{ ticket_number: { '$regex': search_keyword, $options: 'is' } }, { subject: { '$regex': search_keyword, $options: 'is' } }, { user_email: { '$regex': search_keyword, $options: 'is' } }, { user_name: { '$regex': search_keyword, $options: 'is' } }, { messages: { '$regex': search_keyword, $options: 'is' } }] },
                    { company_id: company_id }
                ]
            }).select('chat_id').sort('-last_msgs_time');
            ChatCloseDataTemp = await ChatCloseDetails.find({
                $and: [
                    { $or: [{ ticket_number: { '$regex': search_keyword, $options: 'is' } }, { subject: { '$regex': search_keyword, $options: 'is' } }, { user_email: { '$regex': search_keyword, $options: 'is' } }, { user_name: { '$regex': search_keyword, $options: 'is' } }, { messages: { '$regex': search_keyword, $options: 'is' } }] },
                    { company_id: company_id }
                ]
            }).select('chat_id').sort('-last_msgs_time');
        } else {
            ChatDataTemp = await ChatDetails.find({
                $and: [
                    { $or: [{ ticket_number: { '$regex': search_keyword, $options: 'is' } }, { subject: { '$regex': search_keyword, $options: 'is' } }, { user_email: { '$regex': search_keyword, $options: 'is' } }, { user_name: { '$regex': search_keyword, $options: 'is' } }, { messages: { '$regex': search_keyword, $options: 'is' } }] },
                    { "dept_id": { $in: dept_array } },
                    { company_id: company_id }
                ]
            }).select('chat_id').sort('-last_msgs_time');
            ChatCloseDataTemp = await ChatCloseDetails.find({
                $and: [
                    { $or: [{ ticket_number: { '$regex': search_keyword, $options: 'is' } }, { subject: { '$regex': search_keyword, $options: 'is' } }, { user_email: { '$regex': search_keyword, $options: 'is' } }, { user_name: { '$regex': search_keyword, $options: 'is' } }, { messages: { '$regex': search_keyword, $options: 'is' } }] },
                    { "dept_id": { $in: dept_array } },
                    { company_id: company_id }
                ]
            }).select('chat_id').sort('-last_msgs_time');
        }
    } else {
        ChatDataTemp = await ChatDetails.find({
            $and: [
                { $or: [{ ticket_number: { '$regex': search_keyword, $options: 'is' } }, { subject: { '$regex': search_keyword, $options: 'is' } }, { user_email: { '$regex': search_keyword, $options: 'is' } }, { user_name: { '$regex': search_keyword, $options: 'is' } }, { messages: { '$regex': search_keyword, $options: 'is' } }] },
                { "dept_id": dept_id },
                { company_id: company_id }
            ]
        }).select('chat_id').sort('-last_msgs_time');
        ChatCloseDataTemp = await ChatCloseDetails.find({
            $and: [
                { $or: [{ ticket_number: { '$regex': search_keyword, $options: 'is' } }, { subject: { '$regex': search_keyword, $options: 'is' } }, { user_email: { '$regex': search_keyword, $options: 'is' } }, { user_name: { '$regex': search_keyword, $options: 'is' } }, { messages: { '$regex': search_keyword, $options: 'is' } }] },
                { "dept_id": dept_id },
                { company_id: company_id }
            ]
        }).select('chat_id').sort('-last_msgs_time');
    }

    if (ChatDataTemp.length > 0) {
        for (let i = 0; i < ChatDataTemp.length; i++) {
            let chatId = ObjectId(ChatDataTemp[i].chat_id);
            let ChatSearch = await Chat.findOne({ _id: chatId }).select('_id last_msgs_user last_msgs_msg last_msgs_date unread_msgs user_name subject priority user_id chat_ratings isActive isBlock dept_id user_email ticket_number last_emoji email_service').sort('-last_msgs_time');
            if (ChatSearch !== null) {
                ChatData.push(ChatSearch);   
            }
        }
    }

    if (ChatCloseDataTemp.length > 0) {
        for (let i = 0; i < ChatCloseDataTemp.length; i++) {
            let chatId = ObjectId(ChatCloseDataTemp[i].chat_id);
            let ChatSearch = await ChatClose.findOne({ _id: chatId }).select('_id last_msgs_user last_msgs_msg last_msgs_date unread_msgs user_name subject priority user_id chat_ratings isActive isBlock dept_id user_email ticket_number last_emoji email_service').sort('-last_msgs_time');
            if (ChatSearch !== null) {
                ChatCloseData.push(ChatSearch);
            }
        }
    }

    const combinedArray = [...ChatData, ...ChatCloseData];
    
    res.send(combinedArray);
});


router.post("/searchAdminChatFileDeptListNew", auth, async (req, res) => {
    const search_keyword = req.body.keyword.toLowerCase();
    let dept_id = req.body.dept_id;
    let master_admin = req.body.master_admin;
    let dept_array = req.body.dept_array;    
    let chat_type = req.body.chat_type;    
    let ChatDataTemp = '';
    let ChatCloseDataTemp = '';
    let ChatData = [];
    let filetypeSearch = '';
    let ChatCloseData = [];
    let company_id = req.body.company_id;  

    if(chat_type==='images'){
        filetypeSearch='.jpg|.jpeg|.png';
    }

    if(chat_type==='pdf'){
        filetypeSearch='.pdf';
    }

    if(chat_type==='ppt'){
        filetypeSearch='.ppt';
    }

    if(chat_type==='doc'){
        filetypeSearch='.doc|.docx';
    }

    if(chat_type==='xls'){
        filetypeSearch='.xls|.xlsx';
    }

    if(chat_type==='zip'){
        filetypeSearch='.zip|.rar';
    }

    if(chat_type==='mp3'){
        filetypeSearch='.wma|.mp4|.mp3|.wav';
    }

    if(dept_id=='all'){ 
        if(master_admin){
            ChatDataTemp = await ChatDetails.find({
                $and: [
                    { $or: [{ messages: { '$regex': filetypeSearch, $options: 'is' } }] },
                    { $or: [
                        { messages: { '$regex': search_keyword, $options: 'is' }},
                        { ticket_number: { '$regex': search_keyword, $options: 'is' }},
                        { subject: { '$regex': search_keyword, $options: 'is' }},
                        { user_email: { '$regex': search_keyword, $options: 'is' }},
                        { user_name: { '$regex': search_keyword, $options: 'is' }}   
                    ]},
                    { company_id: company_id }
                ]
            }).select().sort('-last_msgs_time'); 

            ChatCloseDataTemp = await ChatCloseDetails.find({
                $and: [
                    { $or: [{ messages: { '$regex': filetypeSearch, $options: 'is' } }] },
                    { $or: [
                        { messages: { '$regex': search_keyword, $options: 'is' }},
                        { ticket_number: { '$regex': search_keyword, $options: 'is' }},
                        { subject: { '$regex': search_keyword, $options: 'is' }},
                        { user_email: { '$regex': search_keyword, $options: 'is' }},
                        { user_name: { '$regex': search_keyword, $options: 'is' }}   
                    ]},
                    { company_id: company_id }
                ]
            }).select().sort('-last_msgs_time'); 
        }   
        else {
            ChatDataTemp = await ChatDetails.find({
                $and: [
                    { $or: [{ messages: { '$regex': filetypeSearch, $options: 'is' } }] },
                    { $or: [
                        { messages: { '$regex': search_keyword, $options: 'is' }},
                        { ticket_number: { '$regex': search_keyword, $options: 'is' }},
                        { subject: { '$regex': search_keyword, $options: 'is' }},
                        { user_email: { '$regex': search_keyword, $options: 'is' }},
                        { user_name: { '$regex': search_keyword, $options: 'is' }}
                    ]},
                    { "dept_id": { $in: dept_array }},
                    { company_id: company_id }
                ]
            }).select().sort('-last_msgs_time'); 
            ChatCloseDataTemp = await ChatCloseDetails.find({
                $and: [
                    { $or: [{ messages: { '$regex': filetypeSearch, $options: 'is' } }] },
                    { $or: [
                        { messages: { '$regex': search_keyword, $options: 'is' }},
                        { ticket_number: { '$regex': search_keyword, $options: 'is' }},
                        { subject: { '$regex': search_keyword, $options: 'is' }},
                        { user_email: { '$regex': search_keyword, $options: 'is' }},
                        { user_name: { '$regex': search_keyword, $options: 'is' }}   
                    ]},
                    { "dept_id": { $in: dept_array }},
                    { company_id: company_id }
                ]
            }).select().sort('-last_msgs_time'); 
        }
    }
    else {
        ChatDataTemp = await ChatDetails.find({
            $and: [
                { $or: [{ messages: { '$regex': filetypeSearch, $options: 'is' } }] },
                { $or: [
                    { messages: { '$regex': search_keyword, $options: 'is' }},
                    { ticket_number: { '$regex': search_keyword, $options: 'is' }},
                    { subject: { '$regex': search_keyword, $options: 'is' }},
                    { user_email: { '$regex': search_keyword, $options: 'is' }},
                    { user_name: { '$regex': search_keyword, $options: 'is' }}   
                ]},
                { "dept_id": dept_id },
                { company_id: company_id }
            ]
        }).select().sort('-last_msgs_time'); 
        ChatCloseDataTemp = await ChatCloseDetails.find({
            $and: [
                { $or: [{ messages: { '$regex': filetypeSearch, $options: 'is' } }] },
                { $or: [
                    { messages: { '$regex': search_keyword, $options: 'is' }},
                    { ticket_number: { '$regex': search_keyword, $options: 'is' }},
                    { subject: { '$regex': search_keyword, $options: 'is' }},
                    { user_email: { '$regex': search_keyword, $options: 'is' }},
                    { user_name: { '$regex': search_keyword, $options: 'is' }}   
                ]},
                { "dept_id": dept_id },
                { company_id: company_id }
            ]
        }).select().sort('-last_msgs_time'); 
    }

    if (ChatDataTemp.length > 0) {
        for (let i = 0; i < ChatDataTemp.length; i++) {
            let chatId = ObjectId(ChatDataTemp[i].chat_id);
            let ChatSearch = await Chat.findOne({ _id: chatId }).select('_id last_msgs_user last_msgs_msg last_msgs_date unread_msgs user_name subject priority user_id chat_ratings isActive isBlock dept_id user_email ticket_number last_emoji email_service').sort('-last_msgs_time');
            if (ChatSearch !== null) {
                ChatData.push(ChatSearch);   
            }
        }
    }

    if (ChatCloseDataTemp.length > 0) {
        for (let i = 0; i < ChatCloseDataTemp.length; i++) {
            let chatId = ObjectId(ChatCloseDataTemp[i].chat_id);
            let ChatSearch = await ChatClose.findOne({ _id: chatId }).select('_id last_msgs_user last_msgs_msg last_msgs_date unread_msgs user_name subject priority user_id chat_ratings isActive isBlock dept_id user_email ticket_number last_emoji email_service').sort('-last_msgs_time');
            if (ChatSearch !== null) {
                ChatCloseData.push(ChatSearch);
            }
        }
    }

    const combinedArray = [...ChatData, ...ChatCloseData];
    res.send(combinedArray);
});


 

router.get("/confirmChatID/:chat_id/:user_id", auth, async (req, res) => {

    const chatID = ObjectId(req.params.chat_id);
    const userID =  req.params.user_id;

    let ChatData = await Chat.find({ _id: chatID, user_id: userID }).select('_id');

    if(ChatData.length<=0){
        ChatData = await ChatClose.find({ _id: chatID, user_id: userID }).select('_id');
    }

    

    if(ChatData.length<=0){
        res.send(false);
    }

    if(ChatData.length>0){
        res.send(true);
    }

});

router.post("/saveChatDraft", auth, async (req, res) => {
 

    const chatID = ObjectId(req.body.chatID);
    const draft = req.body.draft; 
    const ChatData = await Chat.find({ _id: chatID }).updateMany({ draft: draft });
     

    if (ChatData === undefined || ChatData.length == 0) {
        res.send(false);
    }
    else {
        res.send(true);
    }
   
});


router.get("/getChatDetails/:chat_id/:isActive", auth, async (req, res) => {

  //  console.log('getChatDetails');

    if (req.params.chat_id != 0) {
        
        try{
            const chatID = ObjectId(req.params.chat_id);
            const chatID2 = req.params.chat_id;
            const isActive = req.params.isActive; 

          //  console.log(chatID2);
          //  console.log(isActive);

            let ChatData;
            let ChatData2;

            if(isActive==='true'){
                ChatData = await Chat.find({ _id: chatID }).select('_id isActive isBlock dept_id unread_msgs subject priority chat_ratings user_id user_email ticket_number user_name user_unread_msgs user_ip_address last_emoji dept_name email_service draft');
                ChatData2 = await ChatDetails.find({ chat_id: chatID2 }).select('username messages date usertype emoji');
            }
            

            if(isActive==='false'){
                ChatData = await ChatClose.find({ _id: chatID }).select('_id user_ip_address isActive isBlock dept_id unread_msgs subject priority chat_ratings user_id user_email ticket_number user_name user_unread_msgs last_emoji dept_name email_service draft');
                ChatData2 = await ChatCloseDetails.find({ chat_id: chatID2 }).select('username messages date usertype emoji');
            }
                        
            let archive_ticket = false;
            let current_limit = 0;
            
       

        let username = ChatData2[0].username;
        let messages = ChatData2[0].messages;
        let date = ChatData2[0].date;
        let usertype = ChatData2[0].usertype;
        let emoji = ChatData2[0].emoji; 

            let chat_history = {
                username, messages, date, usertype, emoji
            };


            let results = [{
                chat_history: chat_history,
                _id: ChatData[0]._id,
                isActive: ChatData[0].isActive,
                isBlock: ChatData[0].isBlock,
                dept_id: ChatData[0].dept_id,
                unread_msgs: ChatData[0].unread_msgs,
                priority: ChatData[0].priority,
                subject: ChatData[0].subject,
                chat_ratings: ChatData[0].chat_ratings,
                user_id: ChatData[0].user_id,
                user_email: ChatData[0].user_email,
                ticket_number: ChatData[0].ticket_number,
                archive_ticket: archive_ticket,
                current_limit: current_limit,
                user_name: ChatData[0].user_name,
                user_unread_msgs: ChatData[0].user_unread_msgs,
                user_ip_address: ChatData[0].user_ip_address,
                dept_name: ChatData[0].dept_name,
                last_emoji: ChatData[0].last_emoji,
                email_service: ChatData[0].email_service,
                draft: ChatData[0].draft
            }];
 

           
            res.send(results);
        }

        catch(e){
            res.send(false);
        }
           
        
    }

});

router.get("/getChatDetailsArchive/:chat_id/:current_limit", auth, async (req, res) => {

    if (req.params.chat_id != 0) {

        const chatID = ObjectId(req.params.chat_id);
        const chatID2 = req.params.chat_id;
        let ChatData = await Chat.find({ _id: chatID }).select('_id isActive isBlock dept_id unread_msgs subject priority chat_ratings user_id user_email ticket_number');
        let ChatData2 = await ChatDetails.find({ chat_id: chatID2 }).select('username messages date usertype');
        let archive_ticket = false;
        let current_limit = req.params.current_limit;

        let new_limit = 0;
        let limit = current_limit;
        new_limit = parseInt(new_limit);
        limit = parseInt(limit);
 


        let username = ChatData2[0].username.slice(new_limit, limit);
        let messages = ChatData2[0].messages.slice(new_limit, limit);
        let date = ChatData2[0].date.slice(new_limit, limit);
        let usertype = ChatData2[0].usertype.slice(new_limit, limit);



        let chat_history = {
            username, messages, date, usertype
        };


        let results = [{
            chat_history: chat_history,
            _id: ChatData[0]._id,
            isActive: ChatData[0].isActive,
            isBlock: ChatData[0].isBlock,
            dept_id: ChatData[0].dept_id,
            unread_msgs: ChatData[0].unread_msgs,
            priority: ChatData[0].priority,
            subject: ChatData[0].subject,
            chat_ratings: ChatData[0].chat_ratings,
            user_id: ChatData[0].user_id,
            user_email: ChatData[0].user_email,
            ticket_number: ChatData[0].ticket_number,
            archive_ticket: archive_ticket,
            current_limit: current_limit
        }];



        res.send(results);

    }

});


router.post("/deleteChatList", auth, async (req, res) => {  
    
    const days = parseInt(req.body.days);
    var today = new Date();
    today.setDate(today.getDate() - days);
    let chat_delete_array = [];
    let user_delete_array = [];
  

    try {
        
     

        let ChatData = await await ChatClose.find({last_msgs_time:{$lte:today}}).select('_id user_id');
 
        ChatData.forEach(Items => {         
            let chat_id = Items._id.toString(); 
            let user_id = Items.user_id.toString(); 
            chat_delete_array.push(chat_id); 
            user_delete_array.push(user_id);
         });

     
 

        for(let i=0;i<parseInt(chat_delete_array.length);i++){
            let chat_id=chat_delete_array[i];
        
              let ChatDataDetails = await ChatDetails.find({chat_id:chat_id}).select('local_filename aws_filename');
             await ChatDetails.deleteMany({ chat_id: chat_id });
             await ChatClose.deleteMany({ _id: chat_id });

            if(ChatDataDetails[0]!==undefined && parseInt(ChatDataDetails[0].aws_filename.length)>0){
                let delete_filename = ChatDataDetails[0].aws_filename;
              
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
                     //   if (err) console.log(err, err.stack); // an error occurred
                    //    else     console.log(data);           // successful response
                     });
                }
            }

            if(ChatDataDetails[0]!==undefined && parseInt(ChatDataDetails[0].local_filename.length)>0){

                for(let l=0;l<parseInt(ChatDataDetails[0].local_filename.length);l++){
                    let delete_filename_temp = ChatDataDetails[0].local_filename[l];
                    
                    
    
    
                    let dir = 'uploads';
            
              
                    let file = dir + "/" + delete_filename_temp;
               
        
                    if (fs.existsSync(file)) {
               
                    try {
                        fs.unlinkSync(file);
                    }
           
                        catch(e){
                         //   console.log(e);
                    } 
    
    
                }
            }

           
    

            
            
        }
 

     
        
    }
 
   
    res.send(true);

    }

    catch(e){}
 
   
}); 
 
router.post("/getDeptChatUnreadList", auth, async (req, res) => {

    let deptID=req.body.deptID;
    const ChatData = await Chat.find({ dept_id: { $in : deptID}, unread_msgs: { $gt: 0 } }).select().sort('-last_msgs_time');
    res.send(ChatData);
 
}); 
 

module.exports = router;
