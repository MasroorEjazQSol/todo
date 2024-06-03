const mongoose = require('mongoose');


const ChatDetails = mongoose.model('chat_details_db_news', new mongoose.Schema({
    chat_id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    dept_id: {
        type: String,
        required: true,
        index: true        
    },
    username: {
        type: Array
    },
    messages: {
        type: Array
    },
    date: {
        type: Array
    },
    usertype: {
        type: Array
    },    
    emoji: {
        type: Array
    },
    last_msgs_time: {
        type: Date,
        default: Date.now
    },
    user_name: {
        type: String,
        required: true,
        index: true    
    },
    user_email: {
        type: String,
        required: true,
        index: true    
    },
    isActive: {
        type: Boolean,
        default: true
    },
    subject: {
        type: String,
        index: true    
    },
    ticket_number: {
        type: String,
        index: true    
    },
    last_msgs_user: {
        type: String
    },
    last_msgs_msg: {
        type: String
    },
    last_msgs_date: {
        type: String
    },
    local_filename: {
        type: Array
    },
    aws_filename: {
        type: Array
    },
    last_emoji: {
        type: String
    },
    first_msgs_time: {
        type: Date,
        default: Date.now
    },
    issue_short: {
        type: String
    },
    issue_long: {
        type: String
    },
    admin_id: {
        type: String
    },
    company_id: {
        type: String
    }
}));



exports.ChatDetails = ChatDetails;
