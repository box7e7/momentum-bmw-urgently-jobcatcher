import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { createClient } from '@supabase/supabase-js'
import updateToken from './update_token.js'
import dotenv from 'dotenv';
import chalk from 'chalk';
import { assignScheduledJob,assignScheduledJob0  } from './assignScheduledJob.js';
dotenv.config();


// ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

console.log(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

// Generic credentials (replace with actual credentials in production)
const credentials = {
    username: 'FAYSSAL.FEKAIR',
    password: 'Ff84Adouera16Bh1013', // Used when both username and password fields exist
    passcode: '251984' // Used for passcode field in fallback
};

let authTokenGlobal;
let extractedData;

const BASE_URL = 'https://ops-apis.urgent.ly/v3/ops/jobs';
const PROVIDER_ID = 'd6164d60-abfb-44d1-af50-3af43c04f77b';
let TRUCK_ID = '09e075c8-fcde-47c9-9101-a32d59c1c266';
TRUCK_ID = "cae988d2-cbe5-46bb-b066-89a4408aacaf"
let etaConfig = { austin: 60, other: 60 };

// Define Austin counties
const austin_counties = ['Mclennan County', 'Travis County', 'Williamson County', 'Hays County', 'Bastrop County', 'Bell County'];
const dallas_counties = ['Dallas County', 'Collin County', 'Tarrant County', 'Denton County', 'Rockwall County'];
async function getEtaConfig() {
  try {
    const baseUrl = await getServerUrl();
    const response = await fetch(`${baseUrl}/api/config/eta`);
    if (!response.ok) throw new Error('Failed to fetch ETA config');
    etaConfig = await response.json();
    return etaConfig;
  } catch (error) {
    console.error('Error fetching ETA config:', error);
    return etaConfig; // Return default values if fetch fails
  }
}

let po_number_global=[];

let serverBaseUrl = null;

async function getServerUrl() {
  if (serverBaseUrl) return serverBaseUrl;
  
  try {
    // Try localhost first
    const localUrl = 'http://localhost:3003';
    const response = await fetch(`${localUrl}/api/server-url`);
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
    const response = await fetch(`${baseUrl}/api/config/assignJobMultipleTimes`);
    if (!response.ok) throw new Error('Failed to fetch config');
    return await response.json();
  } catch (error) {
    console.error('Error fetching assignJobMultipleTimes config:', error);
    return { enabled: false, duration: 30, interval: 1000 };
  }
}

async function assignJobMultipleTimes(poNumber, auth_token, jobInfo, location, duration = 30, interval = 1000) {
  // Get latest ETA configuration
  await getEtaConfig();
  
  // Get configuration from web control
  const config = await getAssignJobConfig();
  
  // If disabled via web control, just do a single assignment
  if (!config.enabled) {
    console.log('assignJobMultipleTimes is disabled via web control. Performing single assignment.');
    const result = await assignJob(poNumber, auth_token, jobInfo,location);
    return { successCount: result ? 1 : 0, failCount: result ? 0 : 1 };
  }
  
  // Use configuration from web control
  duration = config.duration;
  interval = config.interval;
  const startTime = Date.now();
  const endTime = startTime + (duration * 1000);
  let successCount = 0;
  let failCount = 0;

  while (Date.now() < endTime) {
    try {
      // Determine if location is in Austin or Dallas counties
      const isAustinLocation = austin_counties.includes(location?.county);
      const isDallasLocation = dallas_counties.includes(location?.county);
      let eta;
      if (isAustinLocation) {
          eta = etaConfig.austin;
      } else if (isDallasLocation) {
          eta = etaConfig.dallas || etaConfig.other; // fallback to other if dallas not configured
      } else {
          eta = etaConfig.other;
      }
      // console.log("//// job info /////", jobInfo)
      // console.log("///// austin_counties //////",austin_counties)
      // console.log("///// dallas_counties //////",dallas_counties)
      console.log("#### ETA ####",eta)
      console.log("#### isAustinLocation ####", isAustinLocation)
      console.log("#### isDallasLocation ####", isDallasLocation)

      const assignUrl = `${BASE_URL}/${poNumber}/assign?providerId=${PROVIDER_ID}&truckId=${TRUCK_ID}&eta=${eta}`;

      console.log("//// assign Job Multiple Times url ///", assignUrl)
      
      const response = await fetch(assignUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive',
          'auth-token': auth_token,
        },
      });

      const responseData = await response.text();
      console.log('Response status:', response.status);
    //   console.log('Response headers:', Object.fromEntries(response.headers));
      console.log('Response body:', responseData);

      if (response.ok) {
        successCount++;
      } else {
        failCount++;
      }
      console.log(`Assign attempt results - Success: ${successCount}, Failed: ${failCount}`);
    } catch (error) {
      failCount++;
      console.error('Error in job assignment:', error);
      console.log(`Assign attempt results - Success: ${successCount}, Failed: ${failCount}`);
    }
    await sleep(interval);
  }

  return { successCount, failCount };
}

