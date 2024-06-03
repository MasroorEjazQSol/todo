const mongoose = require('mongoose');


const BlockDB = mongoose.model('block_db_news', new mongoose.Schema({
    admin_access: {
        type: Array
    },
    ip_addresses: {
        type: Array
    },
    email_addresses: {
        type: Array
    },
    block_keywords: {
        type: Array
    },
    company_id: {
        type: String
    }
}));

exports.BlockDB = BlockDB;