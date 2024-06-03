const { Chat, validate } = require("../models/chat_db");
const { ChatDetails } = require("../models/chat_details_db");
const { ChatCloseDetails } = require("../models/chat_close_details_db");
const { ChatClose } = require("../models/chat_close_db");
const { Dept } = require("../models/dept_db");
const auth = require("../middleware/auth"); 
const auth_non_secure = require("../middleware/auth_non_secure"); 
const express = require("express"); 
const router = express.Router();
var ObjectId = require('mongodb').ObjectID;
const { Configuration, OpenAIApi } = require("openai");
 
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

 
process.on('unhandledRejection', (reason, promise) => {
    //console.log("Reason: ", reason, "promise: ", promise);
});

process.on('warning', e => console.warn(e.stack));


router.post("/getTicketResolutionTime", auth, async (req, res) => {

    let start_date = req.body.start_date;
    let end_date = req.body.end_date;
    let company_id = req.body.company_id;
    
 
     const DeptData = await Dept.find({company_id: company_id}).select('dept_name').sort({ dept_name: 1 });
     let ReportArray = [];
 
     for (let i = 0; i < parseInt(DeptData.length); i++) {
         ReportArray.push({
             _id: DeptData[i]._id,
             dept_name: DeptData[i].dept_name,
             issues: [] // Initialize an empty array for messages
         });
     }  
 
     const startDate = new Date(start_date);
     const endDate = new Date(end_date);
 
   
 
     let chatDetails = await ChatCloseDetails.find({
         first_msgs_time: {
             $gte: startDate,
             $lte: endDate,
         },
     }).select('issue_long issue_short dept_id first_msgs_time last_msgs_time ticket_number').sort('-dept_id');

   
 
     length = parseInt(chatDetails.length);
 
     if (length > 0) {
         for (let i = 0; i < length; i++) {
             for (let j = 0; j < parseInt(ReportArray.length); j++) {
                  if (ReportArray[j]._id.toString() === chatDetails[i].dept_id) {
                     try {
                         if(chatDetails[i].issue_short){
                             let issue_long = chatDetails[i].issue_long;
                             let issue_short = chatDetails[i].issue_short;
                             let first_msgs_time = chatDetails[i].first_msgs_time;
                             let last_msgs_time = chatDetails[i].last_msgs_time;
                             let ticket_number = chatDetails[i].ticket_number;
                             if(issue_short.length>0){
                                 ReportArray[j].issues.push({issue_short: issue_short, issue_long: issue_long, first_msgs_time: first_msgs_time, last_msgs_time: last_msgs_time, ticket_number: ticket_number});
                             }
                         }
                        
                     } catch (e) {
                         console.log(e);
                     }
                 }
             }
         }
     }

     // Iterate through departments
     ReportArray.forEach((department) => {
        // Iterate through issues in the department
        department.issues.forEach((issue) => {
            const startDateTime = new Date(issue.first_msgs_time);
            const endDateTime = new Date(issue.last_msgs_time);
            const timeDifferenceMs = endDateTime - startDateTime;
            const timeDifferenceHours = timeDifferenceMs / (1000 * 60 * 60); // Convert milliseconds to hours
    
            // Add time difference to the issue object
            issue.timeDifferenceHours = timeDifferenceHours;
    
            // Convert timeDifferenceHours to the desired format
            const days = Math.floor(timeDifferenceHours / 24);
            const remainingHours = Math.floor(timeDifferenceHours % 24);
            const minutes = Math.floor((timeDifferenceHours * 60) % 60);
            const seconds = Math.floor((timeDifferenceHours * 3600) % 60);
    
            // Add formatted time difference to the issue object
            issue.timeDifferenceFormatted = `${days} Days ${remainingHours} Hours ${minutes} Minutes ${seconds} Seconds`;
        });
    });


    // Create an object to store grouped issues
        const groupedIssues = {};

        // Iterate through departments
        ReportArray.forEach(department => {
            const departmentId = department._id;
            const departmentName = department.dept_name;

            // Initialize the department entry in groupedIssues
            if (!groupedIssues[departmentId]) {
                groupedIssues[departmentId] = {
                    _id: departmentId,
                    dept_name: departmentName,
                    issues: [],
                };
            }

            // Iterate through issues in each department
            department.issues.forEach(issue => {
                const issueShort = issue.issue_short;

                // Check if the issue_short has been encountered before
                const existingIssue = groupedIssues[departmentId].issues.find(i => i.issue_short === issueShort);

                if (existingIssue) {
                    // Increment the count
                    existingIssue.value += 1;

                    // Add the timeDifferenceHours
                    existingIssue.timeDifferenceHours += issue.timeDifferenceHours;

                    // Add the long issue only if it's not already in the set
                    const uniqueLongIssues = new Set(existingIssue.issue_long.map(item => item.name));
                    if (!uniqueLongIssues.has(issue.issue_long)) {
                        existingIssue.issue_long.push({
                            name: issue.issue_long,
                            count: 1,
                            ticket_number_details: [{ ticket_number: issue.ticket_number, timeDifferenceHours: (issue.timeDifferenceHours > 99) ? `${Math.floor(issue.timeDifferenceHours / 24)} Days ${Math.floor(issue.timeDifferenceHours % 24)} Hours` : `${Math.floor(issue.timeDifferenceHours)}:${Math.floor((issue.timeDifferenceHours % 1) * 60)}:${Math.floor((issue.timeDifferenceHours * 3600) % 60)}` }],
                        });
                    } else {
                        const existingLongIssue = existingIssue.issue_long.find(item => item.name === issue.issue_long);
                        existingLongIssue.count += 1;

                        // Check if ticket_number exists, and if not, add it
                        const existingTicketNumber = existingLongIssue.ticket_number_details.find(ticket => ticket.ticket_number === issue.ticket_number);
                        if (!existingTicketNumber) {
                            existingLongIssue.ticket_number_details.push({ ticket_number: issue.ticket_number, timeDifferenceHours: (issue.timeDifferenceHours > 99) ? `${Math.floor(issue.timeDifferenceHours / 24)} Days ${Math.floor(issue.timeDifferenceHours % 24)} Hours` : `${Math.floor(issue.timeDifferenceHours)}:${Math.floor((issue.timeDifferenceHours % 1) * 60)}:${Math.floor((issue.timeDifferenceHours * 3600) % 60)}` });
                        }
                    }
                } else {
                    // Initialize a new entry for the issue_short
                    groupedIssues[departmentId].issues.push({
                        issue_short: issueShort,
                        value: 1,
                        timeDifferenceHours: issue.timeDifferenceHours,
                        issue_long: [{
                            name: issue.issue_long,
                            count: 1,
                            ticket_number_details: [{ ticket_number: issue.ticket_number, timeDifferenceHours: (issue.timeDifferenceHours > 99) ? `${Math.floor(issue.timeDifferenceHours / 24)} Days ${Math.floor(issue.timeDifferenceHours % 24)} Hours` : `${Math.floor(issue.timeDifferenceHours)}:${Math.floor((issue.timeDifferenceHours % 1) * 60)}:${Math.floor((issue.timeDifferenceHours * 3600) % 60)}` }],
                        }],
                    });
                }
            });
        });

        // Transform the groupedIssues object into an array
        const resultArray = Object.values(groupedIssues);

        // Calculate the average timeDifferenceHours for each issue_short
        resultArray.forEach(department => {
            department.issues.forEach(issue => {
                issue.averageTimeDifferenceHours = issue.timeDifferenceHours / issue.value;
            });
        });

        // Format the average timeDifferenceHours
        resultArray.forEach(department => {
            department.issues.forEach(issue => {
                if (issue.averageTimeDifferenceHours > 99) {
                    const days = Math.floor(issue.averageTimeDifferenceHours / 24);
                    const hours = Math.floor(issue.averageTimeDifferenceHours % 24);
                    issue.averageTimeDifferenceFormatted = `${days} Days ${hours} Hours`;
                } else {
                    const hours = Math.floor(issue.averageTimeDifferenceHours);
                    const minutes = Math.floor((issue.averageTimeDifferenceHours % 1) * 60);
                    const seconds = Math.floor((issue.averageTimeDifferenceHours * 3600) % 60);
                    issue.averageTimeDifferenceFormatted = `${hours}:${minutes}:${seconds}`;
                }
            });
        });

        // Sort the issues array by the 'value' field in descending order
        resultArray.forEach(department => {
            department.issues.sort((a, b) => b.value - a.value);
        });

        const transformedArray = resultArray.map((dept) => {
            const resultDept = [
                { id: dept._id, dept_name: dept.dept_name },
                ...dept.issues.map((issue) => ({
                    value: issue.value,
                    name: issue.issue_short,
                    averageTimeDifferenceHours: issue.averageTimeDifferenceFormatted,
                    long_issue: issue.issue_long.map((long) => ({
                        name: long.name,
                        count: long.count,
                        ticket_number_details: long.ticket_number_details.map(ticket => ({
                            ticket_number: ticket.ticket_number,
                            timeDifferenceHours: ticket.timeDifferenceHours,
                        })),
                    })),
                })),
            ];

            return resultDept;
        });
 

        res.send(transformedArray);


 });

