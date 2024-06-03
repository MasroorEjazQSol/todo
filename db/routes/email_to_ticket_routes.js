const { Chat } = require("../models/chat_db");
const { ChatDetails } = require("../models/chat_details_db");
const { ChatClose } = require("../models/chat_close_db");
const { Dept } = require("../models/dept_db");
const { BlockDB } = require("../models/block_db");
const { User } = require("../models/user_db");
const { Admin } = require("../models/admin_db");
const auth = require("../middleware/auth"); 
const auth_socket = require("../middleware/auth_socket");
const auth_non_secure = require("../middleware/auth_non_secure");
const express = require("express"); 
const router = express.Router();  
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

var ObjectId = require('mongodb').ObjectID;
 
 

process.on('unhandledRejection', (reason, promise) => {
    //console.log("Reason: ", reason, "promise: ", promise);
});

process.on('warning', e => console.warn(e.stack));

router.get("/test", auth_non_secure, async (req, res) => {

      let ask = '';
    ask = 'reply with human face emoji and name of the emotion according to emoji in past tense and short reason for the emotion based on the complaint ticket filed by Masroor Ejaz. Kindly take his greetings in consideration as well when judging his emotions. Conversation starts Masroor Ejaz: Hello, Hope all is good. I want your wholesale list of your products for March 2023. Take care and Thank you.';
    // ask = 'reply with human face emoji and name of the emotion in past tense and short reason for the emotion of last complaint ticket filed by Masroor Ejaz Conversation starts Masroor Ejaz: Hello,I am facing overbilling again.&nbsp;Kindly resolve this.Thank you.Admin: Hey Masroor,We are working to fix this.Thank you.Masroor Ejaz: Issue is fixed now. Thanks.';
    // ask = 'reply with html tags as admin to complaint tickets filed by Masroor Ejaz. reply should be human like along with line break, paragraph etc. Conversation starts Masroor Ejaz: Hello,I am facing overbilling again.&nbsp;Kindly resolve this.Thank you.Admin: Hey Masroor,We are working to fix this.Thank you.Masroor Ejaz: how long will it take? Thanks.';
    // ask = 'reply with html tags as admin to complaint tickets  filed by Masroor Ejaz according to "Your issue has been resolved now". reply should be human like along with line break, paragraph etc. Conversation starts Masroor Ejaz: Hello,I am facing overbilling again.&nbsp;Kindly resolve this.Thank you.Admin: Hey Masroor,We are working to fix this.Thank you.Masroor Ejaz: how long will it take? Thanks.';

   try {
    const completion = await openai.createCompletion({
      model: "gpt-3.5-turbo-instruct",
      temperature: 1,
      top_p: 1,
      max_tokens: 1000,
      prompt: ask,   
    }); 

    console.log(completion.data.choices[0].text);
  
    res.send(ask+'<br/>'+completion.data.choices[0].text);
   }

   catch(e){
     // console.log(e);
      res.send('ChatGPT Is Down Right Now.');
   }
}); 

 
async function askChatGPT(ask) {
    
    try {
        const completion = await openai.createCompletion({
            model: "gpt-3.5-turbo-instruct",
            temperature: 1,
            top_p: 1,
            max_tokens: 1000,
            prompt: ask,   
          }); 
      
         let results=completion.data.choices[0].text;
         return results;
        // console.log(completion.data.choices[0].text);

    } catch (e) {      
        console.log(e);
        return '';
    }
  }

router.post("/getImportEmailVerified", auth_socket, async (req, res) => { 
    const email_address = req.body.email_address;  
    let EmailImportData = await EmailImport.find({verified:true,email_address:email_address});
    res.send(EmailImportData);
});  

