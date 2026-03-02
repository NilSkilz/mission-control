import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3003;
const DOCS_DIR = path.join(__dirname, '../documents');

// Override the /api/documents/raw/ endpoint to serve HTML directly
app.get('/api/documents/raw/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Security: only allow .html files, no path traversal
    if (!filename.endsWith('.html') || filename.includes('/') || filename.includes('..')) {
      return res.status(403).send('Access denied');
    }

    const fullPath = path.join(DOCS_DIR, filename);
    const content = await fs.readFile(fullPath, 'utf-8');
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.send(content);
  } catch (error) {
    console.error('Document raw serve error:', error);
    res.status(error.code === 'ENOENT' ? 404 : 500).send('Error loading document');
  }
});

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
