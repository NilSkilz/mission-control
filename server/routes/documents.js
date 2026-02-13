import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const DOCS_DIR = path.join(__dirname, '../../documents');

// GET /api/documents - List all documents
router.get('/', async (req, res) => {
  try {
    const files = await getFilesRecursive(DOCS_DIR);
    res.json({
      success: true,
      data: files,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Documents list error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/documents/content?path=... - Get document content
router.get('/content', async (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) {
      return res.status(400).json({ success: false, error: 'Path required' });
    }

    // Security: prevent directory traversal
    const fullPath = path.join(DOCS_DIR, filePath);
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(DOCS_DIR)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const content = await fs.readFile(normalizedPath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    
    res.json({
      success: true,
      data: {
        path: filePath,
        name: path.basename(filePath),
        type: ext === '.html' ? 'html' : ext === '.md' ? 'markdown' : 'text',
        content: content
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Document content error:', error);
    res.status(error.code === 'ENOENT' ? 404 : 500).json({
      success: false,
      error: error.code === 'ENOENT' ? 'File not found' : error.message
    });
  }
});

// Helper: recursively get all files
async function getFilesRecursive(dir, basePath = '') {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(basePath, entry.name);
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const children = await getFilesRecursive(fullPath, relativePath);
      files.push({
        name: entry.name,
        path: relativePath,
        type: 'directory',
        children: children
      });
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      const stats = await fs.stat(fullPath);
      files.push({
        name: entry.name,
        path: relativePath,
        type: ext === '.html' ? 'html' : ext === '.md' ? 'markdown' : 'text',
        size: stats.size,
        modified: stats.mtime
      });
    }
  }

  return files.sort((a, b) => {
    // Directories first, then alphabetically
    if (a.type === 'directory' && b.type !== 'directory') return -1;
    if (a.type !== 'directory' && b.type === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });
}

export default router;
