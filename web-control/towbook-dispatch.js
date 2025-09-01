import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import { data as bodyData } from './data0.js';
// import { data as bodyData } from './data0_completed.js';
import { getJobDetails, getCaseDetails, getAuthToken, extractJobInfo } from './getJobDetails.js';

let cookiesFileName = "./cookies_towbook18.json";

async function processCookies(cookies) {
  const cookieArguments = [
    'ai_user',
    '_ga',
    '_gid',
    '_gauges_unique_month',
    '_gauges_unique_year',
    '_gauges_unique',
    'intercom-device-id-kw06m3f5',
    'ASP.NET_SessionId',
    '.xtl',
    'X-Session-Timeout',
    '_gauges_unique_hour',
    '_gauges_unique_day',
    '_ga_14VZ8Q91JJ',
    'intercom-session-kw06m3f5',
    'ai_session'
  ];

  let NET_SessionId, intercom_session, xtl, X_Session_Timeout;
    
  for (const cookie of cookies) {
    switch (cookie.name) {
      case 'ASP.NET_SessionId':
        NET_SessionId = cookie.value;
        break;
      case 'intercom-session-kw06m3f5':
        intercom_session = cookie.value;
        break;
      case '.xtl':
        xtl = cookie.value;
        break;
      case 'X-Session-Timeout':
        X_Session_Timeout = cookie.value;
        break;
    }
  }
    
  return `ASP.NET_SessionId=${NET_SessionId}; intercom-session-kw06m3f5=${intercom_session}; .xtl=${xtl}; X-Session-Timeout=${X_Session_Timeout}`;
}

async function updateRequestBody(body, jsonData, additionalArgument){
  const data = { ...body };
  
  data.contacts[0].name = jsonData["customer"];
  data.contacts[0].phone = jsonData["phone"];

  let price = jsonData["price"];
  if (!price || price === 0) {
    price = "0";
  }
  const cleanPrice = price;
  
  data.invoiceSubtotal = cleanPrice;
  data.invoiceTotal = cleanPrice;
  data.invoiceItems[0].price = cleanPrice;
  data.invoiceItems[0].itemTotal = cleanPrice;

  data.towSource = jsonData["pickup_location"];
  data.towDestination = jsonData["drop_off"];
  data.waypoints[0].address = jsonData["pickup_location"];
  data.waypoints[1].address = jsonData["drop_off"];
  data.assets[0].make = jsonData["vehicle"];
//   data["completionTime"] = jsonData["completionTime"];
  
  if (jsonData["vin_number"]) {
    data.assets[0].vin = jsonData["vin_number"];
  }
  
  data.notes = additionalArgument;
  data.account.id = 4013325;
  data.reason.id = 6;
  data.attributes[0].value = jsonData["po_number"];

  return data;
}

async function sendTowbookRequest(cookieString, requestBody) {
  const response = await fetch('https://app.towbook.com/api/calls/?deleteMissingAssets=true', {
    method: 'POST',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9',
      'Connection': 'keep-alive',
      'Cookie': cookieString,
      'Host': 'app.towbook.com',
      'Origin': 'https://app.towbook.com'
    },
    body: JSON.stringify(requestBody)
  });

  console.log('Towbook Response Headers:', { ...response.headers });
  return await response.text();
}

async function checkpoNumber(poNumber) {
  try {
    // Read and parse cookies
    const cookiesString = await fs.readFile(cookiesFileName);
    const cookies = JSON.parse(cookiesString);
    
    // Process cookies
    const cookieString = await processCookies(cookies);
    console.log('Cookie string for search:', cookieString);
    
    const response = await fetch(`https://app.towbook.com/api/calls/Search?page=1&quick=${poNumber}`, {
      method: 'GET',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Cookie': cookieString,
        'Host': 'app.towbook.com',
        'Origin': 'https://app.towbook.com'
      }
    });

    return await response.json();

  } catch (error) {
    console.error('Error in checkpoNumber:', error);
    throw error;
  }
}

