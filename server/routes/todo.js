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
      console.log('Returning cached todo tasks');
      return res.json(cachedTasks);
    }

    console.log('Fetching fresh tasks from Todoist...');

    // Use Todoist CLI to fetch tasks from shared project in JSON format
    exec(`todoist tasks --project "Shared Todo" --json`, 
      (error, stdout, stderr) => {
        if (error) {
          console.error('Todoist fetch error:', error);
          return res.status(500).json({ error: 'Failed to fetch tasks' });
        }

        try {
          const rawTasks = JSON.parse(stdout);
          console.log(`Raw tasks fetched: ${rawTasks.length}`);

          // Transform and filter tasks
          const now = new Date();
          const today = new Date();
          today.setHours(23, 59, 59, 999); // End of today

          const tasks = rawTasks
            .filter(task => !task.checked) // Only incomplete tasks
            .map(task => {
              const dueDate = task.due ? new Date(task.due.datetime || task.due.date) : null;
              const isToday = dueDate && dueDate <= today;
              const isOverdue = dueDate && dueDate < now;
              
              return {
                id: task.id,
                title: task.content,
                priority: getPriorityLabel(task.priority),
                due: dueDate,
                isOverdue: isOverdue,
                isToday: isToday,
                url: task.url
              };
            })
            // Show urgent tasks first (overdue, then today, then high priority)
            .sort((a, b) => {
              if (a.isOverdue !== b.isOverdue) return b.isOverdue ? 1 : -1;
              if (a.isToday !== b.isToday) return b.isToday ? 1 : -1;
              return b.priority === 'High' ? 1 : -1;
            })
            // Limit to top 10 for dashboard
            .slice(0, 10);

          console.log(`Processed ${tasks.length} tasks for dashboard`);

          // Cache tasks
          todoCache.set('todo_tasks', tasks);

          res.json(tasks);
        } catch (parseError) {
          console.error('Failed to parse Todoist JSON:', parseError);
          res.status(500).json({ error: 'Failed to parse tasks data' });
        }
      }
    );
  } catch (error) {
    console.error('Tasks fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Helper function to map Todoist priority to human-readable labels
function getPriorityLabel(priority) {
  // Todoist priorities: 4 = urgent, 3 = high, 2 = medium, 1 = low
  const priorityMap = {
    4: 'Urgent',
    3: 'High', 
    2: 'Medium',
    1: 'Low'
  };
  return priorityMap[priority] || 'Low';
}

export default router;