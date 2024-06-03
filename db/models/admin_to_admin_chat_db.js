const mongoose = require('mongoose');


const AdminToAdminChat = mongoose.model('admin_to_admin_chat_db_news', new mongoose.Schema({
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
    admin_one_unread: {
        type: Number,
        default: 0,
        min: 0
    },
    admin_two_unread: {
        type: Number,
        default: 0,
        min: 0
    },   
    isActive: {
        type: Boolean,
        default: true
    },
    isBlock: {
        type: Boolean,
        default: false
    },
    last_msgs_user: {
        type: String,
        default: ''
    },
    last_msgs_msg: {
        type: String,
        default: ''
    },
    last_msgs_date: {
        type: String,
        default: ''
    },
    last_msgs_time: {
        type: Date,
        default: Date.now
    },
    close_admin_id: {
        type: String
    },
    company_id: {
        type: String
    } 
}));

 
exports.AdminToAdminChat = AdminToAdminChat;
 