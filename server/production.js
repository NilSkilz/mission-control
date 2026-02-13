import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3003;

// Proxy API requests to the API server (keep /api prefix)
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3001/api',
  changeOrigin: true
}));

// Serve static files from dist
app.use(express.static(path.join(__dirname, '../dist')));

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mission Control production server running on http://0.0.0.0:${PORT}`);
});