async function assignJob(poNumber, auth_token, jobInfo,location) {
  if (!poNumber || !auth_token) {
    console.error('Missing required parameters:', { poNumber, auth_token });
    return false;
  }

  // Get latest ETA configuration
  await getEtaConfig();

  // Determine if location is in Austin or Dallas counties
      const isAustinLocation = austin_counties.includes(location?.county);
      const isDallasLocation = dallas_counties.includes(location?.county);
      let eta;
      if (isAustinLocation) {
          eta = etaConfig.austin;
      } else if (isDallasLocation) {
          eta = etaConfig.dallas || etaConfig.other; // fallback to other if dallas not configured
      } else {
          eta = etaConfig.other;
      }
      console.log("///// location /////", location)
      // console.log("///// Job info /////",jobInfo)
      //  console.log("///// austin_counties //////",austin_counties)
      //  console.log("///// dallas_counties //////",dallas_counties)
      console.log("#### ETA ####",eta)
      console.log("#### isAustinLocation ####", isAustinLocation)
      console.log("#### isDallasLocation ####", isDallasLocation)
      const assignUrl = `${BASE_URL}/${poNumber}/assign?providerId=${PROVIDER_ID}&truckId=${TRUCK_ID}&eta=${eta}`;

        console.log("//// assign Job url ///", assignUrl)
  
  try {
    // Make the assign request
    const response = await fetch(assignUrl, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
          'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive',
          'auth-token': auth_token,
      },
    });

    const responseData = await response.text();
    // console.log('Response status:', response.status);
    // console.log('Response headers:', Object.fromEntries(response.headers));
    console.log('Response body:', responseData);

    // Prepare job data for Supabase
    const jobData = {
      po: poNumber,
      job: jobInfo || {},
      status: response.ok ? 'Job assigned successfully' : responseData,
      
    };

    try {
      // Insert into Supabase
      const { data, error } = await supabase
        .from('bmwJobs')
        .insert([jobData]);

      if (error) {
        console.error('Error inserting into Supabase:', error);
      } else {
        console.log('Successfully inserted job data into Supabase:', data);
      }
    } catch (supabaseError) {
      console.error('Error with Supabase operation:', supabaseError);
    }

    // If the assign request failed, throw error
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}, body: ${responseData}`);
    }

    console.log('Job assigned successfully');
    return true;

  } catch (error) {
    console.error('Error in assignJob:', error);

    // Try to record the error in Supabase
    try {
      const { error: supabaseError } = await supabase
        .from('bmwJobs')
        .insert([{
          po: poNumber,
          job: jobInfo || {},
          status: `Error: ${error.message || 'Unknown error'}`,
          created_at: new Date().toISOString()
        }]);

      if (supabaseError) {
        console.error('Error inserting error status into Supabase:', supabaseError);
      }
    } catch (supabaseError) {
      console.error('Error inserting error status into Supabase:', supabaseError);
    }

    return false;
  }
}



let isAssignJob=async function(address,zip,serviceId){
    let location
    let url = `http://127.0.0.1:9093/geocode?address=${address}&zip=${zip}`;
    let result=await fetch(url)
    location=await result.json()
    console.log("///// location from isAssignJob //////",location)
  
    if(austin_counties.includes(location.county)) {
        url="http://localhost:3003/location?place=Austin"
        result=await fetch(url)
        result=await result.json()
        let isAustin=result.enabled
        // console.log(isAustin)
        if(isAustin && serviceId==2001){
            console.log("Assign Job")
            return {status:true,location:location}
        }
        else{
            console.log("No Job Assignment")
            return  {status:false, location:location}
        }
    }
    else if(dallas_counties.includes(location.county)) {
        url="http://localhost:3003/location?place=Dallas"
        result=await fetch(url)
        result=await result.json()
        let isDallas=result.enabled
        // console.log(isDallas)
        if(isDallas && serviceId==2001){
            console.log("Assign Job")
            return {status:true,location:location}
        }
        else{
            console.log("No Job Assignment")
            return  {status:false, location:location}
        }
    }
    else{
        console.log("Assign Job")
        return {status:true,location:location}
    }
  
  }



