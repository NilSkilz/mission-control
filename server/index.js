import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Import and register routes with error handling
async function setupRoutes() {
  try {
    const haModule = await import('./routes/homeAssistant.js');
    app.use('/api/ha', haModule.homeAssistantRoutes);
    console.log('✓ Home Assistant routes loaded');
  } catch (e) {
    console.error('✗ Failed to load homeAssistant routes:', e.message);
  }

  try {
    const calModule = await import('./routes/calendar.js');
    app.use('/api/calendar', calModule.default);
    console.log('✓ Calendar routes loaded');
  } catch (e) {
    console.error('✗ Failed to load calendar routes:', e.message);
  }

  try {
    const todoModule = await import('./routes/todo.js');
    app.use('/api/todo', todoModule.default);
    console.log('✓ Todo routes loaded');
  } catch (e) {
    console.error('✗ Failed to load todo routes:', e.message);
  }

  try {
    const docsModule = await import('./routes/documents.js');
    app.use('/api/documents', docsModule.default);
    console.log('✓ Documents routes loaded');
  } catch (e) {
    console.error('✗ Failed to load documents routes:', e.message);
  }

  try {
    const presenceModule = await import('./routes/presence.js');
    app.use('/api/presence', presenceModule.default);
    console.log('✓ Presence routes loaded');
  } catch (e) {
    console.error('✗ Failed to load presence routes:', e.message);
  }
}

// Start server
setupRoutes().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

export default app;