router.post("/startNewChat", auth_socket, async (req, res) => { 

    
    const getBlockKeywords = await BlockDB.find().select('block_keywords');
    const block_keywords = getBlockKeywords[0].block_keywords;
 
  
    const user_name = req.body.username;
    const user_email = req.body.email;          
    let message = req.body.message;    
    let subject = req.body.subject;    
    const local_filename = req.body.local_filename; 
    const user_id = req.body.user_id;    
    let company_id = req.body.company_id;
    
    let ask2 = 'Recognize the issue customer is facing. Return in the following ; seperated value for example ISSUE_SHORT_HERE; ISSUE_LONG_HERE in ISSUE_SHORT_HERE return the issue custoemer is facing in 1 word and in ISSUE_LONG_HERE return in max 5 words. Replace both ISSUE_SHORT_HERE; ISSUE_LONG_HERE and return the result in single line. Only recognize and retrun the issue ignore things like "please","thank you" etc. Ignore file attachments and html elements. Focus on customer message. Customer query:'+message;
    let issue_short = "";
    let issue_long = "";
    

    // try {
    //     const completion = await openai.createCompletion({
    //         model: "gpt-3.5-turbo-instruct",
    //         temperature: 1,
    //         top_p: 1,
    //         max_tokens: 1000,
    //         prompt: ask2,   
    //       }); 
      
    //      let issues=completion.data.choices[0].text;
    //      issues = issues.split(';');
    //      issue_short = issues[0].trim();
    //      issue_long = issues[1].trim();

    // } catch (e) {      
    //     console.log(e);
    //     return '';
    // }
   

    if (!req.body.email_service) {
        req.body.email_service = 'gmail';
    }

    let email_service = req.body.email_service;

    const regex = /<(.*?)>/g;
    message = message.replace(regex, (match, p1) => {
    const replaced = p1.replace(/\\+/g, '');
        return `<${replaced}>`;
    });

    message = message.replace(/(href="[^"]+)n"/g, '$1"');
    message = message.replace(/(<a[^>]*>[^<]*)\\n(<\/a>)/g, '$1$2');
    message = message.replace(/\\(['"])/g, '$1');
    message = message.replace(/\\n<br>/g, '\n');
    message = message.replace(/\n/g, '<br>');
    let uncensored_msg = message;
   // console.log(uncensored_msg);

    for (let i = 0; i < parseInt(block_keywords.length); i++) {
        const keyword = block_keywords[i];
        const regex = new RegExp(keyword, "gi");
        const matches = message.match(regex); 
        const matches2 = subject.match(regex); 
      
        if (matches) {
          const uniqueMatches = [...new Set(matches)];
          uniqueMatches.forEach((match) => {
            const replacement = match.charAt(0) + "*".repeat(match.length - 1);
            message = message.replace(new RegExp(match, "gi"), replacement);
          });
        }

        if (matches2) {
            subject = subject.replace(regex, (match) => {
                const censor = match.charAt(0) + "*".repeat(match.length - 1);
                return censor;
              });
        }
       
 
    }
 

    const DeptData = await Dept.find({company_id:company_id}).select('_id dept_name tickets_dept_guide');

  //  console.log(DeptData);

   // let ask = 'a customer has filed a ticket "'+uncensored_msg+'" Kindly go through all the tickets_dept_guide and return the department id that matches with the customer ticket. Only return one single string in result which is _id'+DeptData+'answer should be like _id;dept_name only and nothing else do not return \' or ". Don\'t give the details answer. Also Recognize the issue customer is facing. Return in the following ; seperated value for example ISSUE_SHORT_HERE; ISSUE_LONG_HERE in ISSUE_SHORT_HERE return the issue custoemer is facing in 1 word and in ISSUE_LONG_HERE return in max 5 words. Replace both ISSUE_SHORT_HERE; ISSUE_LONG_HERE and return the result in single line. Only recognize and retrun the issue ignore things like "please","thank you" etc. Ignore file attachments and html elements. Focus on customer message.  Also recognize the customer emotion. The answer should be like _id;dept_name;ISSUE_SHORT_HERE; ISSUE_LONG_HERE;Customer_Emotion.Return eveything in a single line';
   let ask = 'a customer has filed a ticket "'+uncensored_msg+'" Kindly go through all the tickets_dept_guide and return the department id that matches with the customer ticket. Only return one single string in result which is _id'+DeptData+'Don\'t give the details answer. Also Recognize the issue customer is facing. Recognize the short issue customer is facing in 1 word and long issue customer is facing in 5 words. Also recognize the customer emotion along with Emoji in one single word. Anwser should be in the json format like {\'dept_id\':\'Dept ID Result Here\',\'dept_name\':\'Department Name Here\',\'short_issue\':\'Short Issue here\',\'long_issue\':\'Long issue result here\',\'emotion\':\'customer emotion result here\'}';
   
    let searchTerm = 'Sales';
    let DeptDataResult = DeptData.find(item => item.dept_name === searchTerm);
    let dept_id = DeptDataResult._id; 
    let dept_name = DeptDataResult.dept_name;
    let emoji = '😊 Grateful';

    console.log(ask);
    try {
        const completion = await openai.createCompletion({
            model: "gpt-3.5-turbo-instruct",
            temperature: 1,
            top_p: 1,
            max_tokens: 1000,
            prompt: ask,   
          }); 
       
          try {
            let issues=completion.data.choices[0].text;
            console.log(issues);
             // Remove curly braces and single quotes, and trim all leading whitespace
            const cleanedString = issues.replace(/[{}']/g, '');

            // Split the cleaned string by commas
            const valuesArray = cleanedString.split(',');

            // Extract relevant values and trim whitespace
            let deptId = valuesArray[0].charAt(0) === '"' ? valuesArray[0].substring(1).trim().split(':')[1].trim().replace(/"$/, '') : valuesArray[0].trim().split(':')[1].trim().replace(/^"/, '').replace(/"$/, '');
            let deptName = valuesArray[1].charAt(0) === '"' ? valuesArray[1].substring(1).trim().split(':')[1].trim().replace(/"$/, '') : valuesArray[1].trim().split(':')[1].trim().replace(/^"/, '').replace(/"$/, '');
            let shortIssue = valuesArray[2].charAt(0) === '"' ? valuesArray[2].substring(1).trim().split(':')[1].trim().replace(/"$/, '') : valuesArray[2].trim().split(':')[1].trim().replace(/^"/, '').replace(/"$/, '');
            let longIssue = valuesArray[3].charAt(0) === '"' ? valuesArray[3].substring(1).trim().split(':')[1].trim().replace(/"$/, '') : valuesArray[3].trim().split(':')[1].trim().replace(/^"/, '').replace(/"$/, '');
            let emotion = valuesArray[4].charAt(0) === '"' ? valuesArray[4].substring(1).trim().split(':')[1].trim().replace(/"$/, '') : valuesArray[4].trim().split(':')[1].trim().replace(/^"/, '').replace(/"$/, '');



 
            dept_id=deptId;
            dept_name=deptName;
            emoji=emotion;
            issue_short=shortIssue;
            issue_long=longIssue;
            console.log(dept_id);
            console.log(dept_name);
            console.log(emoji);
            console.log(issue_short);
            console.log(issue_long);

            if(dept_id===""){
                res.send(false);
                return;
            }
           
          }
          catch(e){
              console.log(e);
              res.send(false);
              return;
          }
             

    } catch (e) {      
         console.log(e);
         res.send(false);
         return;
    }
   
    
   // let chatGPTResults = await askChatGPT(ask);
 
    //Update using ChatGPT
  //  searchTerm = chatGPTResults.trim();

    //Update using ChatGPT
    let priority = 'High';

    //Update using ChatGPT
   
   // console.log(searchTerm);

  //  const foundItem  = DeptData.find(item => item.dept_name === searchTerm);    
    //console.log(foundItem);
    // if (foundItem) {
    //    dept_id = foundItem._id;    
    //    dept_name = foundItem.dept_name;
    // } 
 
   // ask = 'a user has filled a query ticket title '+subject+' and with the query'+uncensored_msg+' judge on which priority the ticket should be assign High? Medium? Low? Reply only with one word out of these three. Judge using two parameters how urgent user want it to resolve? Ticket system already have tons of tickets queued up and other human admins are working in resolving them. If ticket priority is set to High then the ticket will show up on the very top, on Medium in the middle and on Low at the very end. Do not return empty value if default return Medium.';
    // chatGPTResults = await askChatGPT(ask);

    
    // if(chatGPTResults.trim()==='High' || chatGPTResults.trim()==='Low'){
    //     console.log(chatGPTResults.trim());
    //     priority = chatGPTResults.trim();
    // }

    let last_msgs_date = new Date().toLocaleString('de-DE', {hour12: true, timeZone: process.env.Timezone });   
    const user_ip_address = '0.0.0.0';
    const unread_msgs = 1;
    const admin_id = '0';
    const last_msgs_user = user_name;  

    let last_message = message.replace(/<[^>]*>/g, '');

    if (last_message.length <= 0) {
        last_message = "Attachments";
    }

    let last_msgs_msg = last_message;
 
    
    var digits=String(new Date().valueOf()).slice(-4);    
    var digits_two = Math.floor(10000 + Math.random() * 90000);
    
    
   if(dept_name[0].toUpperCase() === ""){
        res.send(false);
        return;
    }

    let ticket_number = "";

    try {
        ticket_number = dept_name[0].toUpperCase() + digits_two + digits;
    } catch(e){
        ticket_number = "";
    }



    let  last_msg_string = last_msgs_msg;
 

     

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
        email_service: email_service,
        company_id : company_id       
    });

    //console.log(chat);

          //  // Split the original date string using dots
          let dateParts = last_msgs_date.split('.');

          // // Switch the positions of the first and second values
          let switchedDate = dateParts[1] + '.' + dateParts[0] + '.' + dateParts.slice(2).join('.');
  
          
          let first_msgs_time = new Date(switchedDate);

          let chat_id = 0;

        try{
            const result = await chat.save();
            chat_id = String(result._id);
            
        }

        catch(e){
            console.log(e)
        }
    

        //ChatGPT uncomment START

        let new_ticket_subject = subject + ' - ' + ticket_number;
        

        await Chat.updateMany({ _id: chat_id }, {
            $set: {
                'subject': new_ticket_subject
            }
        });
    
         //ChatGPT uncomment END
 
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
                subject: subject  + ' - ' + ticket_number,
                ticket_number: ticket_number,
                user_email: user_email,
                user_name: user_name,
                local_filename: local_filename,
                emoji: emoji,
                last_emoji: emoji,
                company_id: company_id,
                issue_short: issue_short,
                issue_long: issue_long
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
                subject: subject + ' - ' + ticket_number,
                ticket_number: ticket_number,
                user_email: user_email,
                user_name: user_name,
                aws_filename: local_filename,
                emoji: emoji,
                last_emoji: emoji,
                company_id: company_id,
                issue_short: issue_short,
                issue_long: issue_long
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

   // let ChatDataFind = await Chat.find({ _id: chat_id }).select('_id ticket_number');
    

    const adminStatus = await Admin.count({ masterAdmin: true, admin_status: true });
    const AllAdmin = await Admin.find({ isBlock: false }).select('_id username');
    let adminList=AllAdmin; 
    let ChatResult = [{ticket_number: ticket_number, date: last_msgs_date}];

 
    if (parseInt(adminStatus) > 0) {
     
        ChatResult = [{admin_list: adminList, join_room: chat_id, username: user_name, 
            msg: message, date: last_msgs_date, dept_id: dept_id, emoji: emoji, dept_name: dept_name, 
            ticket_number: ticket_number }];
    }
   else {
        const deptID = dept_id;
        const DeptData = await Dept.find({ '_id': deptID }).select('dept_admin');
        let DeptAdminList = DeptData[0].dept_admin;
        let AdminStatusData = await Admin.count({ '_id': { $in : DeptAdminList}, 'admin_status' : true }); 
        if(parseInt(AdminStatusData)>0){
         
            ChatResult = [{admin_list: adminList, join_room: chat_id, username: user_name, ticket_number: ticket_number,
                msg: message, date: last_msgs_date, dept_id: dept_id, emoji: emoji, dept_name: dept_name }];
        }
      
       
   }

    res.send(ChatResult);



}); 

 

router.post("/updateChat", auth_socket, async (req, res) => {
 
    const getBlockKeywords = await BlockDB.find().select('block_keywords');
    const block_keywords = getBlockKeywords[0].block_keywords;

  
    let subject = req.body.subject;
    let user_name = req.body.username;
    let user_msg = req.body.message;
    let user_email = req.body.user_email;

    

    let regex = /<(.*?)>/g;
    user_msg = user_msg.replace(regex, (match, p1) => {
    const replaced = p1.replace(/\\+/g, '');
        return `<${replaced}>`;
    });

    user_msg = user_msg.replace(/(href="[^"]+)n"/g, '$1"');
    user_msg = user_msg.replace(/(<a[^>]*>[^<]*)\\n(<\/a>)/g, '$1$2');
    user_msg = user_msg.replace(/\\(['"])/g, '$1');
    user_msg = user_msg.replace(/\n<br>/g, '\n');

    
    subject = subject.replace(/^(\s*[Rr][Ee]:)+\s*/i, "");

    for (let i = 0; i < parseInt(block_keywords.length); i++) {
        const keyword = block_keywords[i];
        const regex = new RegExp(keyword, "gi");
        const matches = user_msg.match(regex); 
        const matches2 = subject.match(regex); 
      
        if (matches) {
          const uniqueMatches = [...new Set(matches)];
          uniqueMatches.forEach((match) => {
            const replacement = match.charAt(0) + "*".repeat(match.length - 1);
            user_msg = user_msg.replace(new RegExp(match, "gi"), replacement);
          });
        }

        if (matches2) {
            subject = subject.replace(regex, (match) => {
                const censor = match.charAt(0) + "*".repeat(match.length - 1);
                return censor;
              });
        }
       
 
    }
 

    
 
    let chat_id = '';
    let deptID = '';
    let dept_name = '';
    let unread_msgs = '';
    let user_unread_msgs = '';
    let ticket_number = '';

    try{

    let ChatDataFind = await Chat.find({ subject: subject, user_email: user_email }).select('_id dept_id dept_name unread_msgs user_unread_msgs ticket_number');
      
    console.log(ChatDataFind);

    try{
        chat_id = ChatDataFind[0]._id;
        deptID = ChatDataFind[0].dept_id;
        dept_name = ChatDataFind[0].dept_name;
        unread_msgs = ChatDataFind[0].unread_msgs;
        user_unread_msgs = ChatDataFind[0].user_unread_msgs;
        ticket_number = ChatDataFind[0].ticket_number;
       
    }

    catch(e){
       // console.log(e);
        res.send(false);
    }
    
    let ChatDoubleCheck = await ChatDetails.find({chat_id:chat_id}).select('last_msgs_msg'); 
    let ChatDoubleStringCheck = ChatDoubleCheck[0].last_msgs_msg;

    
    let outputString = ChatDoubleStringCheck.replace(/<a[^>]+href="[^"]+\.(pdf|png|jpg|jpeg|gif)"[^>]*>[^<]*<\/a>/gi, '');
    let outputString2 = user_msg.replace(/<a[^>]+href="[^"]+\.(pdf|png|jpg|jpeg|gif)"[^>]*>[^<]*<\/a>/gi, '');
    
    const last_msgs_user = user_name;   
    const last_msgs_msg = user_msg;
   

    
    let last_msgs_date = new Date().toLocaleString('de-DE', {hour12: true, timeZone: process.env.Timezone });
    const last_msgs_time = Date.now();
    const user_ip_address = '0.0.0.0'; 
    const local_filename = []; 


    //Update Using ChatGPT
    let emoji = '😊 Grateful';

    let ask = user_msg+" judge the customer emotion and return it in one single word along with it's single emoji. Do not return deail reply only 1 single emotion and 1 single emoji";

    try {
        const completion = await openai.createCompletion({
            model: "gpt-3.5-turbo-instruct",
            temperature: 1,
            top_p: 1,
            max_tokens: 1000,
            prompt: ask,   
          }); 
       
         emoji=completion.data.choices[0].text;
           

    } catch (e) {      
        console.log(e);
        return '';
    }

   

     
    if(outputString!==outputString2){
         
   

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
    }

    

        const adminStatus = await Admin.count({ masterAdmin: true, admin_status: true });
        const AllAdmin = await Admin.find({ isBlock: false }).select('_id username');
        let adminList=AllAdmin; 
        let ChatResult = [];
    
 
    
        if (parseInt(adminStatus) > 0) {
         
            ChatResult = [{admin_list: adminList, join_room: chat_id, username: user_name, 
                msg: user_msg, date: last_msgs_date, dept_id: deptID, emoji: emoji, dept_name: dept_name,
                unread_msgs: unread_msgs, user_unread_msgs: user_unread_msgs, ticket_number: ticket_number }];
        }
    else {
            const deptID = deptID;
            const DeptData = await Dept.find({ '_id': deptID }).select('dept_admin');
            let DeptAdminList = DeptData[0].dept_admin;
            let AdminStatusData = await Admin.count({ '_id': { $in : DeptAdminList}, 'admin_status' : true }); 
            if(parseInt(AdminStatusData)>0){
            
                ChatResult = [{admin_list: adminList, join_room: chat_id, username: user_name, 
                    msg: user_msg, date: last_msgs_date, dept_id: deptID, emoji: emoji, dept_name: dept_name,
                    unread_msgs: unread_msgs, user_unread_msgs: user_unread_msgs, ticket_number: ticket_number }];
            }
        
        
    }
    
        
        res.send(ChatResult);
    }

    catch(e){
       //console.log(e);
        res.send(false);
    }
    

}); 



module.exports = router;