// Extraction logic
function extractJobInfo(obj) {
    return {
      po_number: obj?.service?.number ?? null,
      service_type: obj?.service?.serviceType ?? null,
      customer: obj?.service?.contactName ?? obj?.personalInfo?.name ?? null,
      phone: obj?.service?.contactPhoneNumber ?? obj?.personalInfo?.phone ?? null,
      price: obj?.provider?.costs?.[0]?.price ?? obj?.servicePrice?.totalOfferPrice ?? null,
      pickup_location: obj?.location?.address ?? null,
      drop_off: obj?.dropOffLocation?.address ?? null,
      vehicle: obj?.vehicle 
        ? `${obj.vehicle.year} ${obj.vehicle.make} ${obj.vehicle.model} ${obj.vehicle.color}` 
        : null,
      vin_number: obj?.vehicle?.vin ?? null
    };
  }


const extensionPath = path.resolve('./bmw-group-sso-urgently');

// Helper function to sleep
let sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to take screenshots
async function takeScreenshot(page, name) {
    try {
        const screenshotsDir = path.join(__dirname, 'screenshots');
        await fs.mkdir(screenshotsDir, { recursive: true });
        const screenshotPath = path.join(screenshotsDir, `${name}.png`);
        
        // Take the screenshot
        await page.screenshot({ path: screenshotPath });
        
        // Read the screenshot file
        const screenshotBuffer = await fs.readFile(screenshotPath);
        
        // Create form data
        const formData = new FormData();
        formData.append('screenshot', Buffer.from(screenshotBuffer), 'screenshot.png');
        
        // Send to web control
        const response = await fetch('http://localhost:3003/api/screenshot', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Failed to upload screenshot: ${response.statusText}`);
        }
        
        console.log('Screenshot uploaded successfully');
    } catch (error) {
        console.error('Error handling screenshot:', error);
    }
}

async function main() {

    try{
        await login()

    }
    catch(error){
         console.error('An error occurred:', error);
    }


    // try {
    //     // Load ETA configuration at startup
    //     await getEtaConfig();
    //     // Launch the browser
    //     const launchOptions = {
    //         headless: false,
    //         // headless: true,
    //         defaultViewport: null,
    //         args: [
    //             `--disable-extensions-except=${extensionPath}`,
    //             `--load-extension=${extensionPath}`,
    //             '--start-maximized',
    //             '--no-sandbox',
    //             '--disable-setuid-sandbox'
    //         ]
    //     };



    //     // If running under PM2, add additional options
    //     if (process.env.PM2_HOME) {
    //         launchOptions.args.push(
    //             '--disable-dev-shm-usage',
    //             '--disable-gpu'
    //         );
    //     }

    //     browser = await puppeteer.launch(launchOptions);



    //     const page = await browser.newPage();

    //     // Capture specific response packets
    //     page.on('response', async response => {
    //         try {
    //             const url = response.url();
                
    //             // Log jobs endpoint responses
    //             if (url.includes('https://ops-apis.urgent.ly/v3/ops/jobs')) {
    //                 try {
    //                     const responseBody = await response.json();
    //                     // console.log('\n');
    //                     // console.log('#'.repeat(80));
    //                     // console.log('#'.repeat(80));
    //                     // console.log('////// JOBS API RESPONSE //////');
    //                     // console.log('URL:', url);
    //                     // console.log('Status:', response.status());
    //                     // console.log('Response:', JSON.stringify(responseBody, null, 2));
    //                     // console.log('#'.repeat(80));
    //                     // console.log('#'.repeat(80));
    //                     // console.log('\n');
    //                 } catch (e) {
    //                     console.error('Error processing jobs response:', e);
    //                 }
    //                 return; // Don't save jobs responses to file
    //             }

    //             // Log PubNub subscribe responses
    //             if (url.match(/https:\/\/.*\.pndsn\.com\/v2\/subscribe\/.*/)) {
    //                 try {
    //                     const responseBody = await response.json();
    //                     // console.log('Response Body:', JSON.stringify(responseBody, null, 2));
                        
    //                     // Only process if we have messages
    //                     if (responseBody.m && responseBody.m[0] && responseBody.m[0].d && responseBody.m[0].d.message) {
    //                         try {
    //                             // console.log('Raw message:', responseBody.m[0].d.message);
    //                             let message;
    //                             try {
    //                                 message = JSON.parse(responseBody.m[0].d.message);
    //                                 // console.log('Parsed message:', JSON.stringify(message, null, 2));
    //                             } catch (parseError) {
    //                                 console.error('Failed to parse message:', parseError);
    //                                 return;
    //                             }
                                
    //                             // Extract all required fields
    //                             extractedData = {
    //                                 po_number: message.poNumber || message.service?.number,
    //                                 id: message.caseDTO?.id,
    //                                 status: message.service?.status || message.provider?.status,
    //                                 statusDescription: message.service?.statusDescription,
    //                                 address: message.location?.address,
    //                                 zip: message.location?.zipCode,
    //                                 timestamp: new Date().toISOString()
    //                             };
    //                             // console.log('Extracted Data:', JSON.stringify(extractedData, null, 2));

    //                             // // Log extracted data with separators
    //                             // console.log('*'.repeat(60));
    //                             // console.log('*'.repeat(60));
    //                             // console.log('*'.repeat(60));
    //                             // console.log('////// EXTRACTED PUBNUB DATA ///////');
    //                             // console.log('PO Number:', extractedData.po_number);
    //                             // console.log('ID:', extractedData.id);
    //                             // console.log('Status:', extractedData.status);
    //                             // console.log('Status Description:', extractedData.statusDescription);
    //                             // console.log('Address:', extractedData.address);
    //                             // console.log('ZIP:', extractedData.zip);
    //                             // console.log('Timestamp:', extractedData.timestamp);
    //                             // console.log('*'.repeat(60));
    //                             // console.log('*'.repeat(60));
    //                             // console.log('*'.repeat(60));


    //                             let serviceId=message.service?.serviceId;  
    //                             l  // if service is missing, this is undefined
    //                                 ? message.service.type          // truthy type → use it
    //                                 : null; 
    //                             console.log('*'.repeat(60));
    //                             console.log("////// serviceId ///////\n", serviceId);
    //                             console.log('Status:', extractedData.status);
    //                             console.log("Service type", type)
    //                             serviceId==2001 ? console.log("Twoing Service Requested") : null;
    //                             console.log('*'.repeat(60));

    //                             // try{
    //                             //     console.log('Auth Token:');
    //                             //     console.log(authTokenGlobal);
    //                             // }catch(e){
    //                             //     console.error('Error displaying auth token:', e);
    //                             // }


    //                             if(extractedData.status === 1){
    //                                 // console.log('Status:', extractedData.status);
    //                                 // console.log("Service type", type)
    //                                 if(serviceId==2001){
    //                                     console.log('Twoing Service Requested');
    //                                 }


    //                                 try {
    //                                     const jobInfo = extractJobInfo(message);
    //                                     console.log('#*'.repeat(60));
    //                                     console.log('Job Info:', JSON.stringify(jobInfo, null, 2));
    //                                     console.log('#*'.repeat(60));

    //                                     if(po_number_global.includes(extractedData.po_number)) {
    //                                         console.log('#*'.repeat(60));
    //                                         console.log('#*'.repeat(60));
    //                                         console.log('Job already processed');
    //                                         console.log('#*'.repeat(60));
    //                                         console.log('#*'.repeat(60));
    //                                     } else {
    //                                         isAssignJob(extractedData.address, extractedData.zip, serviceId).then(result => {
    //                                             if(result.status && jobInfo) {
    //                                                 console.log('Assigning job...');
    //                                                 // console.log("///// result from await isAssignJob //////", result)
    //                                                 if (type === 'RSA_ON_DEMAND') {
    //                                                     // …handle on-demand…
    //                                                     console.log('On-demand service');
    //                                                     assignJob(extractedData.po_number, authTokenGlobal, jobInfo,result.location);
    //                                                     assignJobMultipleTimes(extractedData.po_number, authTokenGlobal, jobInfo,result.location)
    //                                                         .then(result => {
    //                                                             console.log(`Final results - Success: ${result.successCount}, Failed: ${result.failCount}`);
    //                                                         })
    //                                                         .catch(error => {
    //                                                             console.error('Error:', error);
    //                                                         });
    //                                                 } else if (type === 'RSA_SCHEDULED_SERVICE') {
    //                                                     // …handle scheduled…
    //                                                     console.log('Scheduled service');
    //                                                     assignScheduledJob(extractedData.po_number, authTokenGlobal);
    //                                                     assignScheduledJob0(extractedData.po_number, authTokenGlobal);
    //                                                   } else {
    //                                                     // …handle all other cases…
    //                                                     console.log('Other service types or none');
    //                                                     assignJob(extractedData.po_number, authTokenGlobal, jobInfo,result.location);
    //                                                     assignJobMultipleTimes(extractedData.po_number, authTokenGlobal, jobInfo,result.location)
    //                                                         .then(result => {
    //                                                             console.log(`Final results - Success: ${result.successCount}, Failed: ${result.failCount}`);
    //                                                         })
    //                                                         .catch(error => {
    //                                                             console.error('Error:', error);
    //                                                         });
    //                                                   }
                                                   
                                                   
                                                    
    //                                             }
    //                                         });
    //                                         po_number_global.push(extractedData.po_number);
    //                                     }
    //                                 } catch(e) {
    //                                     console.error('Error processing job info:', e);
    //                                 }

                                   
                                    
    //                             }
    //                             else{
    //                                 console.log('Job is not in status 1, skipping assignment.');
    //                             }
    //                         } catch (parseError) {
    //                             console.error('Error parsing message data:', parseError);
    //                         }




    //                     }
    //                 } catch (e) {
    //                     console.error('Error processing PubNub response:', e);
    //                 }
    //                 return; // Don't save PubNub responses to file
    //             }
                
    //             // Process login responses
    //             if (url.includes('https://ops-apis.urgent.ly/v3/ops/login-as-token-authorized')) {
    //                 const headers = response.headers();
    //                 const status = response.status();
    //                 let responseBody = '';
                    
    //                 try {
    //                     responseBody = await response.text();
    //                 } catch (e) {
    //                     responseBody = '<binary data>';
    //                 }

    //                 // Create full response data object
    //                 const responseData = {
    //                     timestamp: new Date().toISOString(),
    //                     url,
    //                     status,
    //                     headers,
    //                     body: responseBody
    //                 };

    //                 // Save full response to file
    //                 const responsePath = path.join(process.cwd(), 'responses');
    //                 await fs.mkdir(responsePath, { recursive: true });
    //                 const responseFile = path.join(responsePath, `response_${Date.now()}.json`);
    //                 await fs.writeFile(responseFile, JSON.stringify(responseData, null, 2));
    //                 console.log('Full response saved to:', responseFile);

    //                 // If we have cookies, process them
    //                 const setCookieHeader = headers['set-cookie'];
    //                 if (setCookieHeader) {
    //                     // Parse cookies and extract auth-token
    //                     let authToken = null;
    //                     if (Array.isArray(setCookieHeader)) {
    //                         // Handle array of cookies
    //                         for (const cookie of setCookieHeader) {
    //                             if (cookie.includes('auth-token=')) {
    //                                 authToken = cookie.split('auth-token=')[1].split(';')[0];
                                    
    //                                 console.log('\n=== AUTH TOKEN FOUND ===');
    //                                 console.log(authToken);
    //                                 console.log('=====================\n');
    //                                 await updateToken(authToken)
    //                                 break;
    //                             }
    //                         }
    //                     } else if (typeof setCookieHeader === 'string') {
    //                         // Handle single cookie string
    //                         if (setCookieHeader.includes('auth-token=')) {
    //                             authToken = setCookieHeader.split('auth-token=')[1].split(';')[0];
    //                             console.log('\n=== AUTH TOKEN FOUND ===');
    //                             authTokenGlobal = authToken;
    //                             console.log(authToken);
    //                             await updateToken(authToken)
    //                             console.log('=====================\n');
    //                         }
    //                     }
                        
    //                     if (!authToken) {
    //                         console.log('\n!!! NO AUTH TOKEN FOUND IN COOKIES !!!');
    //                         console.log('Cookies received:', setCookieHeader);
    //                         console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n');
    //                     }

    //                     const cookieData = {
    //                         timestamp: new Date().toISOString(),
    //                         url,
    //                         cookies: setCookieHeader,
    //                         authToken: authToken
    //                     };

    //                     // Save cookies to file
    //                     const cookiesPath = path.join(process.cwd(), 'cookies.json');
                        
    //                     // If file exists, read and update, otherwise create new
    //                     let existingData = [];
    //                     try {
    //                         const fileContent = await fs.readFile(cookiesPath, 'utf8');
    //                         existingData = JSON.parse(fileContent);
    //                     } catch (e) {
    //                         // File doesn't exist or is invalid, start with empty array
    //                     }

    //                     // Add new cookie data
    //                     existingData.push(cookieData);

    //                     // Save back to file
    //                     await fs.writeFile(cookiesPath, JSON.stringify(existingData, null, 2));
    //                     console.log('Cookies saved with auth-token:', authToken);

    //                     // Save auth token separately for easy access
    //                     if (authToken) {
    //                         try {
    //                             const tokenData = {
    //                                 timestamp: new Date().toISOString(),
    //                                 authToken: authToken
    //                             };
    //                             await fs.writeFile(
    //                                 path.join(process.cwd(), 'auth-token.json'),
    //                                 JSON.stringify(tokenData, null, 2)
    //                             );
    //                             console.log('Auth token saved to auth-token.json');
    //                         } catch (error) {
    //                             console.error('Error saving auth token:', error);
    //                         }
    //                     }
    //                 }
    //             }
    //         } catch (error) {
    //             console.error('Error capturing cookies:', error);
    //         }
    //     });

      

    //     ///////////////////////////////////////////////////////////////////
    //     ///////////////////////////////////////////////////////////////////


    //     await page.goto('chrome://extensions');
    //     await sleep(1000);  // give Chrome a moment to render
    //     await takeScreenshot(page, 'extensions_page');
        
    //     // 3. Drill into shadow roots to find the Developer mode toggle
    //     await page.evaluate(() => {
    //       const manager = document.querySelector('body > extensions-manager');
    //       const toolbar = manager.shadowRoot
    //         .querySelector('extensions-toolbar');
    //       const devModeCheckbox = toolbar.shadowRoot
    //         .querySelector('#devMode');
    //       devModeCheckbox.click();
    //     });

    //     //////////////////////////////////////////////////////////////////////
    //     await sleep(3000);

    //     // Navigate to the BMW authentication page
    //     let url = 'https://auth.bmwgroup.com/auth/XUI/?realm=/internetb2x&authIndexType=service&authIndexValue=strongAuth4000Service&goto=https://auth.bmwgroup.com:443/auth/oauth2/realms/root/realms/internetb2x/authorize?response_type%3Dcode%26client_id%3Daf548bdc-f64c-4bae-89c6-d001ae15ca03%26scope%3Dopenid%2520profile%2520email%2520phone%2520bmwids%2520organization%2520b2xroles%2520b2d%26redirect_uri%3Dhttps://sgate.bmwgroup.com/web/oidc-callback%26state%3D3d6232e2-b349-4c4c-9bf0-32e6507ad617%26acr_values%3DstrongAuth4000Service#login/';
    //     //url="https://auth.bmwgroup.com/auth/XUI/?realm=/internetb2x&goto=https%3A%2F%2Fauth.bmwgroup.com%3A443%2Fauth%2Foauth2%2Frealms%2Froot%2Frealms%2Finternetb2x%2Fauthorize%3Frealm%3D%252Finternetb2x%26response_mode%3Dform_post%26state%3D08c49d08-e098-0ce5-624d-5702c627d2e2%26redirect_uri%3Dhttps%253A%252F%252Fpix.bmwgroup.com%253A443%252Fagent%252Fcdsso-oauth2%26response_type%3Did_token%26scope%3Dopenid%26client_id%3Dpix.bmwgroup.com_443_d7ed5642-07b4-457c-9514-238eddfb2f93%26agent_provider%3Dtrue%26agent_realm%3D%252Finternetb2x%26nonce%3D7B1879F0FB99C3F64A6533D780A2E0CB&realm=%2Finternetb2x#login/"
    //     await page.goto(url, {
    //         waitUntil: 'networkidle0',
    //         timeout: 60000
    //     });
      

    //     // Start the form automation
    //     await autoFillForm(page);
    

    // } catch (error) {
    //     console.error('An error occurred:', error);
    // }
}


  // Login function using Puppeteer
  async function login() {
    try {
      console.log(chalk.yellow('Starting login process...'));
      console.log(`User: ${this.user_urgently}`);
      console.log(`Password: ${this.password_urgently}`);

      // Launch browser
      this.browser = await puppeteer.launch({
        headless: false,
        // headless: true,
        args: this.customArgs,
        // userDataDir: "./user_data",
        defaultViewport: null,
      });

      this.page = await this.browser.newPage();
      await this.page.goto('https://bmw.urgent.ly/portal/#/home');
      await this.page.setViewport({ width: 1620, height: 900 });
      await this.page.waitForTimeout(1000);
      await this.page.screenshot({ path: 'urgently.png' });

      try {
        // Attempt to login
        const username = await this.page.$x('//*[@id="loginModal"]/div[3]/div/div/form/div[1]/div/div/input');
        await username[0].click();
        await this.page.keyboard.type(this.user.user);

        const password = await this.page.$x('/html/body/div/div/div[2]/div[3]/div/div/form/div[2]/div/div/input');
        await password[0].click();
        await this.page.keyboard.type(this.user.password);

        const login = await this.page.$x('/html/body/div/div/div[2]/div[3]/div/div/form/div[3]/div[1]/input');
        await login[0].click();

        await this.page.waitForTimeout(15000);

        const mobile = await this.page.$x('/html/body/div[1]/div[2]/content/ng-include/div[1]/div/a[3]');
        await mobile[0].click();

        console.log(chalk.green('Login successful!'));
      } catch (e) {
        console.log(chalk.blue("Already logged in"));
        await this.page.waitForTimeout(20000);

        const mobile = await this.page.$x('/html/body/div[1]/div[2]/content/ng-include/div[1]/div/a[3]');
        await mobile[0].click();
      }

      // Save cookies and get auth token
      let cookies0 = await this.page.cookies('https://bmw.urgent.ly/portal/#/home');
      let auth_token = null;

      // Extract auth token from cookies
      await new Promise(resolve => {
        for (let i = 0; i < cookies0.length; i++) {
          if (cookies0[i]["name"] == "auth-token") {
            auth_token = decodeURIComponent(cookies0[i]["value"]).replace(/"/g, '');
            resolve(auth_token);
            return;
          }
        }
        resolve(null);
      });

      if (auth_token) {
        console.log("Auth token extracted from cookies:", auth_token);
        
        // Save cookies and auth token for future use
        const cookieData = {
          data: [{
            authToken: auth_token
          }],
          cookies: cookies0
        };
        
        await fs.writeFile('./cookies.json', JSON.stringify(cookieData, null, 2));
        await fs.writeFile('./cookies0.json', JSON.stringify(cookies0, null, 2));

        const decoded = getpayload(auth_token);
        const timestampInSeconds = decoded["exp"];
        const date = new Date(timestampInSeconds * 1000);
        console.log("Token expires on:", date.toLocaleString());
        console.log("Current time:", this.currentMoment());
      } else {
        console.log("Warning: Could not extract auth token from cookies");
      }
      await this.page.screenshot({ path: 'screenshot0.png' });

      console.log(chalk.green('Login process completed successfully!'));
      return true;
    } catch (error) {
      console.error(chalk.red('Login failed:'), error);
      return false;
    }
  }


// Main automation function
async function autoFillForm(page) {
    console.log('Starting automation after page load');


     // Take screenshots every 20 seconds without blocking the browser
     const interval = setInterval(() => {
        // Don't await here so it doesn't block the main thread
        takeScreenshot(page, 'screenshot');
        console.log('Taking screenshot...');
    }, 2000);

    // Stop screenshots after 5 minutes
    setTimeout(() => {
        clearInterval(interval);
        console.log("Stopped taking screenshots.");
    }, 5 * 60 * 1000);



    try {
        await takeScreenshot(page, 'before_autofill');
        
       
        // Check if both #idToken2 (username) and #idToken3 (password) exist
        const usernameExists = await page.$('#idToken2');
        const passwordExists = await page.$('#idToken3');

        if (usernameExists && passwordExists) {
            console.log('Both username and password fields are available');
            await page.type('#idToken2', credentials.username);
            await sleep(300);
            await page.type('#idToken3', credentials.password); // Use password here
            await sleep(300);
            // Click the submit button (idToken4_0)
            await page.waitForSelector('#idToken4_0');
            await page.click('#idToken4_0');
        } else {
            // Fallback to original flow
            // Wait for username field and submit button
            await Promise.all([
                page.waitForSelector('#idToken2'),
                page.waitForSelector('#callback_2_1')
            ]);

            console.log('Both username field and submit button are available');
            await takeScreenshot(page, 'after_submit');
            
            // Fill username and click submit
            await page.type('#idToken2', credentials.username);
            await sleep(500);
            await page.click('#callback_2_1');

            // Wait for and click the authentication option
            await page.waitForSelector('#idToken4_0');
            await page.click('#idToken4_0');

            // Wait for passcode field
            await sleep(1000);
            await page.waitForSelector('#idToken1');
            await page.type('#idToken1', credentials.passcode);

            // Click the final submit button
            if (await page.$('#idToken2_0')) {
                await page.click('#idToken2_0');

                await sleep(2000);
                await takeScreenshot(page, 'after_sleep');
                // Check for error message
                const callback0Text = await page.evaluate(() => {
                    const elem = document.getElementById("callback_0");
                    return elem ? elem.innerText : null;
                });
                console.log(callback0Text);
                if (!callback0Text) {
                    // // Send notification

                  
                  try {
                      const topic = 'myTopic';
                      console.log(`Sending notification to topic: ${topic}`);
                  
                      const response = await fetch(`https://ntfy.sh/${topic}`, {
                          method: 'POST',
                          headers: {
                              'Content-Type': 'text/plain'
                          },
                          body: 'open netiq auth app and accept'
                      });
                  
                      if (!response.ok) {
                          throw new Error(`Server error: ${response.status}`);
                      }
                      console.log('Notification sent successfully!');

                      await sleep(30000);

                      let url="https://auth.bmwgroup.com/auth/saml2/jsp/idpSSOInit.jsp?metaAlias=/internetb2x/saml20-internetb2x&spEntityID=sso.urgent.ly";
                      await page.goto(url);
                      await sleep(1000);

                  } catch (error) {
                      console.error('Error sending notification:', error);
                  }
              }
              else{
                console.log(" No notification sent: " + callback0Text);
              }

              await takeScreenshot(page, 'end_1');
              await sleep(5000);
              await takeScreenshot(page, 'end_2');

            //    // Take screenshots every 20 seconds without blocking the browser
            //    const interval = setInterval(() => {
            //     // Don't await here so it doesn't block the main thread
            //     takeScreenshot(page, 'example');
            //     console.log('Taking screenshot...');
            // }, 2000);

            

    


            }
        }
    } catch (error) {
        console.error('Error during form automation:', error);
    }
}

// Handle process signals for graceful shutdown
let browser;

async function cleanup() {
    if (browser) {
        try {
            await browser.close();
        } catch (error) {
            console.error('Error closing browser:', error);
        }
    }
    process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

// If running under PM2, handle its messages
if (process.send) {
    process.on('message', async (msg) => {
        if (msg === 'shutdown') {
            await cleanup();
        }
    });
}

// Start the main process
main().catch(error => {
    console.error('Fatal error:', error);
    cleanup();
});
