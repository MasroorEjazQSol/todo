const { TodoList } = require("../models/todo_db");
const auth_socket = require("../middleware/auth_socket");
const auth_user = require("../middleware/auth_user");
const auth_non_secure = require("../middleware/auth_non_secure");
const path = require('path');
const express = require("express");
const router = express.Router();  
var ObjectId = require('mongodb').ObjectID;
const staticPath = path.join(__dirname, '../uploads');


process.on('unhandledRejection', (reason, promise) => {
    //console.log("Reason: ", reason, "promise: ", promise);
});

process.on('warning', e => console.warn(e.stack));
 

router.get("/getCurrentRoute", auth_non_secure, async (req, res) => {
    res.send('First Route');

}); 

router.post("/saveTodo", auth_non_secure, async (req, res) => {
    const task_name = req.body.task_name;

    const task = new TodoList({
        task_name: task_name
    });

    try {
        await task.save();
        res.send(true);
    }
    catch (e) {
        console.log(e);
        res.send(false);
    }

}); 

router.post("/removeTodo", auth_non_secure, async (req, res) => {
    todo_id= req.body.todo_id;
    const id = ObjectId(todo_id); 
    await TodoList.findOneAndDelete({ _id: id });
    res.send(true)

}); 

router.get("/allTodo", auth_non_secure, async (req, res) => {
 
    
    const Todo = await TodoList.find();
    res.send(Todo)

}); 


module.exports = router;