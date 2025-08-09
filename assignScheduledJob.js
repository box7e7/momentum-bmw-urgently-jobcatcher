import { appendFile } from 'fs/promises';
import fetch from 'node-fetch';
// import { send } from 'process';

/**
 * Logs a message to the scheduledJobs.logs file
 * @param {string} message - The message to log
 */
const logToFile = async (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp}: ${message}\n`;
    await appendFile('scheduledJobs.logs', logMessage);
};

/**
 * Assigns a scheduled job using the provided PO number and authentication token
 * @param {string} po - The PO number for the job
 * @param {string} auth_token - The authentication token
 * @returns {Promise} - The response from the API
 */
export const assignScheduledJob = async (po, auth_token) => {
    try {
        const response = await fetch(`https://ops-apis.urgent.ly/v3/ops/providers/jobs/${po}/dispatch`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
                'auth-token': auth_token,
            }
        });

        if (!response.ok) {
            await logToFile(`Error - PO: ${po} - HTTP error! status: ${response.status}`);
            throw new Error(`HTTP error! status: ${response.status}`);
            
        }

        const data = await response.json();
        await logToFile(`Success - PO: ${po} - Response: ${JSON.stringify(data)}`);
        return data;
    } catch (error) {
        const errorMessage = `Error assigning scheduled job for PO ${po}: ${error.message}`;
        await logToFile(errorMessage);
        console.error(errorMessage);
        throw error;
    }
};

/**
 * Assigns a scheduled job using POST method with the provided PO number and authentication token
 * @param {string} po - The PO number for the job
 * @param {string} auth_token - The authentication token
 * @returns {Promise} - The response from the API
 */


async function sendNotification(message, opts = {}) {
    // opts = {} is a default parameter:
    // if the caller omits the second argument (or passes undefined),
    // opts will be initialized to an empty object.
    // That lets us safely destructure defaults below.
  
    const {
      topic = 'myTopic',
    } = opts;
  
    try {
      console.log(`Sending notification to topic: ${topic}`);
  
      const response = await fetch(`https://ntfy.sh/${topic}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: message
      });
  
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      console.log('Notification sent successfully!');
    } catch (error) {
      console.error('Error in sendNotification:', error);
    }
  }


export const assignScheduledJob0 = async (po, auth_token) => {
    const PROVIDER_ID = 'd6164d60-abfb-44d1-af50-3af43c04f77b';
    try {
        const response = await fetch(`https://ops-apis.urgent.ly/v3/ops/providers/${PROVIDER_ID}/jobs/${po}/action/1250`, {
            method: 'POST',
            body: null,
            headers: {
                'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
                'auth-token': auth_token,
            }
        });

        if (!response.ok) {
            await logToFile(`Error - PO: ${po} - HTTP error! status: ${response.status}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        await logToFile(`Success - PO: ${po} - Response: ${JSON.stringify(data)}`);
        sendNotification(`Accept sent for Scheduled Job - PO: ${po} - Response: ${JSON.stringify(data)}`)
        return data;
    } catch (error) {
        const errorMessage = `Error assigning scheduled job for PO ${po}: ${error.message}`;
        await logToFile(errorMessage);
        console.error(errorMessage);
        throw error;
    }
};
