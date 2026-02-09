import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ListBulletIcon, ExclamationTriangleIcon, ClockIcon } from '@radix-ui/react-icons';
import { Card, Button } from '../components/ui';

const TodoWidget = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/todo/tasks`);
        setTasks(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch todo tasks:', err);
        setError('Failed to load todo tasks');
        setLoading(false);
      }
    };

    fetchTasks();
    
    // Refresh every 15 minutes
    const interval = setInterval(fetchTasks, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getPriorityColor = (priority, isOverdue, isToday) => {
    if (isOverdue) return 'bg-red-500';
    if (isToday) return 'bg-orange-500';
    
    const colorMap = {
      'Urgent': 'bg-red-500',
      'High': 'bg-red-500',
      'Medium': 'bg-yellow-500',
      'Low': 'bg-slate-500'
    };
    return colorMap[priority] || 'bg-slate-500';
  };

  const formatDueDate = (due) => {
    if (!due) return null;
    
    const dueDate = new Date(due);
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (dueDate < now) return 'Overdue';
    if (dueDate < tomorrow) return 'Today';
    if (dueDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)) return 'Tomorrow';
    
    return dueDate.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <ListBulletIcon className="w-5 h-5" />
          Quick Tasks
        </h2>
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="bg-slate-800/50">
              <div className="animate-pulse flex items-center gap-3">
                <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="w-32 h-4 bg-slate-600 rounded"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <ListBulletIcon className="w-5 h-5" />
          Quick Tasks
        </h2>
        <Card className="bg-slate-800/50">
          <div className="text-slate-400 text-center text-sm">
            {error}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
        <ListBulletIcon className="w-5 h-5" />
        Quick Tasks
      </h2>
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <Card className="bg-slate-800/50">
            <div className="text-slate-400 text-center text-sm">
              No urgent tasks! 🎉
            </div>
          </Card>
        ) : (
          tasks.slice(0, 5).map((task) => (
            <Card key={task.id} className="bg-slate-800/50 hover:bg-slate-800/70 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getPriorityColor(task.priority, task.isOverdue, task.isToday)}`}></div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-slate-300 block truncate">
                    {task.title}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    {task.isOverdue && (
                      <span className="flex items-center gap-1 text-xs text-red-400">
                        <ExclamationTriangleIcon className="w-3 h-3" />
                        Overdue
                      </span>
                    )}
                    {task.isToday && !task.isOverdue && (
                      <span className="flex items-center gap-1 text-xs text-orange-400">
                        <ClockIcon className="w-3 h-3" />
                        Today
                      </span>
                    )}
                    {task.due && (
                      <span className="text-xs text-slate-500">
                        {formatDueDate(task.due)}
                      </span>
                    )}
                    <span className="text-xs text-slate-500 capitalize">
                      {task.priority.toLowerCase()}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
        <Button variant="ghost" size="sm" className="w-full mt-3 text-slate-400 hover:text-white">
          View All Tasks →
        </Button>
      </div>
    </div>
  );
};

export default TodoWidget;