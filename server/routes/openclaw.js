import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = express.Router();
const execAsync = promisify(exec);

// Get OpenClaw status
// Note: Container can't see host processes, so we assume running if this API works
// The status will be "running" - actual activity is tracked via sessions
router.get('/status', async (req, res) => {
  try {
    // OpenClaw is running if we're getting API requests 
    // (the gateway routes through this server)
    res.json({
      status: 'running',
      model: 'claude-opus-4-5', // Default model
      session: 'main',
      // Uptime calculated from container start
      uptime: process.uptime(),
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Error checking OpenClaw status:', error);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Get active sessions
router.get('/sessions', async (req, res) => {
  try {
    // Try to get sessions list from OpenClaw
    const { stdout } = await execAsync('openclaw sessions list --json 2>/dev/null || echo "[]"');
    
    let sessions = [];
    try {
      sessions = JSON.parse(stdout) || [];
    } catch {
      sessions = [];
    }

    // Format sessions data
    const formattedSessions = sessions.map(session => ({
      sessionKey: session.sessionKey || session.id,
      label: session.label || session.name,
      agentId: session.agentId || session.agent,
      kind: session.kind || 'main',
      model: session.model,
      activeMinutes: session.activeMinutes || session.lastActive,
      status: session.status || 'active'
    }));

    res.json({
      sessions: formattedSessions,
      count: formattedSessions.length
    });
  } catch (error) {
    console.error('Error fetching OpenClaw sessions:', error);
    res.json({
      sessions: [],
      count: 0,
      error: error.message
    });
  }
});

// System health endpoint
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {}
    };

    // Check OpenClaw
    try {
      await execAsync('pgrep -f "openclaw" > /dev/null');
      health.services.openclaw = 'running';
    } catch {
      health.services.openclaw = 'stopped';
      health.status = 'degraded';
    }

    // Check Home Assistant
    try {
      const response = await fetch('http://localhost:8123/api/', {
        headers: { 'Authorization': 'Bearer ' + process.env.HA_TOKEN },
        timeout: 5000
      });
      health.services.homeassistant = response.ok ? 'running' : 'error';
    } catch {
      health.services.homeassistant = 'unreachable';
    }

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// System stats endpoint
router.get('/stats', async (req, res) => {
  try {
    const stats = {};
    
    // Get uptime
    try {
      const { stdout: uptime } = await execAsync('uptime -p');
      stats.uptime = uptime.trim().replace('up ', '');
    } catch {
      stats.uptime = 'Unknown';
    }

    // Get memory info
    try {
      const { stdout: memInfo } = await execAsync('free -m');
      const lines = memInfo.split('\n');
      const memLine = lines[1].split(/\s+/);
      stats.memory = {
        total: parseInt(memLine[1]) / 1024, // Convert MB to GB
        used: parseInt(memLine[2]) / 1024,
        available: parseInt(memLine[6]) / 1024
      };
    } catch {
      stats.memory = { total: 0, used: 0, available: 0 };
    }

    // Get load average
    try {
      const { stdout: loadavg } = await execAsync('cat /proc/loadavg');
      const loads = loadavg.trim().split(' ').slice(0, 3).map(parseFloat);
      stats.load = loads;
    } catch {
      stats.load = [0, 0, 0];
    }

    // Get disk usage for root filesystem
    try {
      const { stdout: df } = await execAsync('df -h /');
      const lines = df.split('\n');
      const diskLine = lines[1].split(/\s+/);
      stats.storage = {
        total: parseFloat(diskLine[1].replace('G', '')),
        used: parseFloat(diskLine[2].replace('G', '')),
        available: parseFloat(diskLine[3].replace('G', ''))
      };
    } catch {
      stats.storage = { total: 0, used: 0, available: 0 };
    }

    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

export default router;