router.post("/getTicketDeptIssues", auth, async (req, res) => {

    let start_date = req.body.start_date;
    let end_date = req.body.end_date;   
    let company_id = req.body.company_id;
 
    const DeptData = await Dept.find({company_id: company_id}).select('dept_name').sort({ dept_name: 1 });
    let ReportArray = [];

    for (let i = 0; i < parseInt(DeptData.length); i++) {
        ReportArray.push({
            _id: DeptData[i]._id,
            dept_name: DeptData[i].dept_name,
            issues: [] // Initialize an empty array for messages
        });
    }  

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    let chatDetails = await ChatDetails.find({
        first_msgs_time: {
            $gte: startDate,
            $lte: endDate,
        },
    }).select('issue_long issue_short dept_id admin_id ticket_number').sort('-dept_id');

  

    let length = parseInt(chatDetails.length);

    if (length > 0) {
        for (let i = 0; i < length; i++) {
            for (let j = 0; j < parseInt(ReportArray.length); j++) {
                if (ReportArray[j]._id.toString() === chatDetails[i].dept_id) {
                    try {
                        if(chatDetails[i].issue_short){ 
                            let issue_long = chatDetails[i].issue_long;
                            let issue_short = chatDetails[i].issue_short;
                            let admin_id = chatDetails[i].admin_id;
                            let ticket_number = chatDetails[i].ticket_number;
                            if(issue_short.length>0){
                                ReportArray[j].issues.push({issue_short: issue_short, issue_long: issue_long, admin_id: admin_id, ticket_number: ticket_number});
                            }
                        }                      
                                       
                    } catch (e) {
                        console.log(e);
                    }
                }
            }
        }
    }

    chatDetails = await ChatCloseDetails.find({
        first_msgs_time: {
            $gte: startDate,
            $lte: endDate,
        },
    }).select('issue_long issue_short dept_id admin_id ticket_number').sort('-dept_id');

    length = parseInt(chatDetails.length);

    if (length > 0) {
        for (let i = 0; i < length; i++) {
            for (let j = 0; j < parseInt(ReportArray.length); j++) {
                if (ReportArray[j]._id.toString() === chatDetails[i].dept_id) {
                    try {
                        if(chatDetails[i].issue_short){
                            let issue_long = chatDetails[i].issue_long;
                            let issue_short = chatDetails[i].issue_short;
                            let admin_id = chatDetails[i].admin_id;
                            let ticket_number = chatDetails[i].ticket_number;
                            if(issue_short.length>0){
                                ReportArray[j].issues.push({issue_short: issue_short, issue_long: issue_long, admin_id:admin_id, ticket_number: ticket_number});
                            }
                        }
                       
                    } catch (e) {
                        console.log(e);
                    }
                }
            }
        }
    }
  
     // Create an object to store grouped issues
    const groupedIssues = {};

    // Iterate through departments
    ReportArray.forEach((department) => {
        const departmentId = department._id;
        const departmentName = department.dept_name;

        // Initialize the department entry in groupedIssues
        if (!groupedIssues[departmentId]) {
            groupedIssues[departmentId] = {
                _id: departmentId,
                dept_name: departmentName,
                issues: [],
            };
        }

        // Iterate through issues in each department
        department.issues.forEach((issue) => {
            const issueShort = issue.issue_short;

            // Check if the issue_short has been encountered before
            const existingIssue = groupedIssues[departmentId].issues.find((i) => i.issue_short === issueShort);

            if (existingIssue) {
                // Increment the count
                existingIssue.value += 1;
                // Add the long issue only if it's not already in the set
                const uniqueLongIssues = new Set(existingIssue.issue_long.map((item) => item.name));
                if (!uniqueLongIssues.has(issue.issue_long)) {
                    existingIssue.issue_long.push({
                        name: issue.issue_long,
                        count: 1,
                        ticket_number: [issue.ticket_number]
                    });
                } else {
                    const existingLongIssue = existingIssue.issue_long.find((item) => item.name === issue.issue_long);
                    existingLongIssue.count += 1;
                    existingLongIssue.ticket_number.push(issue.ticket_number);
                }
            } else {
                // Initialize a new entry for the issue_short
                groupedIssues[departmentId].issues.push({
                    issue_short: issueShort,
                    value: 1,
                    issue_long: [{
                        name: issue.issue_long,
                        count: 1,
                        ticket_number: [issue.ticket_number]
                    }],
                });
            }
        });
    });

 

    // Transform the groupedIssues object into an array
    const resultArray = Object.values(groupedIssues);

    // Sort the issues array by the 'value' field in descending order
    resultArray.forEach((department) => {
        department.issues.sort((a, b) => b.value - a.value);
    });

    const transformedArray = resultArray.map((dept) => {
        const resultDept = [
            { id: dept._id, dept_name: dept.dept_name },
            ...dept.issues.map((issue) => ({
            value: issue.value,
            name: issue.issue_short,
            long_issue: issue.issue_long.map((long) => ({
                name: long.name,
                count: long.count,
                ticket_number: long.ticket_number,
            })),
            })),
        ];

        return resultDept;
        });
 
        res.send(transformedArray);


});


