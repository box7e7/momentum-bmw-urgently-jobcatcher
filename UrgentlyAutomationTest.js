import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import updateToken from './update_token.js'
import dotenv from 'dotenv';
import chalk from 'chalk';
import { assignScheduledJob, assignScheduledJob0 } from './assignScheduledJob.js';

dotenv.config();

// ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UrgentlyAutomationTest {
    constructor() {
        
        // Configuration
        this.BASE_URL = 'https://ops-apis.urgent.ly/v3/ops/jobs';
        this.PROVIDER_ID = 'd6164d60-abfb-44d1-af50-3af43c04f77b';
        this.TRUCK_ID = "cae988d2-cbe5-46bb-b066-89a4408aacaf";
        this.etaConfig = { austin: 60, dallas: 60, other: 60 };

        // Counties
        this.austin_counties = ['Mclennan County', 'Travis County', 'Williamson County', 'Hays County', 'Bastrop County', 'Bell County'];
        this.dallas_counties = ['Dallas County', 'Collin County', 'Tarrant County', 'Denton County', 'Rockwall County'];

        // Tracking
        this.po_number_global = [];
        this.serverBaseUrl = null;
        this.extractedData = null;

        // Test mode auth token (you can set this manually for testing)
        this.authTokenGlobal = process.env.TEST_AUTH_TOKEN || "test-auth-token";
    }

    // Helper function to sleep
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
        let url = `http://127.0.0.1:9093/geocode?address=${address}&zip=${zip}`;
        
        try {
            let result = await fetch(url);
            location = await result.json();
            console.log("///// location from isAssignJob //////", location);
        } catch (error) {
            console.error('Error fetching location data:', error);
            // Mock location data for testing
            location = {
                city: 'Test City',
                county: 'Test County',
                zip: zip,
                api: 'test call',
                state: 'Test State'
            };
        }
      
        if (this.austin_counties.includes(location.county)) {
            try {
                url = "http://localhost:3003/location?place=Austin";
                let result = await fetch(url);
                result = await result.json();
                let isAustin = result.enabled;
                
                if (isAustin && serviceId == 2001) {
                    console.log("Assign Job");
                    return { status: true, location: location };
                } else {
                    console.log("No Job Assignment");
                    return { status: false, location: location };
                }
            } catch (error) {
                console.error('Error checking Austin location:', error);
                return { status: true, location: location }; // Default to assign for testing
            }
        } else if (this.dallas_counties.includes(location.county)) {
            try {
                url = "http://localhost:3003/location?place=Dallas";
                let result = await fetch(url);
                result = await result.json();
                let isDallas = result.enabled;
                
                if (isDallas && serviceId == 2001) {
                    console.log("Assign Job");
                    return { status: true, location: location };
                } else {
                    console.log("No Job Assignment");
                    return { status: false, location: location };
                }
            } catch (error) {
                console.error('Error checking Dallas location:', error);
                return { status: true, location: location }; // Default to assign for testing
            }
        } else {
            console.log("Assign Job");
            return { status: true, location: location };
        }
    }

    // Extract job information
    extractJobInfo(obj) {
        return {
            id: obj.caseDTO?.id,
            poNumber: obj.poNumber || obj.service?.number,
            status: obj.service?.status || obj.provider?.status,
            statusDescription: obj.service?.statusDescription,
            address: obj.location?.address,
            zip: obj.location?.zipCode,
            timestamp: new Date().toISOString()
        };
    }

    // Assign job (with test mode option)
    async assignJob(poNumber, auth_token, jobInfo, location, testMode = false) {
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

        console.log("#### ETA ####", eta)
        console.log("#### isAustinCounty ####", isAustinCounty)
        console.log("#### isDallasCounty ####", isDallasCounty)
        const assignUrl = `${this.BASE_URL}/${poNumber}/assign?providerId=${this.PROVIDER_ID}&truckId=${this.TRUCK_ID}&eta=${eta}`;

        console.log("//// assign Job url ///", assignUrl)

        if (testMode) {
            console.log(chalk.yellow('TEST MODE: Simulating job assignment...'));
            
            // Simulate successful assignment for testing
            const mockResult = {
                data: ["Success"],
                poNumber: poNumber,
                status: "assigned",
                timestamp: new Date().toISOString()
            };

            console.log('Response body:', JSON.stringify(mockResult));
            console.log(`Job ${poNumber} assigned successfully (TEST MODE):`, mockResult);
            
            return { success: true, data: mockResult };
        }

        try {
            // Make the assign request (real mode)
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
                
                return { success: true, data: result };
            } else {
                const errorText = await response.text();
                console.log('Response body:', errorText);
                console.error(`Failed to assign job ${poNumber}:`, response.status, errorText);
                
                return { success: false, error: errorText, status: response.status };
            }

        } catch (error) {
            console.error('Error in assignJob:', error);
            return { success: false, error: error.message };
        }
    }

    // Assign job multiple times (with test mode option)
    async assignJobMultipleTimes(poNumber, auth_token, jobInfo, location, duration = 30, interval = 1000, testMode = false) {
        await this.getEtaConfig();
        
        const config = await this.getAssignJobConfig();
        
        if (!config.enabled) {
            console.log('assignJobMultipleTimes is disabled via web control. Performing single assignment.');
            const result = await this.assignJob(poNumber, auth_token, jobInfo, location, testMode);
            return {
                successCount: result.success ? 1 : 0,
                failCount: result.success ? 0 : 1,
                results: [result]
            };
        }

        const actualDuration = config.duration * 1000;
        const actualInterval = config.interval;
        
        console.log(`Starting assignJobMultipleTimes for ${actualDuration/1000} seconds with ${actualInterval}ms intervals`);
        
        const results = [];
        let successCount = 0;
        let failCount = 0;
        
        const startTime = Date.now();
        
        while (Date.now() - startTime < actualDuration) {
            try {
                const result = await this.assignJob(poNumber, auth_token, jobInfo, location, testMode);
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

    // Read message from message.json file
    async readMessageFromFile() {
        try {
            const messageData = await fs.readFile('./message.json', 'utf8');
            const parsedData = JSON.parse(messageData);
            return parsedData.message;
        } catch (error) {
            console.error('Error reading message.json:', error);
            return null;
        }
    }

    // Process message (similar to setupResponseListeners logic)
    async processMessage(message, testMode = false) {
        try {
            console.log(chalk.blue('Processing message from message.json...'));
            
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

            let serviceId = message.service?.serviceId;  
            let type = message.service?.type || null;
            
            console.log('*'.repeat(60));
            console.log("////// serviceId ///////\n", serviceId);
            console.log('Status:', this.extractedData.status);
            console.log("Service type", type);
            serviceId == 2001 ? console.log("Towing Service Requested") : null;
            console.log('*'.repeat(60));

            if (this.extractedData.status === 1) {
                if (serviceId == 2001) {
                    console.log('Towing Service Requested');
                }

                try {
                    const jobInfo = this.extractJobInfo(message);
                    console.log('#*'.repeat(60));
                    console.log('Job Info:', JSON.stringify(jobInfo, null, 2));
                    console.log('#*'.repeat(60));

                    if (this.po_number_global.includes(this.extractedData.po_number)) {
                        console.log('#*'.repeat(60));
                        console.log('#*'.repeat(60));
                        console.log('Job already processed');
                        console.log('#*'.repeat(60));
                        console.log('#*'.repeat(60));
                        return { processed: false, reason: 'Already processed' };
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

                                await this.assignJob(this.extractedData.po_number, this.authTokenGlobal, jobInfo, result.location, testMode);
                                const multipleResult = await this.assignJobMultipleTimes(this.extractedData.po_number, this.authTokenGlobal, jobInfo, result.location, 30, 1000, testMode);
                                console.log(`Final results - Success: ${multipleResult.successCount}, Failed: ${multipleResult.failCount}`);
                                
                                return { 
                                    processed: true, 
                                    type: 'RSA_ON_DEMAND',
                                    results: multipleResult 
                                };
                            } else if (type === 'RSA_SCHEDULED_SERVICE') {
                                console.log('Scheduled service');
                                if (!testMode) {
                                    await assignScheduledJob(this.extractedData.po_number, this.authTokenGlobal);
                                    await assignScheduledJob0(this.extractedData.po_number, this.authTokenGlobal);
                                } else {
                                    console.log(chalk.yellow('TEST MODE: Simulating scheduled job assignment...'));
                                }
                                
                                return { 
                                    processed: true, 
                                    type: 'RSA_SCHEDULED_SERVICE' 
                                };
                            } else {
                                console.log('Other service types or none');
                                await this.assignJob(this.extractedData.po_number, this.authTokenGlobal, jobInfo, result.location, testMode);
                                const multipleResult = await this.assignJobMultipleTimes(this.extractedData.po_number, this.authTokenGlobal, jobInfo, result.location, 30, 1000, testMode);
                                console.log(`Final results - Success: ${multipleResult.successCount}, Failed: ${multipleResult.failCount}`);
                                
                                return { 
                                    processed: true, 
                                    type: 'OTHER',
                                    results: multipleResult 
                                };
                            }
                        } else {
                            return { processed: false, reason: 'Job assignment not allowed or missing jobInfo' };
                        }
                        
                        this.po_number_global.push(this.extractedData.po_number);
                    }
                } catch (e) {
                    console.error('Error processing job info:', e);
                    return { processed: false, reason: `Error: ${e.message}` };
                }
            } else {
                console.log('Job is not in status 1, skipping assignment.');
                return { processed: false, reason: 'Status is not 1' };
            }
        } catch (error) {
            console.error('Error processing message:', error);
            return { processed: false, reason: `Processing error: ${error.message}` };
        }
    }

    // Main test method
    async runTest(testMode = true) {
        try {
            console.log(chalk.green('Starting UrgentlyAutomation Test...'));
            console.log(chalk.yellow(`Test Mode: ${testMode ? 'ENABLED' : 'DISABLED'}`));
            
            // Load ETA configuration at startup
            await this.getEtaConfig();
            
            // Read message from file
            const message = await this.readMessageFromFile();
            
            if (!message) {
                console.error(chalk.red('No message found in message.json file'));
                return;
            }
            
            console.log(chalk.blue('Message loaded from message.json:'));
            console.log(JSON.stringify(message, null, 2));
            
            // Process the message
            const result = await this.processMessage(message, testMode);
            
            console.log(chalk.green('Test completed!'));
            console.log('Result:', JSON.stringify(result, null, 2));
            
            return result;
            
        } catch (error) {
            console.error(chalk.red('Test failed:'), error);
            return { processed: false, reason: `Test error: ${error.message}` };
        }
    }
}

export default UrgentlyAutomationTest;
