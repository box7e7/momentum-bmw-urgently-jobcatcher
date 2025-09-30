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
import { assignScheduledJob, assignScheduledJob0 } from './assignScheduledJob.js';

dotenv.config();

// ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UrgentlyAutomation {
    constructor() {
        // Initialize Supabase client
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        
        // Generic credentials
        this.credentials = {
            username: process.env.URGENTLY_USER,
            password: process.env.URGENTLY_PASSWORD,
        };

        // Global variables
        this.authTokenGlobal = null;
        this.extractedData = null;
        this.browser = null;
        this.page = null;

        // Configuration
        this.BASE_URL = 'https://ops-apis.urgent.ly/v3/ops/jobs';
        this.PROVIDER_ID = 'd6164d60-abfb-44d1-af50-3af43c04f77b';
        this.TRUCK_ID = "cae988d2-cbe5-46bb-b066-89a4408aacaf";
        this.etaConfig = { austin: 60, dallas: 60, other: 60 };

        // Counties
        this.austin_counties = ['Mclennan County', 'Travis County', 'Williamson County', 'Hays County', 'Bastrop County', 'Bell County'];
        this.dallas_counties = ['Dallas County', 'Collin County', 'Tarrant County', 'Denton County', 'Rockwall County'];
        this.sanantonio_counties =  [
            'Bexar County',
            'Comal County',
            'Guadalupe County',
            'Wilson County',
            'Atascosa County',
            'Medina County',
            'Kendall County',
            'Bandera County',
            'Blanco County',
            'Hays County',
            'Caldwell County',
            'Gonzales County'
        ];

        // Tracking
        this.po_number_global = [];
        this.serverBaseUrl = null;

        // Extension path
        this.extensionPath = path.resolve('./bmw-group-sso-urgently');
    }

    // Helper function to sleep
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Helper function to take screenshots
    async takeScreenshot(page, name) {
        try {
            // const screenshotDir = path.join(process.cwd(), 'screenshots');
            const screenshotDir = path.join(process.cwd(), 'web-control/public/screenshots');``
            await fs.mkdir(screenshotDir, { recursive: true });
            
            // const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${name}.png`;
            const filepath = path.join(screenshotDir, filename);
            
            await page.screenshot({ 
                path: filepath,
                fullPage: true 
            });
            
            // console.log(`Screenshot saved: ${filepath}`);
            return filepath;
        } catch (error) {
            console.error(`Error taking screenshot ${name}:`, error);
            return null;
        }
    }

    // Get server URL
    async getServerUrl() {
        if (this.serverBaseUrl) return this.serverBaseUrl;
        
        try {
            const localUrl = 'http://localhost:3003';
            const response = await fetch(`${localUrl}/api/server-url`);
            if (!response.ok) throw new Error('Failed to fetch server URL');
            const { url } = await response.json();
            this.serverBaseUrl = url;
            return url;
        } catch (error) {
            console.error('Error fetching server URL:', error);
            return 'http://localhost:3003';
        }
    }

    // Get ETA configuration
    async getEtaConfig() {
        try {
            const baseUrl = await this.getServerUrl();
            const response = await fetch(`${baseUrl}/api/config/eta`);
            if (!response.ok) throw new Error('Failed to fetch ETA config');
            this.etaConfig = await response.json();
            return this.etaConfig;
        } catch (error) {
            console.error('Error fetching ETA config:', error);
            return this.etaConfig;
        }
    }

    // Get assign job configuration
    async getAssignJobConfig() {
        try {
            const baseUrl = await this.getServerUrl();
            const response = await fetch(`${baseUrl}/api/config/assignJobMultipleTimes`);
            if (!response.ok) throw new Error('Failed to fetch config');
            return await response.json();
        } catch (error) {
            console.error('Error fetching assignJobMultipleTimes config:', error);
            return { enabled: false, duration: 30, interval: 1000 };
        }
    }

    // Check if job should be assigned
    async isAssignJob(address, zip, serviceId) {
        let location;
        const geocodeHost = process.env.GEOCODE_HOST || process.env.GEOCODE_URL || 'http://38.114.122.151:9096';
        let url = `${geocodeHost}/geocode?address=${encodeURIComponent(address)}&zip=${encodeURIComponent(zip)}`;
        const apiKey = process.env.GEOCODE_API_KEY || process.env.API_KEY;
        const fetchOptions = apiKey ? { headers: { 'api-key': apiKey } } : {};
        let result = await fetch(url, fetchOptions);
        location = await result.json();
        console.log("///// location from isAssignJob //////", location);
      
        if (this.austin_counties.includes(location.county)) {
            url = "http://localhost:3003/location?place=Austin";
            result = await fetch(url);
            result = await result.json();
            let isAustin = result.enabled;
            
            if (isAustin && serviceId == 2001) {
                console.log("Assign Job");
                return { status: true, location: location };
            } else {
                console.log("No Job Assignment");
                return { status: false, location: location };
            }
        } else if (this.dallas_counties.includes(location.county)) {
            url = "http://localhost:3003/location?place=Dallas";
            result = await fetch(url);
            result = await result.json();
            let isDallas = result.enabled;
            
            if (isDallas && serviceId == 2001) {
                console.log("Assign Job");
                return { status: true, location: location };
            } else {
                console.log("No Job Assignment");
                return { status: false, location: location };
            }
        } else if (this.sanantonio_counties.includes(location.county)) {

        console.log("#################################################")
        console.log("This Job is from San antonio, No assignment");
        console.log("#################################################")
        return { status: false, location: location };
        
        } else {
                console.log("Assign Job");
                return { status: true, location: location };
            }
        }


    // // Extract job information
    // extractJobInfo(obj) {
    //     return {
    //         id: obj.caseDTO?.id,
    //         poNumber: obj.poNumber || obj.service?.number,
    //         status: obj.service?.status || obj.provider?.status,
    //         statusDescription: obj.service?.statusDescription,
    //         address: obj.location?.address,
    //         zip: obj.location?.zipCode,
    //         timestamp: new Date().toISOString()
    //     };
    // }

     // // Extract job information
    async extractJobInfo(obj) {
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
        vin_number: obj?.vehicle?.vin ?? null,
        note:"This is processed from HP.local"
        };
    }


    // Assign job
    async assignJob(poNumber, auth_token, jobInfo, location, saveToSupabase = true) {
        await this.getEtaConfig();
        
        const isAustinCounty = this.austin_counties.includes(location?.county);
        const isDallasCounty = this.dallas_counties.includes(location?.county);
        
        let eta;
        if (isAustinCounty) {
            eta = this.etaConfig.austin || 60;
        } else if (isDallasCounty) {
            eta = this.etaConfig.dallas || 60;
        } else {
            eta = this.etaConfig.other || 60;
        }

        console.log("#### ETA ####",eta)
        console.log("#### isAustinCounty ####", isAustinCounty)
        console.log("#### isDallasCounty ####", isDallasCounty)
        const assignUrl = `${this.BASE_URL}/${poNumber}/assign?providerId=${this.PROVIDER_ID}&truckId=${this.TRUCK_ID}&eta=${eta}`;

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
        
            // Check if response is ok first, then consume body appropriately
            if (response.ok) {
                const result = await response.json();
                console.log('Response body:', JSON.stringify(result));
                console.log(`Job ${poNumber} assigned successfully:`, result);
                
                // Only save to Supabase if saveToSupabase is true
                if (saveToSupabase) {
                    // Prepare job data for Supabase
                    const jobData = {
                      po: poNumber,
                      job: jobInfo || {},
                      status: 'Job assigned successfully',
                    };

                    try {
                        // Insert into Supabase
                        const { data, error } = await this.supabase
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
                }
                
                return { success: true, data: result };
            } else {
                const errorText = await response.text();
                console.log('Response body:', errorText);
                console.error(`Failed to assign job ${poNumber}:`, response.status, errorText);
                
                // Only save to Supabase if saveToSupabase is true
                if (saveToSupabase) {
                    // Prepare job data for Supabase
                    const jobData = {
                      po: poNumber,
                      job: jobInfo || {},
                      status: errorText,
                    };

                    try {
                        // Insert into Supabase
                        const { data, error } = await this.supabase
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
                }
                
                return { success: false, error: errorText, status: response.status };
            }

        }
        catch (error) {
            console.error('Error in assignJob:', error);
            
            // Only save to Supabase if saveToSupabase is true
            if (saveToSupabase) {
                // Try to record the error in Supabase
                try {
                    const { error: supabaseError } = await this.supabase
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
            }
            
            return false;
        }
    }

    // Assign job multiple times
    async assignJobMultipleTimes(poNumber, auth_token, jobInfo, location, duration = 30, interval = 1000, saveToSupabase = false) {
        await this.getEtaConfig();
        
        const config = await this.getAssignJobConfig();
        
        if (!config.enabled) {
            console.log('assignJobMultipleTimes is disabled via web control. Performing single assignment.');
            const result = await this.assignJob(poNumber, auth_token, jobInfo, location, saveToSupabase);
            return {
                successCount: result.success ? 1 : 0,
                failCount: result.success ? 0 : 1,
                results: [result]
            };
        }

        const actualDuration = config.duration * 1000;
        const actualInterval = config.interval;
        
        console.log(`Starting assignJobMultipleTimes for ${actualDuration/1000} seconds with ${actualInterval}ms intervals`);
        console.log(`Supabase logging ${saveToSupabase ? 'ENABLED' : 'DISABLED'} for multiple attempts`);
        
        const results = [];
        let successCount = 0;
        let failCount = 0;
        
        const startTime = Date.now();
        
        while (Date.now() - startTime < actualDuration) {
            try {
                const result = await this.assignJob(poNumber, auth_token, jobInfo, location, saveToSupabase);
                results.push({
                    timestamp: new Date().toISOString(),
                    ...result
                });
                
                if (result.success) {
                    successCount++;
                } else {
                    failCount++;
                }
                
                console.log(`Attempt ${results.length}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
                
            } catch (error) {
                console.error('Error in assignJob attempt:', error);
                results.push({
                    timestamp: new Date().toISOString(),
                    success: false,
                    error: error.message
                });
                failCount++;
            }
            
            if (Date.now() - startTime < actualDuration) {
                await this.sleep(actualInterval);
            }
        }
        
        console.log(`assignJobMultipleTimes completed. Success: ${successCount}, Failed: ${failCount}`);
        
        return {
            successCount,
            failCount,
            results,
            duration: actualDuration,
            interval: actualInterval
        };
    }

    // Login function using Puppeteer
    async login() {
        try {
            console.log(chalk.yellow('Starting login process...'));
            console.log(`User: ${this.credentials.username}`);

            // Launch browser
            this.browser = await puppeteer.launch({
                headless: false,
                headless: true,
                args: [
                    `--disable-extensions-except=${this.extensionPath}`,
                    `--load-extension=${this.extensionPath}`,
                    '--start-maximized',
                    '--no-sandbox',
                    '--disable-setuid-sandbox'
                ],
                defaultViewport: null,
            });

            this.page = await this.browser.newPage();
            await this.page.goto('https://bmw.urgent.ly/portal/#/home');
            await this.page.setViewport({ width: 1620, height: 900 });
            await this.sleep(1000);
            await this.page.screenshot({ path: 'urgently.png' });

            // Take screenshots every 20 seconds without blocking the browser
            const interval = setInterval(() => {
                // Don't await here so it doesn't block the main thread
                this.takeScreenshot(this.page, 'latest');
                // console.log('Taking screenshot...');
            }, 2000);

            // Stop screenshots after 5 minutes
            setTimeout(() => {
                clearInterval(interval);
                setInterval(() => { 
                    // Don't await here so it doesn't block the main thread
                    this.takeScreenshot(this.page, 'latest');
                    console.log('Taking screenshot...');
                }, 20000);
                // console.log("Stopped taking screenshots.");
            }, 5 * 60 * 1000);




            try {
                // Attempt to login
                const username = await this.page.$$('xpath///*[@id="loginModal"]/div[3]/div/div/form/div[1]/div/div/input');
                if (username.length > 0) await username[0].click();
                await this.page.keyboard.type(this.credentials.username);

                const password = await this.page.$$('xpath//html/body/div/div/div[2]/div[3]/div/div/form/div[2]/div/div/input');
                if (password.length > 0) await password[0].click();
                await this.page.keyboard.type(this.credentials.password);

                const login = await this.page.$$('xpath//html/body/div/div/div[2]/div[3]/div/div/form/div[3]/div[1]/input');
                if (login.length > 0) await login[0].click();

                await this.sleep(15000);

                const mobile = await this.page.$$('xpath//html/body/div[1]/div[2]/content/ng-include/div[1]/div/a[3]');
                if (mobile.length > 0) await mobile[0].click();

                console.log(chalk.green('Login successful!'));
            } catch (e) {
                console.log(chalk.blue("Already logged in"));
                await this.sleep(20000);

                const mobile = await this.page.$$('xpath//html/body/div[1]/div[2]/content/ng-include/div[1]/div/a[3]');
                if (mobile.length > 0) await mobile[0].click();
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
                this.authTokenGlobal = auth_token;
                
                // Save cookies and auth token for future use
                const cookieData = {
                    data: [{
                        authToken: auth_token
                    }],
                    cookies: cookies0
                };
                
                await fs.writeFile('./cookies.json', JSON.stringify(cookieData, null, 2));
                await fs.writeFile('./auth-token.json', JSON.stringify({"authToken": auth_token,"timestamp": new Date().toISOString()}, null, 2));
                await updateToken(auth_token);

                console.log("Auth token saved successfully");
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

    // Setup response listeners
    setupResponseListeners() {
        if (!this.page) {
            console.error('Page not initialized. Call login() first.');
            return;
        }

        // Capture specific response packets
        this.page.on('response', async response => {
            try {
                const url = response.url();
                
                // Log jobs endpoint responses
                if (url.includes('https://ops-apis.urgent.ly/v3/ops/jobs')) {
                    try {
                        const responseBody = await response.json();
                        // console.log('\n');
                        // console.log('#'.repeat(80));
                        // console.log('#'.repeat(80));
                        // console.log('////// JOBS API RESPONSE //////');
                        // console.log('URL:', url);
                        // console.log('Status:', response.status());
                        // console.log('Response:', JSON.stringify(responseBody, null, 2));
                        // console.log('#'.repeat(80));
                        // console.log('#'.repeat(80));
                        // console.log('\n');
                    } catch (e) {
                        console.error('Error processing jobs response:', e);
                    }
                    return; // Don't save jobs responses to file
                }

                // Log PubNub subscribe responses
                if (url.match(/https:\/\/.*\.pndsn\.com\/v2\/subscribe\/.*/)) {
                    try {
                        const responseBody = await response.json();
                        // console.log('Response Body:', JSON.stringify(responseBody, null, 2));
                        
                        // Only process if we have messages
                        if (responseBody.m && responseBody.m[0] && responseBody.m[0].d && responseBody.m[0].d.message) {
                            try {
                                // console.log('Raw message:', responseBody.m[0].d.message);
                                let message;
                                try {
                                    message = JSON.parse(responseBody.m[0].d.message);
                                    // console.log('Parsed message:', JSON.stringify(message, null, 2));
                                } catch (parseError) {
                                    console.error('Failed to parse message:', parseError);
                                    return;
                                }
                                
                                // Extract all required fields
                                this.extractedData = {
                                    po_number: message.poNumber || message.service?.number,
                                    id: message.caseDTO?.id,
                                    status: message.service?.status || message.provider?.status,
                                    statusDescription: message.service?.statusDescription,
                                    address: message.location?.address,
                                    zip: message.location?.zipCode,
                                    timestamp: new Date().toISOString()
                                };
                                // console.log('Extracted Data:', JSON.stringify(this.extractedData, null, 2));

                                let serviceId = message.service?.serviceId;  
                                let type = message.service?.type || null;
                                
                                console.log('*'.repeat(60));
                                console.log("////// serviceId ///////\n", serviceId);
                                console.log('Status:', this.extractedData.status);
                                console.log("Service type", type);
                                serviceId == 2001 ? console.log("Towing Service Requested") : null;
                                console.log('*'.repeat(60));

                                if (this.extractedData.status === 1) {
                                    // Save message to message.json file
                                    try {
                                        const messageData = {
                                            message: JSON.parse(responseBody.m[0].d.message)
                                        };
                                        await fs.writeFile('./message.json', JSON.stringify(messageData, null, 2));
                                        console.log('Message saved to message.json');
                                    } catch (saveError) {
                                        console.error('Error saving message to file:', saveError);
                                    }

                                    if (serviceId == 2001) {
                                        console.log('Towing Service Requested');
                                    }

                                    try {
                                        const jobInfo = await this.extractJobInfo(message);
                                        console.log('#*'.repeat(60));
                                        console.log('Job Info:', JSON.stringify(jobInfo, null, 2));
                                        console.log('#*'.repeat(60));

                                        if (this.po_number_global.includes(this.extractedData.po_number)) {
                                            console.log('#*'.repeat(60));
                                            console.log('#*'.repeat(60));
                                            console.log('Job already processed');
                                            console.log('#*'.repeat(60));
                                            console.log('#*'.repeat(60));
                                        } else {
                                            const result = await this.isAssignJob(this.extractedData.address, this.extractedData.zip, serviceId);

                                            console.log('@@@@@@@@@@@@@@@ result from isAssignJob @@@@@@@@@@@@@@@@\n', result);
                                            
                                            if (result.status && jobInfo) {
                                                console.log('Assigning job...');
                                                
                                                if (type === 'RSA_ON_DEMAND') {
                                                    console.log('On-demand service');
                                                    console.log('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$')
                                                    console.log(this.extractedData.po_number)
                                                    console.log(this.authTokenGlobal)
                                                    console.log(jobInfo)
                                                    console.log(result.location)
                                                    console.log('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$')

                                                    // First assignment with Supabase logging enabled
                                                    await this.assignJob(this.extractedData.po_number, this.authTokenGlobal, jobInfo, result.location, true);
                                                    // Multiple attempts without Supabase logging to avoid duplicates
                                                    const multipleResult = await this.assignJobMultipleTimes(this.extractedData.po_number, this.authTokenGlobal, jobInfo, result.location, 30, 1000, false);
                                                    console.log(`Final results - Success: ${multipleResult.successCount}, Failed: ${multipleResult.failCount}`);
                                                } else if (type === 'RSA_SCHEDULED_SERVICE') {
                                                    console.log('Scheduled service');
                                                    await assignScheduledJob(this.extractedData.po_number, this.authTokenGlobal);
                                                    await assignScheduledJob0(this.extractedData.po_number, this.authTokenGlobal);
                                                } else {
                                                    console.log('Other service types or none');
                                                    // First assignment with Supabase logging enabled
                                                    await this.assignJob(this.extractedData.po_number, this.authTokenGlobal, jobInfo, result.location, true);
                                                    // Multiple attempts without Supabase logging to avoid duplicates
                                                    const multipleResult = await this.assignJobMultipleTimes(this.extractedData.po_number, this.authTokenGlobal, jobInfo, result.location, 30, 1000, false);
                                                    console.log(`Final results - Success: ${multipleResult.successCount}, Failed: ${multipleResult.failCount}`);
                                                }
                                            }
                                            
                                            this.po_number_global.push(this.extractedData.po_number);
                                        }
                                    } catch (e) {
                                        console.error('Error processing job info:', e);
                                    }
                                } else {
                                    console.log('Job is not in status 1, skipping assignment.');
                                }
                            } catch (parseError) {
                                console.error('Error parsing message data:', parseError);
                            }
                        }
                    } catch (e) {
                        console.error('Error processing PubNub response:', e);
                    }
                    return; // Don't save PubNub responses to file
                }
                
               
            } catch (error) {
                console.error('Error capturing cookies:', error);
            }
        });
    }

    // Cleanup function
    async cleanup() {
        console.log('Cleaning up...');
        if (this.browser) {
            try {
                await this.browser.close();
                console.log('Browser closed successfully');
            } catch (error) {
                console.error('Error closing browser:', error);
            }
        }
        process.exit(0);
    }

    // Main execution method
    async run() {
        try {
            // Load ETA configuration at startup
            await this.getEtaConfig();
            
            // First, login
            const loginSuccess = await this.login();
            if (!loginSuccess) {
                throw new Error('Login failed');
            }

            // Setup response listeners after successful login
            this.setupResponseListeners();

            // Keep the process running to listen for responses
            console.log('Automation is running. Listening for job assignments...');
            
            // Keep the process alive
            setInterval(() => {
                // Just a heartbeat to keep the process running
            }, 30000);

        } catch (error) {
            console.error('An error occurred:', error);
            await this.cleanup();
        }
    }
}

export default UrgentlyAutomation;