router.post("/getTicketCustomerEmotions", auth, async (req, res) => {

    let start_date = req.body.start_date;
    let end_date = req.body.end_date;  
    let company_id = req.body.company_id;

    const DeptData = await Dept.find({company_id:company_id}).select('dept_name').sort({ dept_name: 1 });
    let ReportArray = [];

    for (let i = 0; i < parseInt(DeptData.length); i++) {
        ReportArray.push({
            _id: DeptData[i]._id,
            dept_name: DeptData[i].dept_name,
            issues: [] // Initialize an empty array for messages
        });
    }  

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    let chatDetails = await ChatDetails.find({
        first_msgs_time: {
            $gte: startDate,
            $lte: endDate,
        },
    }).select('issue_long issue_short dept_id admin_id ticket_number last_emoji').sort('-dept_id');

    let length = parseInt(chatDetails.length);

    if (length > 0) {
        for (let i = 0; i < length; i++) {
            for (let j = 0; j < parseInt(ReportArray.length); j++) {
                if (ReportArray[j]._id.toString() === chatDetails[i].dept_id) {
                    try {
                        if(chatDetails[i].issue_short){ 
                            let issue_long = chatDetails[i].issue_long;
                            let issue_short = chatDetails[i].issue_short;
                            let admin_id = chatDetails[i].admin_id;
                            let ticket_number = chatDetails[i].ticket_number;
                            let emoji = chatDetails[i].last_emoji;
                            if(issue_short.length>0){
                                ReportArray[j].issues.push({issue_short: issue_short, issue_long: issue_long, admin_id: admin_id, ticket_number: ticket_number, emoji: emoji});
                            }
                        }                      
                                       
                    } catch (e) {
                        console.log(e);
                    }
                }
            }
        }
    }

    chatDetails = await ChatCloseDetails.find({
        first_msgs_time: {
            $gte: startDate,
            $lte: endDate,
        },
    }).select('issue_long issue_short dept_id admin_id ticket_number last_emoji').sort('-dept_id');

    length = parseInt(chatDetails.length);

    if (length > 0) {
        for (let i = 0; i < length; i++) {
            for (let j = 0; j < parseInt(ReportArray.length); j++) {
                if (ReportArray[j]._id.toString() === chatDetails[i].dept_id) {
                    try {
                        if(chatDetails[i].issue_short){
                            let issue_long = chatDetails[i].issue_long;
                            let issue_short = chatDetails[i].issue_short;
                            let admin_id = chatDetails[i].admin_id;
                            let ticket_number = chatDetails[i].ticket_number;
                            let emoji = chatDetails[i].last_emoji;
                            if(issue_short.length>0){
                                ReportArray[j].issues.push({issue_short: issue_short, issue_long: issue_long, admin_id:admin_id, ticket_number: ticket_number, emoji: emoji});
                            }
                        }
                       
                    } catch (e) {
                        console.log(e);
                    }
                }
            }
        }
    }
 
 
   // Create an object to store grouped issues
        const groupedIssues = {};

        // Iterate through departments
        ReportArray.forEach((department) => {
            const departmentId = department._id;
            const departmentName = department.dept_name;

            // Initialize the department entry in groupedIssues
            if (!groupedIssues[departmentId]) {
                groupedIssues[departmentId] = {
                    _id: departmentId,
                    dept_name: departmentName,
                    issues: [],
                };
            }

            // Iterate through issues in each department
            department.issues.forEach((issue) => {
                const issueShort = issue.issue_short;

                // Check if the issue_short has been encountered before
                const existingIssue = groupedIssues[departmentId].issues.find((i) => i.issue_short === issueShort);

                if (existingIssue) {
                    // Increment the count
                    existingIssue.value += 1;
                    // Add the long issue only if it's not already in the set
                    const uniqueLongIssues = new Set(existingIssue.issue_long.map((item) => item.name));
                    if (!uniqueLongIssues.has(issue.issue_long)) {
                        existingIssue.issue_long.push({
                            name: issue.issue_long,
                            count: 1,
                            ticket_number: [issue.ticket_number],
                            emoji_array: [issue.emoji],
                        });
                    } else {
                        const existingLongIssue = existingIssue.issue_long.find((item) => item.name === issue.issue_long);
                        existingLongIssue.count += 1;
                        existingLongIssue.ticket_number.push(issue.ticket_number);
                        existingLongIssue.emoji_array.push(issue.emoji);
                    }
                    // Update the "emoji" field with the most occurring emoji in "long_issue"
                    const emojiCountMap = {};
                    existingIssue.issue_long.forEach((long) => {
                        long.emoji_array.forEach((emoji) => {
                            emojiCountMap[emoji] = (emojiCountMap[emoji] || 0) + 1;
                        });
                    });
                    const mostOccurringEmoji = Object.keys(emojiCountMap).reduce((a, b) => emojiCountMap[a] > emojiCountMap[b] ? a : b);
                    existingIssue.emoji = mostOccurringEmoji;
                } else {
                    // Initialize a new entry for the issue_short
                    groupedIssues[departmentId].issues.push({
                        issue_short: issueShort,
                        value: 1,
                        emoji: issue.emoji,
                        issue_long: [{
                            name: issue.issue_long,
                            count: 1,
                            ticket_number: [issue.ticket_number],
                            emoji_array: [issue.emoji],
                        }],
                    });
                }
            });
        });

        // Transform the groupedIssues object into an array
        const resultArray = Object.values(groupedIssues);

        // Sort the issues array by the 'value' field in descending order
        resultArray.forEach((department) => {
            department.issues.sort((a, b) => b.value - a.value);
        });

        const transformedArray = resultArray.map((dept) => {
            const resultDept = [
                { id: dept._id, dept_name: dept.dept_name },
                ...dept.issues.map((issue) => ({
                    value: issue.value,
                    name: issue.issue_short,
                    emoji: issue.emoji,
                    long_issue: issue.issue_long.map((long) => ({
                        name: long.name,
                        count: long.count,
                        ticket_number_details: long.ticket_number.map((ticket, index) => ({
                            ticket_number: ticket,
                            emoji: long.emoji_array[index],
                        })),
                    })),
                })),
            ];
        
            return resultDept;
        });
        

        res.send(transformedArray);

 





});

