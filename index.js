import UrgentlyAutomation from './UrgentlyAutomation.js';

// Create instance of the automation class
const automation = new UrgentlyAutomation();

// Handle process signals for graceful shutdown
process.on('SIGINT', () => automation.cleanup());
process.on('SIGTERM', () => automation.cleanup());
process.on('exit', () => automation.cleanup());

// If running under PM2, handle its messages
if (process.send) {
    process.on('message', async (msg) => {
        if (msg === 'shutdown') {
            await automation.cleanup();
        }
    });
}

// Start the automation process
automation.run().catch(error => {
    console.error('Fatal error:', error);
    automation.cleanup();
});
