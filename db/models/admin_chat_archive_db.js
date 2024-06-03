const Joi = require('joi');
const mongoose = require('mongoose');


const AdminChatArchive = mongoose.model('admin_chat_archive_db_news', new mongoose.Schema({
    chat_id: { 
        type: String,
        required: true,
        index: true,
        unique: true
    },
    admin_one_id: {
        type: String
    },
    admin_two_id: {
        type: String
    },
    admin_one_username: {
        type: String
    },
    admin_two_username: {
        type: String
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
    company_id: {
        type: String
    }   
}));
 
exports.AdminChatArchive = AdminChatArchive;
 