router.post("/getTicketCustomerAdminEmotions", auth, async (req, res) => {

    let start_date = req.body.start_date;
    let end_date = req.body.end_date;  
    let admin_id = req.body.admin_id;
    let company_id = req.body.company_id;
     
 
    const DeptData = await Dept.find({company_id:company_id}).select('dept_name').sort({ dept_name: 1 });
    let ReportArray = [];

    for (let i = 0; i < parseInt(DeptData.length); i++) {
        ReportArray.push({
            _id: DeptData[i]._id,
            dept_name: DeptData[i].dept_name,
            issues: [] // Initialize an empty array for messages
        });
    }  

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    let chatDetails = await ChatDetails.find({
        first_msgs_time: {
            $gte: startDate,
            $lte: endDate,
        },
        admin_id: admin_id
    }).select('issue_long issue_short dept_id admin_id ticket_number last_emoji').sort('-dept_id');

    let length = parseInt(chatDetails.length);

    if (length > 0) {
        for (let i = 0; i < length; i++) {
            for (let j = 0; j < parseInt(ReportArray.length); j++) {
                if (ReportArray[j]._id.toString() === chatDetails[i].dept_id) {
                    try {
                        if(chatDetails[i].issue_short){ 
                            let issue_long = chatDetails[i].issue_long;
                            let issue_short = chatDetails[i].issue_short;
                            let admin_id = chatDetails[i].admin_id;
                            let ticket_number = chatDetails[i].ticket_number;
                            let emoji = chatDetails[i].last_emoji;
                            if(issue_short.length>0){
                                ReportArray[j].issues.push({issue_short: issue_short, issue_long: issue_long, admin_id: admin_id, ticket_number: ticket_number, emoji: emoji});
                            }
                        }                      
                                       
                    } catch (e) {
                        console.log(e);
                    }
                }
            }
        }
    }

    chatDetails = await ChatCloseDetails.find({
        first_msgs_time: {
            $gte: startDate,
            $lte: endDate,
        },
        admin_id: admin_id
    }).select('issue_long issue_short dept_id admin_id ticket_number last_emoji').sort('-dept_id');

    length = parseInt(chatDetails.length);

    if (length > 0) {
        for (let i = 0; i < length; i++) {
            for (let j = 0; j < parseInt(ReportArray.length); j++) {
                if (ReportArray[j]._id.toString() === chatDetails[i].dept_id) {
                    try {
                        if(chatDetails[i].issue_short){
                            let issue_long = chatDetails[i].issue_long;
                            let issue_short = chatDetails[i].issue_short;
                            let admin_id = chatDetails[i].admin_id;
                            let ticket_number = chatDetails[i].ticket_number;
                            let emoji = chatDetails[i].last_emoji;
                            if(issue_short.length>0){
                                ReportArray[j].issues.push({issue_short: issue_short, issue_long: issue_long, admin_id:admin_id, ticket_number: ticket_number, emoji: emoji});
                            }
                        }
                       
                    } catch (e) {
                        console.log(e);
                    }
                }
            }
        }
    }
 
 
   // Create an object to store grouped issues
        const groupedIssues = {};

        // Iterate through departments
        ReportArray.forEach((department) => {
            const departmentId = department._id;
            const departmentName = department.dept_name;

            // Initialize the department entry in groupedIssues
            if (!groupedIssues[departmentId]) {
                groupedIssues[departmentId] = {
                    _id: departmentId,
                    dept_name: departmentName,
                    issues: [],
                };
            }

            // Iterate through issues in each department
            department.issues.forEach((issue) => {
                const issueShort = issue.issue_short;

                // Check if the issue_short has been encountered before
                const existingIssue = groupedIssues[departmentId].issues.find((i) => i.issue_short === issueShort);

                if (existingIssue) {
                    // Increment the count
                    existingIssue.value += 1;
                    // Add the long issue only if it's not already in the set
                    const uniqueLongIssues = new Set(existingIssue.issue_long.map((item) => item.name));
                    if (!uniqueLongIssues.has(issue.issue_long)) {
                        existingIssue.issue_long.push({
                            name: issue.issue_long,
                            count: 1,
                            ticket_number: [issue.ticket_number],
                            emoji_array: [issue.emoji],
                        });
                    } else {
                        const existingLongIssue = existingIssue.issue_long.find((item) => item.name === issue.issue_long);
                        existingLongIssue.count += 1;
                        existingLongIssue.ticket_number.push(issue.ticket_number);
                        existingLongIssue.emoji_array.push(issue.emoji);
                    }
                    // Update the "emoji" field with the most occurring emoji in "long_issue"
                    const emojiCountMap = {};
                    existingIssue.issue_long.forEach((long) => {
                        long.emoji_array.forEach((emoji) => {
                            emojiCountMap[emoji] = (emojiCountMap[emoji] || 0) + 1;
                        });
                    });
                    const mostOccurringEmoji = Object.keys(emojiCountMap).reduce((a, b) => emojiCountMap[a] > emojiCountMap[b] ? a : b);
                    existingIssue.emoji = mostOccurringEmoji;
                } else {
                    // Initialize a new entry for the issue_short
                    groupedIssues[departmentId].issues.push({
                        issue_short: issueShort,
                        value: 1,
                        emoji: issue.emoji,
                        issue_long: [{
                            name: issue.issue_long,
                            count: 1,
                            ticket_number: [issue.ticket_number],
                            emoji_array: [issue.emoji],
                        }],
                    });
                }
            });
        });

        // Transform the groupedIssues object into an array
        const resultArray = Object.values(groupedIssues);

        // Sort the issues array by the 'value' field in descending order
        resultArray.forEach((department) => {
            department.issues.sort((a, b) => b.value - a.value);
        });

        const transformedArray = resultArray.map((dept) => {
            const resultDept = [
                { id: dept._id, dept_name: dept.dept_name },
                ...dept.issues.map((issue) => ({
                    value: issue.value,
                    name: issue.issue_short,
                    emoji: issue.emoji,
                    long_issue: issue.issue_long.map((long) => ({
                        name: long.name,
                        count: long.count,
                        ticket_number_details: long.ticket_number.map((ticket, index) => ({
                            ticket_number: ticket,
                            emoji: long.emoji_array[index],
                        })),
                    })),
                })),
            ];
        
            return resultDept;
        });
        

        res.send(transformedArray);






});

router.post("/getTicketFeedbackEmotions", auth, async (req, res) => {

    let start_date = req.body.start_date;
    let end_date = req.body.end_date;  
    let company_id = req.body.company_id;
     
 
    const DeptData = await Dept.find({company_id:company_id}).select('dept_name').sort({ dept_name: 1 });
    let ReportArray = [];

    for (let i = 0; i < parseInt(DeptData.length); i++) {
        ReportArray.push({
            _id: DeptData[i]._id,
            dept_name: DeptData[i].dept_name,
            issues: [] // Initialize an empty array for messages
        });
    }  

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);



    let chatDetails = await ChatCloseDetails.find({
        first_msgs_time: {
            $gte: startDate,
            $lte: endDate,
        },
        chat_ratings: {$gt:0}
    }).select('issue_long issue_short dept_id admin_id ticket_number last_emoji chat_id').sort('-dept_id');

    length = parseInt(chatDetails.length);
   

    if (length > 0) {
        for (let i = 0; i < length; i++) {
            for (let j = 0; j < parseInt(ReportArray.length); j++) {
               
                if (ReportArray[j]._id.toString() === chatDetails[i].dept_id) {
                    try {
                        if(chatDetails[i].issue_short){
                            let issue_long = chatDetails[i].issue_long;
                            let issue_short = chatDetails[i].issue_short;
                            let admin_id = chatDetails[i].admin_id;
                            let ticket_number = chatDetails[i].ticket_number;
                            let emoji = chatDetails[i].last_emoji;
                            if(issue_short.length>0){
                                ReportArray[j].issues.push({issue_short: issue_short, issue_long: issue_long, admin_id:admin_id, ticket_number: ticket_number, emoji: emoji});
                            }
                        }
                       
                    } catch (e) {
                        console.log(e);
                    }
                    }
                
            }
        }
    }
 
 
   // Create an object to store grouped issues
        const groupedIssues = {};

        // Iterate through departments
        ReportArray.forEach((department) => {
            const departmentId = department._id;
            const departmentName = department.dept_name;

            // Initialize the department entry in groupedIssues
            if (!groupedIssues[departmentId]) {
                groupedIssues[departmentId] = {
                    _id: departmentId,
                    dept_name: departmentName,
                    issues: [],
                };
            }

            // Iterate through issues in each department
            department.issues.forEach((issue) => {
                const issueShort = issue.issue_short;

                // Check if the issue_short has been encountered before
                const existingIssue = groupedIssues[departmentId].issues.find((i) => i.issue_short === issueShort);

                if (existingIssue) {
                    // Increment the count
                    existingIssue.value += 1;
                    // Add the long issue only if it's not already in the set
                    const uniqueLongIssues = new Set(existingIssue.issue_long.map((item) => item.name));
                    if (!uniqueLongIssues.has(issue.issue_long)) {
                        existingIssue.issue_long.push({
                            name: issue.issue_long,
                            count: 1,
                            ticket_number: [issue.ticket_number],
                            emoji_array: [issue.emoji],
                        });
                    } else {
                        const existingLongIssue = existingIssue.issue_long.find((item) => item.name === issue.issue_long);
                        existingLongIssue.count += 1;
                        existingLongIssue.ticket_number.push(issue.ticket_number);
                        existingLongIssue.emoji_array.push(issue.emoji);
                    }
                    // Update the "emoji" field with the most occurring emoji in "long_issue"
                    const emojiCountMap = {};
                    existingIssue.issue_long.forEach((long) => {
                        long.emoji_array.forEach((emoji) => {
                            emojiCountMap[emoji] = (emojiCountMap[emoji] || 0) + 1;
                        });
                    });
                    const mostOccurringEmoji = Object.keys(emojiCountMap).reduce((a, b) => emojiCountMap[a] > emojiCountMap[b] ? a : b);
                    existingIssue.emoji = mostOccurringEmoji;
                } else {
                    // Initialize a new entry for the issue_short
                    groupedIssues[departmentId].issues.push({
                        issue_short: issueShort,
                        value: 1,
                        emoji: issue.emoji,
                        issue_long: [{
                            name: issue.issue_long,
                            count: 1,
                            ticket_number: [issue.ticket_number],
                            emoji_array: [issue.emoji],
                        }],
                    });
                }
            });
        });

        // Transform the groupedIssues object into an array
        const resultArray = Object.values(groupedIssues);

        // Sort the issues array by the 'value' field in descending order
        resultArray.forEach((department) => {
            department.issues.sort((a, b) => b.value - a.value);
        });

        const transformedArray = resultArray.map((dept) => {
            const resultDept = [
                { id: dept._id, dept_name: dept.dept_name },
                ...dept.issues.map((issue) => ({
                    value: issue.value,
                    name: issue.issue_short,
                    emoji: issue.emoji,
                    long_issue: issue.issue_long.map((long) => ({
                        name: long.name,
                        count: long.count,
                        ticket_number_details: long.ticket_number.map((ticket, index) => ({
                            ticket_number: ticket,
                            emoji: long.emoji_array[index],
                        })),
                    })),
                })),
            ];
        
            return resultDept;
        });

        res.send(transformedArray);

 





});

