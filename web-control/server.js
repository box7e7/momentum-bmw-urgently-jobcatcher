const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs/promises');
const fsSync = require('fs');
const { jwtDecode } = require('jwt-decode');
const multer = require('multer');

// Configure multer for handling file uploads
const storage = multer.diskStorage({
    destination: path.join(__dirname, 'public', 'screenshots'),
    filename: function(req, file, cb) {
        // Use timestamp to prevent caching
        cb(null, `latest.png`);
    }
});

// Ensure screenshots directory exists
const screenshotsDir = path.join(__dirname, 'public', 'screenshots');
if (!fsSync.existsSync(screenshotsDir)) {
    fsSync.mkdirSync(screenshotsDir, { recursive: true });
}
const upload = multer({ storage: storage });
const { createReadStream } = require('fs');

const app = express();
const port = 3003;

// Endpoint to get server URL
app.use((req, res, next) => {
    // Get protocol from X-Forwarded-Proto header or default to http
    req.protocol = req.headers['x-forwarded-proto'] || req.protocol;
    next();
});

app.get('/api/server-url', (req, res) => {
    // Get host from X-Forwarded-Host header or default to req.get('host')
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const url = `${req.protocol}://${host}`;
    res.json({ url });
});

// PM2 connection handling
let pm2RetryCount = 0;
const MAX_PM2_RETRIES = 3;

process.on('uncaughtException', (err) => {
    if (err.message.includes('sock') && err.message.includes('PM2')) {
        console.warn('PM2 connection error, will retry on next request');
        pm2Connected = false;
        return;
    }
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    if (err.message.includes('sock') && err.message.includes('PM2')) {
        console.warn('PM2 connection error, will retry on next request');
        pm2Connected = false;
        return;
    }
    console.error('Unhandled Rejection:', err);
});

app.use(express.json());

// Serve static files from public directory
app.use(express.static('public'));

// Serve screenshots directory
app.use('/screenshots', express.static(path.join(__dirname, 'public', 'screenshots')));

// Endpoint to get ETA configuration
app.get('/api/config/eta', async (req, res) => {
    try {
        const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
        res.json(config.eta || { austin: 60, dallas: 60, other: 60 });
    } catch (error) {
        console.error('Error reading ETA config:', error);
        res.status(500).json({ error: 'Failed to read ETA config' });
    }
});

// Endpoint to update ETA configuration
app.post('/api/config/eta', express.json(), async (req, res) => {
    try {
        const { austin, dallas, other } = req.body;
        if (typeof austin !== 'number' || typeof dallas !== 'number' || typeof other !== 'number') {
            return res.status(400).json({ error: 'Austin, Dallas, and other ETAs must be numbers' });
        }
        
        const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
        config.eta = { austin, dallas, other };
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        res.json(config.eta);
    } catch (error) {
        console.error('Error updating ETA config:', error);
        res.status(500).json({ error: 'Failed to update ETA config' });
    }
});


// Initialize config file if it doesn't exist
const configPath = path.join(__dirname, '..', 'config.json');
try {
    if (!fsSync.existsSync(configPath)) {
        fsSync.writeFileSync(configPath, JSON.stringify({
            assignJobMultipleTimes: {
                enabled: false,
                duration: 30,
                interval: 1000
            },
            eta: {
                austin: 60,
                other: 60
            }
        }, null, 2));
    }
} catch (error) {
    console.error('Error initializing config file:', error);
}

// Add CORS headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Ensure screenshots directory exists
fs.mkdir(path.join(__dirname, 'public', 'screenshots'), { recursive: true }).catch(console.error);

// Endpoint to receive screenshots
app.post('/api/screenshot', upload.single('screenshot'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No screenshot provided' });
    }
    // Set no-cache headers
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.json({ success: true, timestamp: new Date().toISOString() });
});

// Serve screenshot
app.get('/api/screenshot', async (req, res) => {
    try {
        const screenshotPath = path.join(__dirname, '..', 'screenshots', 'screenshot.png');
        
        // Check if file exists
        try {
            await fs.access(screenshotPath);
        } catch (error) {
            return res.status(404).json({ error: 'Screenshot not found' });
        }

        // Get file stats for last modified time
        const stats = await fs.stat(screenshotPath);
        const lastModified = stats.mtime.toUTCString();

        // Check if browser cache is valid
        if (req.headers['if-modified-since'] === lastModified) {
            return res.status(304).end();
        }

        // Stream the file with caching headers
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Last-Modified', lastModified);
        
        createReadStream(screenshotPath).pipe(res);
    } catch (error) {
        console.error('Error serving screenshot:', error);
        res.status(500).json({ error: 'Failed to serve screenshot' });
    }
});

