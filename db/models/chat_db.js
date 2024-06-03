const Joi = require('joi');
const mongoose = require('mongoose');


const Chat = mongoose.model('chat_db_news', new mongoose.Schema({
    dept_id: {
        type: String,
        required: true,
        index: true
    },
    dept_name: {
        type: String,
        required: true
    },
    admin_id: {
        type: String,
        required: true
    }, 
    user_name: {
        type: String,
        required: true
    },
    user_email: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isBlock: {
        type: Boolean,
        default: false
    },
    unread_msgs: {
        type: Number,
        default: 0,
        min: 0
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
    last_msgs_time: {
        type: Date,
        default: Date.now
    },
    user_ip_address: {
        type: String
    },
    chat_ratings: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },   
    subject: {
        type: String
    },
    priority: {
        type: String
    },
    user_id: {
        type: String
    },
    user_unread_msgs: {
        type: Number,
        default: 0,
        min: 0
    },
    ticket_number: {
        type: String
    },
    last_emoji: {
        type: String
    },
    email_service: {
        type: String,
        default: 'gmail'
    },
    draft:  {
        type: String,
        default: ''
    },
    company_id: {
        type: String
    }
}));


function validateChat(chat) {
    const schema = {
        dept_id: Joi.string().required(),
        user_name: Joi.string().required(),
        user_email: Joi.string().email().required()
    };

    return Joi.validate(chat, schema);
}

exports.Chat = Chat;
exports.validate = validateChat;