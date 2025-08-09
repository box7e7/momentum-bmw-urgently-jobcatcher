
import fetch from 'node-fetch';

let serverBaseUrl = null;
async function getServerUrl() {
  if (serverBaseUrl) return serverBaseUrl;
  
  try {
    // Try localhost first
    const localUrl = 'http://localhost:3003';
    const response = await fetch(`${localUrl}/api/server-url`);
    // console.log(response);
    if (!response.ok) throw new Error('Failed to fetch server URL');
    const { url } = await response.json();
    serverBaseUrl = url;
    return url;
  } catch (error) {
    console.error('Error fetching server URL:', error);
    return 'http://localhost:3003'; // Fallback to localhost
  }
}

async function getAssignJobConfig() {
  try {
    const baseUrl = await getServerUrl();
    console.log(baseUrl);
    const response = await fetch(`${baseUrl}/api/config/assignJobMultipleTimes`);
    if (!response.ok) throw new Error('Failed to fetch config');
    return await response.json();
  } catch (error) {
    console.error('Error fetching assignJobMultipleTimes config:', error);
    return { enabled: false, duration: 30, interval: 1000 };
  }
}




async function exec() {
    // Get configuration from web control
    const config = await getAssignJobConfig();
    
    // If disabled via web control, just do a single assignment
    if (!config.enabled) {
      console.log('assignJobMultipleTimes is disabled via web control. Performing single assignment.');
     
      
    }
    else{
        console.log(config);
    }
}



exec();







    


// import { assignScheduledJob } from './assignScheduledJob.js';
// import { readFile } from 'fs/promises';

// (async () => {
//     try {
//         // Read the auth token from the JSON file
//         const authTokenData = JSON.parse(await readFile('auth-token.json', 'utf8'));
//         const authToken = authTokenData.authToken;

//         // Test PO number
//         const poNumber = 8901421;

//         console.log(`Testing assignScheduledJob with PO: ${poNumber}`);
//         const result = await assignScheduledJob(poNumber, authToken);
//         console.log('Result:', result);
//     } catch (error) {
//         console.error('Test failed:', error);
//     }
// })();
// // console.log(expired);