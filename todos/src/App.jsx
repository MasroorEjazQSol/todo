import React, { Component } from 'react';
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  IconButton
} from '@material-ui/core';
import axios from 'axios';
 
import './style.css';

const getAllTodo = "https://localhost:3900/api/todo/allTodo";
const saveTodo = "https://localhost:3900/api/todo/saveTodo/";
const removeTodo = "https://localhost:3900/api/todo/removeTodo";

class App extends Component {

  

  state = {
    tasks: [],
    newTask: '',
    taskList: []
  };

  displayData = async() => {
    const tasksLists = await axios.get(getAllTodo);
    await this.setState({ taskList: tasksLists.data });
    
    console.log(this.state.taskList);
  };

  componentDidMount = async() => {
    await this.displayData();
  };

  handleInputChange = (e) => {
    this.setState({ newTask: e.target.value });
  };

  handleAddTask = async() => {
    if (this.state.newTask.trim() !== '') {
      let newTasks=this.state.newTask.trim();

      if (this.state.newTask.trim()=== "") {
        // String is not empty
        return;
      } 

        const NewTaskAdd =
        {
            "task_name": newTasks
        };

        await axios.post(saveTodo, NewTaskAdd);

        await this.displayData();

      this.setState((prevState) => ({
        tasks: [...prevState.tasks, { id: Date.now(), text: prevState.newTask }],
        newTask: ''
      }));
    }
  };

  handleDeleteTask = async(id) => {
    const confirmed = window.confirm("Delete?");
    if (confirmed) {
      this.setState((prevState) => ({
        tasks: prevState.tasks.filter((task) => task.id !== id)
      }));
      const NewTaskAdd =
        {
            "todo_id": id
        }; 

        await axios.post(removeTodo, NewTaskAdd);

        await this.displayData();
    }
  };

  render() {
 

    return (
      <Container>
        <AppBar position="static" id="header">
          <Toolbar>
            <Typography variant="h6">
              To-Do List
            </Typography>
          </Toolbar>
        </AppBar>

        <Paper id="main" elevation={3} style={{ padding: '20px', marginTop: '20px' }}>
          <TextField
            id="new-task"
            label="New Task"
            variant="outlined"
            fullWidth
            value={this.state.newTask}
            onChange={this.handleInputChange}
            style={{ marginBottom: '20px' }}
          />
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={this.handleAddTask}
          >
            Add Task
          </Button>

          <TableContainer component={Paper} style={{ marginTop: '20px' }}>
            <Table>
              
            <TableHead>
  <TableRow>
    <TableCell><h3>Tasks</h3></TableCell>
    <TableCell align="right"><h3>Actions</h3></TableCell>
  </TableRow>
  {this.state.taskList.map((task) => (
    <TableRow key={task._id}>
      <TableCell>{task.task_name}</TableCell>
      <TableCell align="right">
        <button
          style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}
          onClick={() => this.handleDeleteTask(task._id)}
        >
          Delete
        </button>
      </TableCell>
    </TableRow>
  ))}
</TableHead>

              <TableBody>
                 
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Container>
    );
  }
}

export default App;
