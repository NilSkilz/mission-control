import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = express.Router();
const execAsync = promisify(exec);

// OpenClaw bridge URL (runs on host, accessible from Docker)
const OPENCLAW_BRIDGE_URL = process.env.OPENCLAW_BRIDGE_URL || 'http://host.docker.internal:3099';

// Helper to fetch from OpenClaw bridge
const fetchFromBridge = async (endpoint) => {
  try {
    const response = await fetch(`${OPENCLAW_BRIDGE_URL}${endpoint}`, { timeout: 5000 });
    if (!response.ok) throw new Error(`Bridge returned ${response.status}`);
    return await response.json();
  } catch (error) {
    console.log(`OpenClaw bridge not available: ${error.message}`);
    return null;
  }
};

// Get all sessions from OpenClaw
router.get('/sessions', async (req, res) => {
  try {
    const data = await fetchFromBridge('/sessions');
    if (data) {
      return res.json(data);
    }
    // Fallback: empty data
    res.json({ sessions: [], message: 'OpenClaw bridge not available' });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.json({ sessions: [], error: 'Failed to fetch sessions' });
  }
});

// Get session history for a specific session key
router.get('/sessions/:sessionKey', async (req, res) => {
  try {
    const { sessionKey } = req.params;
    const data = await fetchFromBridge('/sessions');
    
    if (data?.sessions) {
      const session = data.sessions.find(s => s.key === sessionKey);
      if (session) {
        return res.json(session);
      }
    }
    
    res.status(404).json({ error: 'Session not found' });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(404).json({ error: 'Session not found' });
  }
});

// Get agent registry information
router.get('/registry', async (req, res) => {
  try {
    const agentsData = [
      {
        id: 'dev',
        name: 'Dev',
        category: 'BUILDER',
        role: 'Senior TypeScript developer working on the Tethered SaaS codebase',
        capabilities: ['exec', 'read', 'write', 'edit', 'apply_patch', 'process', 'browser'],
        model: 'Sonnet',
        sandbox: 'Docker',
        status: 'idle'
      },
      {
        id: 'scout', 
        name: 'Scout',
        category: 'RESEARCH',
        role: 'Lead researcher. Thorough, analytical, writes structured findings',
        capabilities: ['read', 'write', 'web_search', 'web_fetch'],
        model: 'Sonnet',
        sandbox: 'Docker',
        status: 'idle'
      },
      {
        id: 'scribe',
        name: 'Scribe', 
        category: 'RESEARCH',
        role: 'Content writer and strategist. Writes in the user\'s voice, SEO-aware',
        capabilities: ['read', 'write', 'web_search', 'web_fetch'],
        model: 'Sonnet',
        sandbox: 'Docker',
        status: 'idle'
      },
      {
        id: 'house',
        name: 'House',
        category: 'PROJECT MANAGERS',
        role: 'Home automation engineer. Manages Home Assistant integrations and household tools',
        capabilities: ['exec', 'read', 'write', 'web_fetch', 'cron'],
        model: 'Sonnet',
        sandbox: 'Docker',
        status: 'idle'
      }
    ];
    
    res.json(agentsData);
  } catch (error) {
    console.error('Error fetching agent registry:', error);
    res.json([]);
  }
});

// Get blackboard files status
router.get('/blackboard', async (req, res) => {
  try {
    const { stdout } = await execAsync('find ~/.openclaw/workspace/shared/blackboard -type f 2>/dev/null || echo ""');
    const files = stdout.trim().split('\n').filter(f => f && f !== '');
    
    res.json({
      files: files.map(filePath => ({
        name: filePath.split('/').pop(),
        path: filePath,
        lastModified: Date.now()
      })),
      totalFiles: files.length
    });
  } catch (error) {
    console.error('Error fetching blackboard:', error);
    res.json({ files: [], totalFiles: 0 });
  }
});

export default router;
