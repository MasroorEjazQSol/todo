const Joi = require('joi');
const mongoose = require('mongoose');


const Dept = mongoose.model('dept_db_news', new mongoose.Schema({
    dept_name: {
        type: String
    },
    dept_desc: {
        type: String
    },
    dept_admin: {
        type: Array,
        required: true
    }, 
    unread_msgs: {
        type: Number,
        default: 0,
        min: 0
    },
    smart_questions: {
        type: Array,
        default: ['General Reply']
    },
    preset_questions: {
        type: Array,
        default: []
    },
    preset_answers: {
        type: Array,
        default: []
    },
    tickets_dept_guide: {
        type: Array,
        default: []
    },
    company_id: {
        type: String
    } 
}));


function validateDept(dept) {
    const schema = {
        dept_name: Joi.string().min(5).max(50).required(),
        dept_admin: Joi.array().required()
    };

    return Joi.validate(dept, schema);
}

exports.Dept = Dept;
exports.validate = validateDept;