router.post("/getTicketFeedbackAdminEmotions", auth, async (req, res) => {

    let start_date = req.body.start_date;
    let end_date = req.body.end_date;  
    let admin_id = req.body.admin_id;
    let company_id = req.body.company_id;
 
    const DeptData = await Dept.find({company_id:company_id}).select('dept_name').sort({ dept_name: 1 });
    let ReportArray = [];

    for (let i = 0; i < parseInt(DeptData.length); i++) {
        ReportArray.push({
            _id: DeptData[i]._id,
            dept_name: DeptData[i].dept_name,
            issues: [] // Initialize an empty array for messages
        });
    }  

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
 


    let chatDetails = await ChatCloseDetails.find({
        first_msgs_time: {
            $gte: startDate,
            $lte: endDate,
        },
        chat_ratings: {$gt:0},
        admin_id: admin_id
    }).select('issue_long issue_short dept_id admin_id ticket_number last_emoji chat_id').sort('-dept_id');

    length = parseInt(chatDetails.length); 
   

    if (length > 0) {
        for (let i = 0; i < length; i++) {
            for (let j = 0; j < parseInt(ReportArray.length); j++) {
                if (ReportArray[j]._id.toString() === chatDetails[i].dept_id) {
                    try {
                        if(chatDetails[i].issue_short){
                            let issue_long = chatDetails[i].issue_long;
                            let issue_short = chatDetails[i].issue_short;
                            let admin_id = chatDetails[i].admin_id;
                            let ticket_number = chatDetails[i].ticket_number;
                            let emoji = chatDetails[i].last_emoji;
                            if(issue_short.length>0){
                                ReportArray[j].issues.push({issue_short: issue_short, issue_long: issue_long, admin_id:admin_id, ticket_number: ticket_number, emoji: emoji});
                            }
                        }
                       
                    } catch (e) {
                        console.log(e);
                    }
                    
                }
            }
        }
    }
 
 
   // Create an object to store grouped issues
        const groupedIssues = {};

        // Iterate through departments
        ReportArray.forEach((department) => {
            const departmentId = department._id;
            const departmentName = department.dept_name;

            // Initialize the department entry in groupedIssues
            if (!groupedIssues[departmentId]) {
                groupedIssues[departmentId] = {
                    _id: departmentId,
                    dept_name: departmentName,
                    issues: [],
                };
            }

            // Iterate through issues in each department
            department.issues.forEach((issue) => {
                const issueShort = issue.issue_short;

                // Check if the issue_short has been encountered before
                const existingIssue = groupedIssues[departmentId].issues.find((i) => i.issue_short === issueShort);

                if (existingIssue) {
                    // Increment the count
                    existingIssue.value += 1;
                    // Add the long issue only if it's not already in the set
                    const uniqueLongIssues = new Set(existingIssue.issue_long.map((item) => item.name));
                    if (!uniqueLongIssues.has(issue.issue_long)) {
                        existingIssue.issue_long.push({
                            name: issue.issue_long,
                            count: 1,
                            ticket_number: [issue.ticket_number],
                            emoji_array: [issue.emoji],
                        });
                    } else {
                        const existingLongIssue = existingIssue.issue_long.find((item) => item.name === issue.issue_long);
                        existingLongIssue.count += 1;
                        existingLongIssue.ticket_number.push(issue.ticket_number);
                        existingLongIssue.emoji_array.push(issue.emoji);
                    }
                    // Update the "emoji" field with the most occurring emoji in "long_issue"
                    const emojiCountMap = {};
                    existingIssue.issue_long.forEach((long) => {
                        long.emoji_array.forEach((emoji) => {
                            emojiCountMap[emoji] = (emojiCountMap[emoji] || 0) + 1;
                        });
                    });
                    const mostOccurringEmoji = Object.keys(emojiCountMap).reduce((a, b) => emojiCountMap[a] > emojiCountMap[b] ? a : b);
                    existingIssue.emoji = mostOccurringEmoji;
                } else {
                    // Initialize a new entry for the issue_short
                    groupedIssues[departmentId].issues.push({
                        issue_short: issueShort,
                        value: 1,
                        emoji: issue.emoji,
                        issue_long: [{
                            name: issue.issue_long,
                            count: 1,
                            ticket_number: [issue.ticket_number],
                            emoji_array: [issue.emoji],
                        }],
                    });
                }
            });
        });

        // Transform the groupedIssues object into an array
        const resultArray = Object.values(groupedIssues);

        // Sort the issues array by the 'value' field in descending order
        resultArray.forEach((department) => {
            department.issues.sort((a, b) => b.value - a.value);
        });

        const transformedArray = resultArray.map((dept) => {
            const resultDept = [
                { id: dept._id, dept_name: dept.dept_name },
                ...dept.issues.map((issue) => ({
                    value: issue.value,
                    name: issue.issue_short,
                    emoji: issue.emoji,
                    long_issue: issue.issue_long.map((long) => ({
                        name: long.name,
                        count: long.count,
                        ticket_number_details: long.ticket_number.map((ticket, index) => ({
                            ticket_number: ticket,
                            emoji: long.emoji_array[index],
                        })),
                    })),
                })),
            ];
        
            return resultDept;
        });

        res.send(transformedArray);

 





});

