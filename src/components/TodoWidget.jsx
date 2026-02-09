import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TodoWidget = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/todo/tasks');
        setTasks(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch todo tasks:', err);
        setError('Failed to load todo tasks');
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  if (loading) return <div>Loading tasks...</div>;
  if (error) return <div>{error}</div>;

  const getPriorityColor = (priority) => {
    const colorMap = {
      'High': 'text-red-600',
      'Medium': 'text-yellow-600',
      'Low': 'text-green-600',
      'Lowest': 'text-gray-500'
    };
    return colorMap[priority] || 'text-gray-500';
  };

  return (
    <div className="todo-widget">
      <h2>Today's Tasks</h2>
      {tasks.length === 0 ? (
        <p>No tasks for today</p>
      ) : (
        <ul>
          {tasks.map((task) => (
            <li 
              key={task.id} 
              className={`${getPriorityColor(task.priority)} mb-2`}
            >
              {task.title}
              <span className="text-xs ml-2">({task.priority} Priority)</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TodoWidget;