async function dispatchTowbookInternal(jsonData, additionalArgument) {
  try {
    // Read and parse cookies
    const cookiesString = await fs.readFile(cookiesFileName);
    const cookies = JSON.parse(cookiesString);
    
    // Process cookies
    const cookieString = await processCookies(cookies);
    console.log('Cookie string for dispatch:', cookieString);

    // Update request body with job data
    const requestBody = await updateRequestBody(bodyData, jsonData, additionalArgument);
    
    // Send request to Towbook
    const result = await sendTowbookRequest(cookieString, requestBody);
    
    return result;
  } catch (error) {
    console.error('Error in dispatchTowbookInternal:', error);
    throw error;
  }
}

/**
 * Main dispatch function that handles the complete workflow
 * @param {string|number} poNumber - The PO number to dispatch
 * @returns {Object} - Result object with success status and details
 */
async function dispatchToTowbook(poNumber, forceCreate = false) {
  try {
    console.log(`Starting dispatch process for PO ${poNumber}...`);
    
    // Step 1: Get auth token and check if expired
    console.log('Step 1: Getting auth token...');
    const { token, isExpired } = await getAuthToken();
    
    if (!token) {
      throw new Error('Failed to retrieve auth token');
    }
    
    if (isExpired) {
      throw new Error('Auth token is expired - cannot proceed with dispatch');
    }
    
    // Step 2: Get job details from Urgently
    console.log(`Step 2: Fetching job details for PO ${poNumber}...`);
    const jobDetailsResponse = await getJobDetails(poNumber, token);
    
    
    if (!jobDetailsResponse || !jobDetailsResponse.data || jobDetailsResponse.data.length === 0) {
      throw new Error(`No job data found for PO ${poNumber}`);
    }
    
    // Step 3: Extract job information
    console.log('Step 3: Extracting job information...');
    const jobInfo = extractJobInfo(jobDetailsResponse.data[0]);

     if(!jobInfo.drop_off){
      console.log("Drop off address is null trying getCaseDetails function to get drop off Address.......")
      let caseDetails= await getCaseDetails(jobInfo.caseDTO,token)
      let dropoff_address=caseDetails?.jobs[0]?.dropOffLocation?.address
      if(dropoff_address){
      jobInfo.drop_off=dropoff_address
      }
    }


    // console.log(jobInfo)
    
    if (!jobInfo.po_number) {
      throw new Error('Invalid job data - missing PO number');
    }
    
    console.log('Extracted job info:', jobInfo);
    
    // Step 4: Check if job already exists in Towbook
    console.log(`Step 4: Checking if PO ${poNumber} already exists in Towbook...`);
    const existingJobs = await checkpoNumber(poNumber);
    
    if (!forceCreate && existingJobs && existingJobs.length > 0) {
      return {
        success: false,
        message: `Job with PO ${poNumber} already exists in Towbook.`,
        jobExists: true, // Flag to indicate job exists
        timestamp: new Date().toISOString(),
        poNumber: poNumber,
        existingJobs: existingJobs.length
      };
    }
    
    // Step 5: Dispatch to Towbook
    console.log(`Step 5: Dispatching PO ${poNumber} to Towbook...`);
    const dispatchResult = await dispatchTowbookInternal(jobInfo, "");
    
    // Step 6: Parse and validate result
    let parsedResult;
    try {
      parsedResult = JSON.parse(dispatchResult);
    } catch (parseError) {
      console.error('Failed to parse dispatch result:', parseError);
      throw new Error('Invalid response from Towbook API');
    }
    
    if (parsedResult && parsedResult.id) {
      return {
        success: true,
        message: `Successfully dispatched PO ${poNumber} to Towbook`,
        timestamp: new Date().toISOString(),
        poNumber: poNumber,
        towbookId: parsedResult.id,
        jobInfo: jobInfo,
        dispatchResult: parsedResult
      };
    } else {
      return {
        success: false,
        message: `Failed to dispatch PO ${poNumber} to Towbook - No ID returned`,
        timestamp: new Date().toISOString(),
        poNumber: poNumber,
        jobInfo: jobInfo,
        dispatchResult: parsedResult
      };
    }
    
  } catch (error) {
    console.error(`Error dispatching PO ${poNumber}:`, error);
    
    return {
      success: false,
      message: `Failed to dispatch PO ${poNumber}: ${error.message}`,
      timestamp: new Date().toISOString(),
      poNumber: poNumber,
      error: error.message,
      stack: error.stack
    };
  }
}

export { dispatchToTowbook, checkpoNumber, dispatchTowbookInternal as dispatchTowbook };