router.post("/getTicketResolutionAdminTime", auth, async (req, res) => {

    let start_date = req.body.start_date;
    let end_date = req.body.end_date;
    let admin_id = req.body.admin_id;
    let company_id = req.body.company_id;
    
 
     const DeptData = await Dept.find({company_id:company_id}).select('dept_name').sort({ dept_name: 1 });
     let ReportArray = [];
 
     for (let i = 0; i < parseInt(DeptData.length); i++) {
         ReportArray.push({
             _id: DeptData[i]._id,
             dept_name: DeptData[i].dept_name,
             issues: [] // Initialize an empty array for messages
         });
     }  
 
     const startDate = new Date(start_date);
     const endDate = new Date(end_date);
 
   
 
     let chatDetails = await ChatCloseDetails.find({
         first_msgs_time: {
             $gte: startDate,
             $lte: endDate,
         },
         admin_id: admin_id
     }).select('issue_long issue_short dept_id first_msgs_time last_msgs_time').sort('-dept_id');

   
 
     length = parseInt(chatDetails.length);
 
     if (length > 0) {
         for (let i = 0; i < length; i++) {
             for (let j = 0; j < parseInt(ReportArray.length); j++) {
                  if (ReportArray[j]._id.toString() === chatDetails[i].dept_id) {
                     try {
                         if(chatDetails[i].issue_short){
                             let issue_long = chatDetails[i].issue_long;
                             let issue_short = chatDetails[i].issue_short;
                             let first_msgs_time = chatDetails[i].first_msgs_time;
                             let last_msgs_time = chatDetails[i].last_msgs_time;
                             if(issue_short.length>0){
                                 ReportArray[j].issues.push({issue_short: issue_short, issue_long: issue_long, first_msgs_time: first_msgs_time, last_msgs_time: last_msgs_time});
                             }
                         }
                        
                     } catch (e) {
                         console.log(e);
                     }
                 }
             }
         }
     }

        // Iterate through departments
     ReportArray.forEach((department) => {
        // Iterate through issues in the department
        department.issues.forEach((issue) => {
            const startDateTime = new Date(issue.first_msgs_time);
            const endDateTime = new Date(issue.last_msgs_time);
            const timeDifferenceMs = endDateTime - startDateTime;
            const timeDifferenceHours = timeDifferenceMs / (1000 * 60 * 60); // Convert milliseconds to hours
    
            // Add time difference to the issue object
            issue.timeDifferenceHours = timeDifferenceHours;
    
            // Convert timeDifferenceHours to the desired format
            const days = Math.floor(timeDifferenceHours / 24);
            const remainingHours = Math.floor(timeDifferenceHours % 24);
            const minutes = Math.floor((timeDifferenceHours * 60) % 60);
            const seconds = Math.floor((timeDifferenceHours * 3600) % 60);
    
            // Add formatted time difference to the issue object
            issue.timeDifferenceFormatted = `${days} Days ${remainingHours} Hours ${minutes} Minutes ${seconds} Seconds`;
        });
    });


   // Create an object to store grouped issues
   const groupedIssues = {};

   // Iterate through departments
   ReportArray.forEach(department => {
       const departmentId = department._id;
       const departmentName = department.dept_name;

       // Initialize the department entry in groupedIssues
       if (!groupedIssues[departmentId]) {
           groupedIssues[departmentId] = {
               _id: departmentId,
               dept_name: departmentName,
               issues: [],
           };
       }

       // Iterate through issues in each department
       department.issues.forEach(issue => {
           const issueShort = issue.issue_short;

           // Check if the issue_short has been encountered before
           const existingIssue = groupedIssues[departmentId].issues.find(i => i.issue_short === issueShort);

           if (existingIssue) {
               // Increment the count
               existingIssue.value += 1;

               // Add the timeDifferenceHours
               existingIssue.timeDifferenceHours += issue.timeDifferenceHours;

               // Add the long issue only if it's not already in the set
               const uniqueLongIssues = new Set(existingIssue.issue_long.map(item => item.name));
               if (!uniqueLongIssues.has(issue.issue_long)) {
                   existingIssue.issue_long.push({
                       name: issue.issue_long,
                       count: 1,
                       ticket_number_details: [{ ticket_number: issue.ticket_number, timeDifferenceHours: (issue.timeDifferenceHours > 99) ? `${Math.floor(issue.timeDifferenceHours / 24)} Days ${Math.floor(issue.timeDifferenceHours % 24)} Hours` : `${Math.floor(issue.timeDifferenceHours)}:${Math.floor((issue.timeDifferenceHours % 1) * 60)}:${Math.floor((issue.timeDifferenceHours * 3600) % 60)}` }],
                   });
               } else {
                   const existingLongIssue = existingIssue.issue_long.find(item => item.name === issue.issue_long);
                   existingLongIssue.count += 1;

                   // Check if ticket_number exists, and if not, add it
                   const existingTicketNumber = existingLongIssue.ticket_number_details.find(ticket => ticket.ticket_number === issue.ticket_number);
                   if (!existingTicketNumber) {
                       existingLongIssue.ticket_number_details.push({ ticket_number: issue.ticket_number, timeDifferenceHours: (issue.timeDifferenceHours > 99) ? `${Math.floor(issue.timeDifferenceHours / 24)} Days ${Math.floor(issue.timeDifferenceHours % 24)} Hours` : `${Math.floor(issue.timeDifferenceHours)}:${Math.floor((issue.timeDifferenceHours % 1) * 60)}:${Math.floor((issue.timeDifferenceHours * 3600) % 60)}` });
                   }
               }
           } else {
               // Initialize a new entry for the issue_short
               groupedIssues[departmentId].issues.push({
                   issue_short: issueShort,
                   value: 1,
                   timeDifferenceHours: issue.timeDifferenceHours,
                   issue_long: [{
                       name: issue.issue_long,
                       count: 1,
                       ticket_number_details: [{ ticket_number: issue.ticket_number, timeDifferenceHours: (issue.timeDifferenceHours > 99) ? `${Math.floor(issue.timeDifferenceHours / 24)} Days ${Math.floor(issue.timeDifferenceHours % 24)} Hours` : `${Math.floor(issue.timeDifferenceHours)}:${Math.floor((issue.timeDifferenceHours % 1) * 60)}:${Math.floor((issue.timeDifferenceHours * 3600) % 60)}` }],
                   }],
               });
           }
       });
   });

   // Transform the groupedIssues object into an array
   const resultArray = Object.values(groupedIssues);

   // Calculate the average timeDifferenceHours for each issue_short
   resultArray.forEach(department => {
       department.issues.forEach(issue => {
           issue.averageTimeDifferenceHours = issue.timeDifferenceHours / issue.value;
       });
   });

   // Format the average timeDifferenceHours
   resultArray.forEach(department => {
       department.issues.forEach(issue => {
           if (issue.averageTimeDifferenceHours > 99) {
               const days = Math.floor(issue.averageTimeDifferenceHours / 24);
               const hours = Math.floor(issue.averageTimeDifferenceHours % 24);
               issue.averageTimeDifferenceFormatted = `${days} Days ${hours} Hours`;
           } else {
               const hours = Math.floor(issue.averageTimeDifferenceHours);
               const minutes = Math.floor((issue.averageTimeDifferenceHours % 1) * 60);
               const seconds = Math.floor((issue.averageTimeDifferenceHours * 3600) % 60);
               issue.averageTimeDifferenceFormatted = `${hours}:${minutes}:${seconds}`;
           }
       });
   });

   // Sort the issues array by the 'value' field in descending order
   resultArray.forEach(department => {
       department.issues.sort((a, b) => b.value - a.value);
   });

   const transformedArray = resultArray.map((dept) => {
       const resultDept = [
           { id: dept._id, dept_name: dept.dept_name },
           ...dept.issues.map((issue) => ({
               value: issue.value,
               name: issue.issue_short,
               averageTimeDifferenceHours: issue.averageTimeDifferenceFormatted,
               long_issue: issue.issue_long.map((long) => ({
                   name: long.name,
                   count: long.count,
                   ticket_number_details: long.ticket_number_details.map(ticket => ({
                       ticket_number: ticket.ticket_number,
                       timeDifferenceHours: ticket.timeDifferenceHours,
                   })),
               })),
           })),
       ];

       return resultDept;
   });


        res.send(transformedArray);


    
       
     
 });

