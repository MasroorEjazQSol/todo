const mongoose = require('mongoose');

const AppSettings = mongoose.model('app_settings_db_news', new mongoose.Schema({
    footer_text: {
        type: String
    }, 
    app_images: {
        type: String
    },  
    chat_limit: {
        type: String,
        default: 10
    },
    display_limit: {
        type: Number,
        default: 10
    }, 
    notification: {
        type: Boolean,
        default: true
    },
    privacy_policy: {
        type: String,
        default: ''
    },
    company_name: {
        type: String,
        default: 'Wasup'
    },
    email_smtp: {
        type: Boolean,
        default: false
    },
    email_smtp_secure: {
        type: Boolean,
        default: false
    },
    email_hostname: {
        type: String,
        default: ''
    },
    email_port: {
        type: String,
        default: ''
    },
    email_username: {
        type: String,
        default: ''
    },
    email_password: {
        type: String,
        default: ''
    },
    chatgpt_prompt: {
        type: String,
        default: ''
    },
    timezone: {
        type: String,
        default: 'America/Los_Angeles'
    },
    company_id: {
        type: String
    }
}));
 
exports.AppSettings = AppSettings;