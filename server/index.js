import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import calendarRoutes from './routes/calendar.js';
import todoRoutes from './routes/todo.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/calendar', calendarRoutes);
app.use('/api/todo', todoRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;