// Get token status
app.get('/api/token-status', async (req, res) => {
    try {
        // Read auth-token.json
        const tokenPath = path.join(__dirname, '..', 'auth-token.json');
        const tokenData = JSON.parse(await fs.readFile(tokenPath, 'utf8'));
        
        if (!tokenData.authToken) {
            return res.json({
                status: 'missing',
                message: 'No auth token found'
            });
        }

        // Decode JWT
        const decoded = jwtDecode(tokenData.authToken);
        
        // Get expiration timestamp from JWT and convert to milliseconds
        const expTimestamp = decoded.exp * 1000;
        
        // Create a date object in UTC
        const utcDate = new Date(expTimestamp);
        
        // Format the date in Central Time
        const expirationDetails = {
            date: utcDate.toLocaleString('en-US', {
                timeZone: 'America/Chicago',
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            time: utcDate.toLocaleString('en-US', {
                timeZone: 'America/Chicago',
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            }),
            timezone: 'CDT'
        };
        
        // Calculate time remaining
        const timeRemaining = expTimestamp - Date.now();
        const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        
        return res.json({
            status: timeRemaining > 0 ? 'valid' : 'expired',
            expirationDetails,
            timeRemaining: {
                hours: hoursRemaining,
                minutes: minutesRemaining,
                total: timeRemaining
            },
            message: timeRemaining > 0 
                ? `Token expires in ${hoursRemaining}h ${minutesRemaining}m` 
                : 'Token has expired'
        });
        
    } catch (error) {
        console.error('Error checking token:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Ensure location config file exists
const locationConfigPath = path.join(__dirname, 'location-config.json');
if (!fsSync.existsSync(locationConfigPath)) {
    fsSync.writeFileSync(locationConfigPath, JSON.stringify({ 
        austin: { enabled: false }, 
        dallas: { enabled: false } 
    }, null, 2));
}

// Location endpoints
app.get('/location', async (req, res) => {
    const place = req.query.place;
    
    if (place !== 'Austin' && place !== 'Dallas') {
        return res.status(400).json({ error: 'Invalid location. Only Austin and Dallas are supported.' });
    }

    try {
        const configPath = locationConfigPath;
        const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
        
        // Handle legacy format (migrate if needed)
        if (config.enabled !== undefined) {
            const legacyEnabled = config.enabled;
            config.austin = { enabled: legacyEnabled };
            config.dallas = { enabled: false };
            delete config.enabled;
            await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        }
        
        const locationKey = place.toLowerCase();
        const locationConfig = config[locationKey] || { enabled: false };
        res.json({ enabled: locationConfig.enabled });
    } catch (error) {
        console.error('Error reading location config:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/location/toggle', async (req, res) => {
    const { place } = req.body;
    
    if (place !== 'Austin' && place !== 'Dallas') {
        return res.status(400).json({ error: 'Invalid location. Only Austin and Dallas are supported.' });
    }
    
    try {
        const configPath = locationConfigPath;
        const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
        
        // Handle legacy format (migrate if needed)
        if (config.enabled !== undefined) {
            const legacyEnabled = config.enabled;
            config.austin = { enabled: legacyEnabled };
            config.dallas = { enabled: false };
            delete config.enabled;
        }
        
        const locationKey = place.toLowerCase();
        if (!config[locationKey]) {
            config[locationKey] = { enabled: false };
        }
        
        config[locationKey].enabled = !config[locationKey].enabled;
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        res.json({ enabled: config[locationKey].enabled });
    } catch (error) {
        console.error('Error updating location config:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get process status
app.get('/api/status', async (req, res) => {
    try {
        const stdout = await new Promise((resolve, reject) => {
            exec('pm2 jlist', {
                cwd: path.join(__dirname, '..')
            }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(stdout);
            });
        });

        const processes = JSON.parse(stdout);
        const process = processes.find(p => p.name === 'auth-bmw');

        if (!process) {
            res.json({
                status: 'not found',
                uptime: 0,
                restarts: 0,
                memory: 0,
                cpu: 0
            });
            return;
        }

        res.json({
            status: process.pm2_env.status,
            uptime: process.pm2_env.pm_uptime ? Math.floor((Date.now() - process.pm2_env.pm_uptime) / 1000) : 0,
            restarts: process.pm2_env.restart_time,
            memory: Math.floor(process.monit.memory / (1024 * 1024)), // Convert to MB
            cpu: process.monit.cpu,
            pid: process.pid
        });

    } catch (err) {
        console.error('Error getting status:', err);
        res.status(500).json({ 
            error: 'Failed to get process status',
            details: err.message
        });
    }
});

// Start process
app.post('/api/start', async (req, res) => {
    try {
        // Check if process is already running
        const isRunning = await new Promise((resolve) => {
            exec('pm2 show auth-bmw', {
                cwd: path.join(__dirname, '..')
            }, (error) => {
                resolve(!error);
            });
        });

        if (isRunning) {
            res.status(400).json({
                error: 'Process is already running',
                details: 'Cannot start a process that is already running'
            });
            return;
        }

        // Create logs directory if it doesn't exist
        const logsDir = path.join(__dirname, '..', 'logs');
        if (!fsSync.existsSync(logsDir)) {
            fsSync.mkdirSync(logsDir, { recursive: true });
        }

        console.log('Starting process...');
        
        // Start the process with PM2
        await new Promise((resolve, reject) => {
            exec('pm2 start index.js --name auth-bmw', {
                cwd: path.join(__dirname, '..')
            }, (error, stdout, stderr) => {
                if (error) {
                    console.error('Failed to start process:', error);
                    reject(error);
                    return;
                }
                resolve();
            });
        });

        // Wait for process to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if process is running
        const status = await new Promise((resolve) => {
            exec('pm2 show auth-bmw', {
                cwd: path.join(__dirname, '..')
            }, (error, stdout) => {
                resolve(!error && stdout.includes('online'));
            });
        });

        if (!status) {
            throw new Error('Process failed to start properly');
        }

        console.log('Process started successfully');
        res.json({ success: true });
    } catch (err) {
        console.error('Process start error:', err);
        res.status(500).json({ 
            error: 'Failed to start process',
            details: err.message
        });
    }
});

// Stop process
app.post('/api/stop', async (req, res) => {
    try {
        // Check if process exists
        const isRunning = await new Promise((resolve) => {
            exec('pm2 show auth-bmw', {
                cwd: path.join(__dirname, '..')
            }, (error) => {
                resolve(!error);
            });
        });

        if (!isRunning) {
            res.status(404).json({
                error: 'Process not found',
                details: 'Cannot stop a process that is not running'
            });
            return;
        }

        // Stop the process
        await new Promise((resolve, reject) => {
            exec('pm2 delete auth-bmw', {
                cwd: path.join(__dirname, '..')
            }, (error) => {
                if (error) {
                    console.error('Failed to stop process:', error);
                    reject(error);
                    return;
                }
                resolve();
            });
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Process stop error:', err);
        res.status(500).json({ 
            error: 'Failed to stop process',
            details: err.message
        });
    }
});

app.get('/api/status', async (req, res) => {
    try {
        const status = await new Promise((resolve) => {
            exec('pm2 show auth-bmw', {
                cwd: path.join(__dirname, '..')
            }, (error, stdout) => {
                resolve(!error && stdout.includes('online'));
            });
        });

        res.json({ running: status });
    } catch (err) {
        console.error('Error checking process status:', err);
        res.status(500).json({ 
            error: 'Failed to check process status',
            details: err.message
        });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint to get/update assignJobMultipleTimes configuration
app.get('/api/config/assignJobMultipleTimes', async (req, res) => {
    try {
        const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
        res.json(config.assignJobMultipleTimes);
    } catch (error) {
        console.error('Error reading config:', error);
        res.status(500).json({ error: 'Failed to read configuration' });
    }
});

app.post('/api/config/assignJobMultipleTimes', async (req, res) => {
    try {
        const { enabled, duration, interval } = req.body;
        const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
        
        config.assignJobMultipleTimes = {
            enabled: enabled !== undefined ? enabled : config.assignJobMultipleTimes.enabled,
            duration: duration !== undefined ? duration : config.assignJobMultipleTimes.duration,
            interval: interval !== undefined ? interval : config.assignJobMultipleTimes.interval
        };
        
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        res.json(config.assignJobMultipleTimes);
    } catch (error) {
        console.error('Error updating config:', error);
        res.status(500).json({ error: 'Failed to update configuration' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
