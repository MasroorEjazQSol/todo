const Joi = require('joi');
const mongoose = require('mongoose');

const User = mongoose.model('user_db_news', new mongoose.Schema({
    firstname: {
        type: String,
        required: true
    },
    lastname: {
        type: String
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    block: {
        type: Boolean,
        default: false
    },
    third_party_login: {
        type: Boolean,
        default: false,
        index: true
    },
    account_confirm: {
        type: Boolean,
        default: true
    },
    confirmation_code: {
        type: String
    },
    resend_confirmation_code: {
        type: Boolean,
        default: true
    },
    user_status: {
        type: Boolean,
        default: false,
        index: true
    },
    total_no_of_tickets: {
        type: Number,
        default: 0
    }, 
    last_login: {
        type: String,
        default: 'N/A'
    },
    company_id: {
        type: String
    }
}));



function validateUser(user) {
    const schema = {
        firstname: Joi.string().min(5).max(50).required(),
        lastname: Joi.string().min(5).max(50).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(5).max(50).required()
    };

    return Joi.validate(user, schema);
}

exports.User = User;
exports.validate = validateUser;