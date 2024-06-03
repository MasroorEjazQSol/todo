const mongoose = require('mongoose');


const TodoList = mongoose.model('todo_db_news', new mongoose.Schema({
    task_name: {
        type: String
    }
}));

exports.TodoList = TodoList;