router.post("/getTicketDeptAdminIssues", auth, async (req, res) => {

    let start_date = req.body.start_date;
    let end_date = req.body.end_date;
    let admin_id = req.body.admin_id;
    let company_id = req.body.company_id;

   const DeptData = await Dept.find({company_id:company_id}).select('dept_name').sort({ dept_name: 1 });
   let ReportArray = [];

   for (let i = 0; i < parseInt(DeptData.length); i++) {
       ReportArray.push({
           _id: DeptData[i]._id,
           dept_name: DeptData[i].dept_name,
           issues: [] // Initialize an empty array for messages
       });
   }  

   const startDate = new Date(start_date);
   const endDate = new Date(end_date);

   let chatDetails = await ChatDetails.find({
       first_msgs_time: {
           $gte: startDate,
           $lte: endDate,
       },
       admin_id: admin_id
   }).select('issue_long issue_short dept_id admin_id ticket_number').sort('-dept_id');

   let length = parseInt(chatDetails.length);

   if (length > 0) {
       for (let i = 0; i < length; i++) {
           for (let j = 0; j < parseInt(ReportArray.length); j++) {
               if (ReportArray[j]._id.toString() === chatDetails[i].dept_id) {
                   try {
                       if(chatDetails[i].issue_short){ 
                           let issue_long = chatDetails[i].issue_long;
                           let issue_short = chatDetails[i].issue_short;
                           let admin_id = chatDetails[i].admin_id;
                           let ticket_number = chatDetails[i].ticket_number;
                           if(issue_short.length>0){
                               ReportArray[j].issues.push({issue_short: issue_short, issue_long: issue_long, admin_id: admin_id, ticket_number: ticket_number});
                           }
                       }                      
                                      
                   } catch (e) {
                       console.log(e);
                   }
               }
           }
       }
   }

   chatDetails = await ChatCloseDetails.find({
       first_msgs_time: {
           $gte: startDate,
           $lte: endDate,
       },
       admin_id: admin_id
   }).select('issue_long issue_short dept_id admin_id ticket_number').sort('-dept_id');

   length = parseInt(chatDetails.length);

   if (length > 0) {
       for (let i = 0; i < length; i++) {
           for (let j = 0; j < parseInt(ReportArray.length); j++) {
               if (ReportArray[j]._id.toString() === chatDetails[i].dept_id) {
                   try {
                       if(chatDetails[i].issue_short){
                           let issue_long = chatDetails[i].issue_long;
                           let issue_short = chatDetails[i].issue_short;
                           let admin_id = chatDetails[i].admin_id;
                           let ticket_number = chatDetails[i].ticket_number;
                           if(issue_short.length>0){
                               ReportArray[j].issues.push({issue_short: issue_short, issue_long: issue_long, admin_id:admin_id, ticket_number:ticket_number});
                           }
                       }
                      
                   } catch (e) {
                       console.log(e);
                   }
               }
           }
       }
   }


     // Create an object to store grouped issues
        const groupedIssues = {};

        // Iterate through departments
        ReportArray.forEach((department) => {
        const departmentId = department._id;
        const departmentName = department.dept_name;

        // Initialize the department entry in groupedIssues
        if (!groupedIssues[departmentId]) {
            groupedIssues[departmentId] = {
            _id: departmentId,
            dept_name: departmentName,
            issues: [],
            };
        }

        // Iterate through issues in each department
        department.issues.forEach((issue) => {
            const issueShort = issue.issue_short;

            // Check if the issue_short has been encountered before
            const existingIssue = groupedIssues[departmentId].issues.find((i) => i.issue_short === issueShort);

            if (existingIssue) {
            // Increment the count
            existingIssue.value += 1;
            // Add the long issue only if it's not already in the set
            const uniqueLongIssues = new Set(existingIssue.issue_long.map((item) => item.name));
            if (!uniqueLongIssues.has(issue.issue_long)) {
                existingIssue.issue_long.push({ name: issue.issue_long, count: 1, ticket_number: [issue.ticket_number] });
            } else {
                const existingLongIssue = existingIssue.issue_long.find((item) => item.name === issue.issue_long);
                existingLongIssue.count += 1;
                existingLongIssue.ticket_number.push(issue.ticket_number);
            }
            } else {
            // Initialize a new entry for the issue_short
            groupedIssues[departmentId].issues.push({
                issue_short: issueShort,
                value: 1,
                issue_long: [{ name: issue.issue_long, count: 1, ticket_number: [issue.ticket_number] }],
            });
            }
        });
        });

        // Transform the groupedIssues object into an array
        const resultArray = Object.values(groupedIssues);

        // Sort the issues array by the 'value' field in descending order
        resultArray.forEach((department) => {
        department.issues.sort((a, b) => b.value - a.value);
        });

        const transformedArray = resultArray.map((dept) => {
        const resultDept = [
            { id: dept._id, dept_name: dept.dept_name },
            ...dept.issues.map((issue) => ({
            value: issue.value,
            name: issue.issue_short,
            long_issue: issue.issue_long.map((long) => ({
                name: long.name,
                count: long.count,
                ticket_number: long.ticket_number,
            })),
            })),
        ];

        return resultDept;
        });
 
        res.send(transformedArray);
});

 

router.get("/getList2", auth, async (req, res) => {


    let chartDataArray = [
        [
          { dept_name: 'Billing' },
          { value: 65, name: "Google" },
          { value: 20, name: "Facebook" },
          { value: 5, name: "Snapchat" },
          { value: 5, name: "Instagram" },
          { value: 10, name: "Twitter" }
        ],
        [
          { dept_name: 'Returns' },
          { value: 5, name: "Google" },
          { value: 20, name: "Facebook" },
          { value: 65, name: "Snapchat" },
          { value: 5, name: "Instagram" },
          { value: 10, name: "Twitter" }
        ],
    ];

    chartDataArray = JSON.stringify(chartDataArray);

    const DeptData = await Dept.find().select('dept_name').sort({ dept_name: 1 });
    let ReportArray = [];

    for (let i = 0; i < parseInt(DeptData.length); i++) {
        ReportArray.push({
            issues: [] // Initialize an empty array for messages
        });
    }

    let start_date = "01.01.2023";
    let end_date = "12.31.2023";

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    let chatDetails = await ChatDetails.find({
        first_msgs_time: {
            $gte: startDate,
            $lte: endDate,
        },
    }).select('messages dept_id').sort('-dept_id');

    let length = parseInt(chatDetails.length);

    if (length > 0) {
        for (let i = 0; i < length; i++) {
            for (let j = 0; j < parseInt(ReportArray.length); j++) {
             
                    try {
                        let messages = chatDetails[i].messages[0].replace(/<[^>]*>/g, '');
                        // Remove HTML entities
                        messages = messages.replace(/&[^;]+;/g, '');

                        // Remove styles (e.g., "P {margin-top:0;margin-bottom:0;}")
                        messages = messages.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

                        // Push the message object into the messages array
                        ReportArray[j].issues.push({id: chatDetails[i]._id, messages: messages});
                 
                    } catch (e) {
                        console.log(e);
                    }
                
            }
        }
    }

    chatDetails = await ChatCloseDetails.find({
        first_msgs_time: {
            $gte: startDate,
            $lte: endDate,
        },
    }).select('messages dept_id').sort('-dept_id');

    length = parseInt(chatDetails.length);

    if (length > 0) {
        for (let i = 0; i < length; i++) {
            for (let j = 0; j < parseInt(ReportArray.length); j++) {
                
                    try {
                        let messages = chatDetails[i].messages[0].replace(/<[^>]*>/g, '');

                        // Remove HTML entities
                        messages = messages.replace(/&[^;]+;/g, '');

                        // Remove styles (e.g., "P {margin-top:0;margin-bottom:0;}")
                        messages = messages.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');    

                        // Push the message object into the messages array
                        ReportArray[j].issues.push({id: chatDetails[i]._id, messages: messages});
                 
                    } catch (e) {
                        console.log(e);
                    }
                }
        }
    }
 
    let uniqueMap = new Map();
    ReportArray.forEach(obj => {
      // Using JSON.stringify to create a unique string representation of the object
      const objString = JSON.stringify(obj);
      
      if (!uniqueMap.has(objString)) {
        uniqueMap.set(objString, obj);
      }
    });
    
    let uniqueDataArray = Array.from(uniqueMap.values());
    
    res.send(uniqueDataArray);
});


