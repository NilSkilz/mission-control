import express from 'express';
import fs from 'fs/promises';
import { createReadStream, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { get } from '../lib/familyDb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Parents only. The client hides the page from kids, but the API must too.
router.use((req, res, next) => {
  if (req.isJarvis) return next();
  const me = req.userId ? get('users', req.userId) : null;
  if (!me || me.role !== 'parent') return res.status(403).json({ success: false, error: 'parents only' });
  next();
});

const VIDEOS_DIR = '/media/TheDuchy';
const VIDEOS_JSON = path.join(__dirname, '../../db/theduchy-videos.json');

// GET /api/videos - List all videos
router.get('/', async (req, res) => {
  try {
    const data = await fs.readFile(VIDEOS_JSON, 'utf-8');
    const library = JSON.parse(data);
    res.json({
      success: true,
      ...library,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Videos list error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/videos/stream/:category/:filename - Stream a video file
router.get('/stream/:category/:filename', async (req, res) => {
  try {
    const { category, filename } = req.params;
    
    // Security: only allow specific categories
    const allowedCategories = ['bondage-tutorials', 'flogger-forge-tutorials', 'bamboo-bondage'];
    if (!allowedCategories.includes(category)) {
      return res.status(403).json({ success: false, error: 'Invalid category' });
    }
    
    // Security: prevent directory traversal
    const safeName = path.basename(filename);
    const filePath = path.join(VIDEOS_DIR, category, safeName);
    
    // Check file exists
    try {
      const stat = statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;
      
      if (range) {
        // Handle range requests for video seeking
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = (end - start) + 1;
        
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': 'video/mp4',
        });
        
        createReadStream(filePath, { start, end }).pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        });
        createReadStream(filePath).pipe(res);
      }
    } catch (e) {
      res.status(404).json({ success: false, error: 'Video not found' });
    }
  } catch (error) {
    console.error('Video stream error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/videos/thumb/:name - Serve a local thumbnail (jpgs on the media disk,
// named <index>.jpg, generated from theduchy.com art + extracted video frames)
router.get('/thumb/:name', (req, res) => {
  const safeName = path.basename(req.params.name)
  if (!/^[\w-]+\.jpg$/.test(safeName)) {
    return res.status(400).json({ success: false, error: 'Invalid name' })
  }
  const filePath = path.join(VIDEOS_DIR, 'thumbnails', safeName)
  // private: browser may cache, but shared caches (Cloudflare) must not — a
  // public-cached thumb would be served without auth to anyone with the URL
  res.sendFile(filePath, { cacheControl: false, headers: { 'Cache-Control': 'private, max-age=604800' } }, (err) => {
    if (err && !res.headersSent) res.status(404).json({ success: false, error: 'Thumbnail not found' })
  })
})

// GET /api/videos/categories - List available categories
router.get('/categories', async (req, res) => {
  try {
    const dirs = await fs.readdir(VIDEOS_DIR, { withFileTypes: true });
    const categories = dirs
      .filter(d => d.isDirectory())
      .map(d => d.name);
    
    res.json({
      success: true,
      categories,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
