const Joi = require('joi');
const mongoose = require('mongoose');


const Admin = mongoose.model('admin_db_news', new mongoose.Schema({
    display_name: {
        type: String,
        required: true
    },
    username: {
        type: String, 
        required: true
    },
    email: {
        type: String,
        unique: true
    },
    password: {
        type: String,
        required: true
    }, 
    isBlock: {
        type: Boolean,
        required: true,
        default: false
    },
    masterAdmin: {
        type: Boolean,
        default: false,
        index: true
    },
    unread_msgs: {
        type: Number,
        default: 0,
        min: 0
    },
    dept_access: {
        type: Boolean
    },
    user_access: {
        type: Boolean
    },
    admin_status: {
        type: Boolean,
        default: false,
        index: true
    },
    demo_mode: {
        type: Boolean,
        default: false
    },
    display_limit: {
        type: Number,
        default: 10
    },
    notification: {
        type: Boolean,
        default: true
    },
    admin_image: {
        type: String,
        default: ''
    },
    admin_ip: {
        type: String,
        default: 0
    },
    company_id: {
        type: String
    }
}));


// Admin.collection.dropIndex({ username: 1 }, (err, result) => {
//     if (err) {
//         console.error('Error dropping index:', err);
//     } else {
//         console.log('Index dropped successfully.');
//     }
// });

function validateAdmin(admin) {
    const schema = {
        username: Joi.string().min(5).max(50).required(),
        password: Joi.string().min(5).max(50).required()
    };

    return Joi.validate(admin, schema);
}

exports.Admin = Admin;
exports.validate = validateAdmin;