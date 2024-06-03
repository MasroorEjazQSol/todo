const mongoose = require('mongoose');


const AdminChatDetails = mongoose.model('admin_chat_details_db_news', new mongoose.Schema({
    chat_id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    admin_one_id: {
        type: String,
        required: true,
        index: true
    },
    admin_two_id: {
        type: String,
        required: true,
        index: true
    }, 
    admin_one_username: {
        type: String,
        required: true
    },
    admin_two_username: {
        type: String,
        required: true
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
    last_msgs_time: {
        type: Date,
        default: Date.now
    },
    local_filename: {
        type: Array
    },
    aws_filename: {
        type: Array
    },
    company_id: {
        type: String
    }
}));



exports.AdminChatDetails = AdminChatDetails;
