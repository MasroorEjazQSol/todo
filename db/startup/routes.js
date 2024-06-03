const express = require('express');
const admin = require('../routes/admin_routes');
const dept = require('../routes/dept_routes');
const login = require('../routes/login_routes');
const block = require('../routes/block_routes');
const chat = require('../routes/chat_routes');
const app_settings = require('../routes/app_settings_routes');
const image_upload = require('../routes/image_upload_routes');
const todo_list = require('../routes/todo_routes'); 
const user = require('../routes/user_routes');
const common = require('../routes/common');
const admin_chat_archive = require('../routes/admin_chat_archive_routes');
const admin_to_admin_chat = require('../routes/admin_to_admin_chat_routes');   
const email_to_ticket_routes = require('../routes/email_to_ticket_routes');   
const report_routes = require('../routes/report_routes');  
const error = require('../middleware/error');

module.exports = function (app) {
    app.use(express.json());
    app.use('/api/admin', admin);
    app.use('/api/dept', dept);
    app.use('/api/login', login);
    app.use('/api/block', block);
    app.use('/api/chat', chat);
    app.use('/api/app_settings', app_settings);
    app.use('/api/image_upload', image_upload); 
    app.use('/api/admin_chat_archive', admin_chat_archive);
    app.use('/api/common', common);
    app.use('/api/user', user);
    app.use('/api/admin_to_admin_chat', admin_to_admin_chat); 
    app.use('/api/email_to_ticket_routes', email_to_ticket_routes); 
    app.use('/api/report', report_routes); 
    app.use('/api/todo', todo_list); 
    app.use(error);
}