router.get("/getListDone", auth, async (req, res) => {


    let chartDataArray = [
        {
          "id": "64ad377bf52676df3ceebe93",
          "issue_short": "Billing",
          "issue_long": "Billing error or overcharge"
        },
        {
          "id": "64a3d2c89d3f823c53416b0c",
          "issue_short": "Review",
          "issue_long": "Review request for purchased products"
        },
        {
          "id": "64c2e55fc05e700e6d889da8",
          "issue_short": "Refund",
          "issue_long": "Request for refund"
        },
        {
          "id": "6549f0d58aac9afb73ff8148",
          "issue_short": "Attachment",
          "issue_long": "Issues with file attachments"
        },
        {
          "id": "6566090c8da921c1344699ae",
          "issue_short": "Update",
          "issue_long": "Request for update on previous issue"
        },
        {
          "id": "655dbc9c4285c8de4fb3cdaf",
          "issue_short": "Billing",
          "issue_long": "Testing for billing"
        },
        {
          "id": "655dbc9c4285c8de4fb3cdb3",
          "issue_short": "SMTP",
          "issue_long": "SMTP test"
        },
        {
          "id": "655dbc9c4285c8de4fb3cdb7",
          "issue_short": "Test",
          "issue_long": "Testing message"
        },
        {
          "id": "655dbc9c4285c8de4fb3cddb",
          "issue_short": "SMTP",
          "issue_long": "SMTP test"
        },
        {
          "id": "655dbc9c4285c8de4fb3cddf",
          "issue_short": "Test",
          "issue_long": "Testing message"
        },
        {
          "id": "655dbc9c4285c8de4fb3cde3",
          "issue_short": "Test",
          "issue_long": "Testing message"
        },
        {
          "id": "655dbc9c4285c8de4fb3cde7",
          "issue_short": "Test",
          "issue_long": "Testing message"
        },
        {
          "id": "655dbc9c4285c8de4fb3cdeb",
          "issue_short": "Test",
          "issue_long": "Testing message"
        },
        {
          "id": "655dbc9c4285c8de4fb3cdef",
          "issue_short": "Test",
          "issue_long": "Testing message"
        },
        {
          "id": "655dbc9c4285c8de4fb3cdf3",
          "issue_short": "Test",
          "issue_long": "Testing message"
        },
        {
          "id": "655dbc9c4285c8de4fb3cdf7",
          "issue_short": "Test",
          "issue_long": "Testing message"
        },
        {
          "id": "655dbc9c4285c8de4fb3cdfb",
          "issue_short": "Test",
          "issue_long": "Testing message"
        },
        {
          "id": "655dbc9c4285c8de4fb3cdff",
          "issue_short": "CRON",
          "issue_long": "CRON test"
        },
        {
          "id": "655dbc9c4285c8de4fb3ce03",
          "issue_short": "Unhappy",
          "issue_long": "Unhappiness expressed"
        },
        {
          "id": "655dbc9c4285c8de4fb3ce07",
          "issue_short": "SMTP",
          "issue_long": "SMTP HTML test"
        },
        {
          "id": "655dbc9c4285c8de4fb3ce0b",
          "issue_short": "SMTP",
          "issue_long": "SMTP HTML test"
        },
        {
          "id": "655dbc9c4285c8de4fb3ce0f",
          "issue_short": "Test",
          "issue_long": "Testing message"
        },
        {
          "id": "655dbc9c4285c8de4fb3ce13",
          "issue_short": "Test",
          "issue_long": "Testing message"
        },
        {
          "id": "655dbc9c4285c8de4fb3ce17",
          "issue_short": "Test",
          "issue_long": "Testing message"
        },
        {
          "id": "655dbc9c4285c8de4fb3ce1b",
          "issue_short": "Test",
          "issue_long": "Testing message"
        },
        {
          "id": "655dbc9c4285c8de4fb3ce1f",
          "issue_short": "Test",
          "issue_long": "Testing message"
        },
        {
          "id": "655dbc9c4285c8de4fb3ce23",
          "issue_short": "Test",
          "issue_long": "Testing message"
        },
        {
          "id": "655dbc9c4285c8de4fb3ce27",
          "issue_short": "Test",
          "issue_long": "Testing message"
        },
        {
          "id": "655dbc9c4285c8de4fb3ce2b",
          "issue_short": "Test",
          "issue_long": "Testing message"
        },
        {
          "id": "655dbc9c4285c8de4fb3ce2f",
          "issue_short": "Test",
          "issue_long": "Testing message"
        },
        {
          "id": "655dbc9c4285c8de4fb3ce33",
          "issue_short": "Attachment",
          "issue_long": "Issues with file attachments"
        },
        {
          "id": "655dbc9c4285c8de4fb3ce37",
          "issue_short": "Unhappy",
          "issue_long": "Unhappiness expressed"
        },
        {
          "id": "655dbc9c4285c8de4fb3ce3b",
          "issue_short": "Test",
          "issue_long": "Testing message"
        },
        {
          "id": "655dbc9c4285c8de4fb3ce3f",
          "issue_short": "Test",
          "issue_long": "Testing message"
        },
        {
          "id": "655dbc9c4285c8de4fb3ce43",
          "issue_short": "Test",
          "issue_long": "Testing message"
        },
        {
          "id": "654b51798aac9afb73ff84b6",
          "issue_short": "Attachment",
          "issue_long": "Issues with file attachments"
        },
        {
          "id": "654b51978aac9afb73ff84cd",
          "issue_short": "Attachment",
          "issue_long": "Issues with file attachments"
        },
        {
          "id": "6566090c8da921c1344699ae",
          "issue_short": "Update",
          "issue_long": "Request for update on previous issue"
        },
        {
          "id": "655dbc9c4285c8de4fb3cdbf",
          "issue_short": "Test",
          "issue_long": "Testing message"
        },
        {
          "id": "655dbc9c4285c8de4fb3cdc3",
          "issue_short": "SMTP",
          "issue_long": "SMTP test"
        },
        {
          "id": "655dbc9c4285c8de4fb3cdc7",
          "issue_short": "SMTP",
          "issue_long": "SMTP HTML test"
        },
        {
          "id": "655dbc9c4285c8de4fb3cdcb",
          "issue_short": "Attachment",
          "issue_long": "Issues with file attachments"
        },
        {
          "id": "655dbc9c4285c8de4fb3cdd3",
          "issue_short": "Attachment",
          "issue_long": "Issues with file attachments"
        },
        {
          "id": "655dbc9c4285c8de4fb3cdd7",
          "issue_short": "SMTP",
          "issue_long": "SMTP test"
        },
        {
          "id": "655dbc9c4285c8de4fb3cddb",
          "issue_short": "Test",
          "issue_long": "Testing message"
        }
      ];
      
   
     for(let i=0;i<parseInt(chartDataArray.length);i++){
        let id = ObjectId(chartDataArray[i].id);
        let issue_short = chartDataArray[i].issue_short;
        let issue_long = chartDataArray[i].issue_long;

        await ChatDetails.updateMany({ _id: id }, {
            $set: {
                'issue_short': issue_short,
                'issue_long': issue_long
            }
        });

        await ChatCloseDetails.updateMany({ _id: id }, {
            $set: {
                'issue_short': issue_short,
                'issue_long': issue_long
            }
        });
     }
    
    res.send(chartDataArray);
});
 
 

module.exports = router;
