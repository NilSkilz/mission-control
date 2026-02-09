import express from 'express';
import { exec } from 'child_process';
import NodeCache from 'node-cache';

const router = express.Router();
const todoCache = new NodeCache({ stdTTL: 900 }); // 15 minutes cache

router.get('/tasks', (req, res) => {
  try {
    // Check cache first
    const cachedTasks = todoCache.get('todo_tasks');
    if (cachedTasks) {
      return res.json(cachedTasks);
    }

    // Use Todoist CLI to fetch tasks from shared project
    exec(`todoist list --project 6fMX36Pcm333F4qh --filter "today | overdue"`, 
      (error, stdout, stderr) => {
        if (error) {
          console.error('Todoist fetch error:', error);
          return res.status(500).json({ error: 'Failed to fetch tasks' });
        }

        // Parse tasks from CLI output
        const tasks = stdout.trim().split('\n').map(taskLine => {
          const match = taskLine.match(/\[(\w+)\]\s+(.+)/);
          if (match) {
            return {
              id: match[1],
              title: match[2],
              priority: getPriority(match[1])
            };
          }
          return null;
        }).filter(task => task !== null);

        // Cache tasks
        todoCache.set('todo_tasks', tasks);

        res.json(tasks);
      }
    );
  } catch (error) {
    console.error('Tasks fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Helper function to map Todoist task IDs to priority levels
function getPriority(taskId) {
  // This is a mock implementation. Adjust based on actual Todoist CLI behavior
  const priorityMap = {
    '1': 'High',
    '2': 'Medium',
    '3': 'Low',
    '4': 'Lowest'
  };
  return priorityMap[taskId] || 'Medium';
}

export default router;