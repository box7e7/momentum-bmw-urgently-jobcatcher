// Keep service worker alive using Chrome alarms API



const BASE_URL = 'https://ops-apis.urgent.ly/v3/ops/jobs';
const PROVIDER_ID = 'd6164d60-abfb-44d1-af50-3af43c04f77b';
let TRUCK_ID = '09e075c8-fcde-47c9-9101-a32d59c1c266';
TRUCK_ID = "cae988d2-cbe5-46bb-b066-89a4408aacaf"
const ETA_MINUTES = 60;



let isAssignJob=async function(address,zip,serviceId){
  let austin_counties = ['Mclennan County', 'Travis County', 'Williamson County', 'Hays County', 'Bastrop County', 'Bell County'];

  
  let url = `http://127.0.0.1:9093/geocode?address=${address}&zip=${zip}`;
  let result=await fetch(url)
  result=await result.json()
  console.log(result)

  if(austin_counties.includes(result.county)) {
      url="http://localhost:3003/location?place=Austin"
      result=await fetch(url)
      result=await result.json()
      let isAustin=result.enabled
      // console.log(isAustin)
      if(isAustin && serviceId==2001){
          console.log("Assign Job")
          return true
      }
      else{
          console.log("No Job Assignment")
          return false
      }
  }
  else{
      console.log("Assign Job")
      return true
  }

}


async function assignJob(poNumber,auth_token) {
 
  const assignUrl = `${BASE_URL}/${poNumber}/assign?providerId=${PROVIDER_ID}&truckId=${TRUCK_ID}&eta=${ETA_MINUTES}`;
  
  try {
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
      console.log('Response headers:', Object.fromEntries(response.headers));
      console.log('Response body:', responseData);
      
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}, body: ${responseData}`);
      }
      
      console.log('Job assigned successfully');
      return true;
  } catch (error) {
      console.error('Error assigning job:', error);
      return false;
  }
}




function isJWTExpired(token) {
  try {
      // Extract the payload part of the JWT (second part)
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // Get current timestamp in seconds (JWT exp is in seconds)
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Compare with current time (both are in UTC)
      const isExpired = currentTime >= payload.exp;
      
      // For display purposes, convert both times to Central Time
      console.log(`Token expires at: ${new Date(payload.exp * 1000).toLocaleString('en-US', { timeZone: 'America/Chicago' })}`);
      console.log(`Current time (CT): ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}`);
      console.log(`Token is ${isExpired ? 'expired' : 'valid'}`);
      
      return isExpired;
  } catch (error) {
      console.error('Error checking JWT expiration:', error);
      return true; // Assume expired if there's an error parsing
  }
}






const currentMoment = function () {
  const currentDate = new Date();
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };
  return currentDate.toLocaleString('en-US', options);
};

// Function to attach debugger and enable network tracking
async function attachDebugger(tab) {
  if (tab.url && tab.url.startsWith('chrome:')) return;
  if (activeDebuggers.has(tab.id)) {
    console.log('Debugger already attached to tab:', tab.id);
    return;
  }
  
  const debuggeeId = { tabId: tab.id };
  
  // Now attach the debugger
  console.log('Attaching debugger to tab:', tab.id);
  
  try {
    await new Promise((resolve, reject) => {
      chrome.debugger.attach(debuggeeId, '1.0', () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          activeDebuggers.add(tab.id);
          resolve();
        }
      });
    });
    
    console.log('Debugger attached to tab:', tab.id);
    
    // Enable network tracking
    await new Promise((resolve, reject) => {
      chrome.debugger.sendCommand(
        debuggeeId,
        'Network.enable',
        {},
        () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            console.log('Network tracking enabled for tab:', tab.id);
            resolve();
          }
        }
      );
    });
  } catch (error) {
    console.error('Error in attachDebugger:', error.message);
  }
}

// Attach debugger when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed - initializing monitoring');
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(attachDebugger);
  });
});

// Attach debugger to new tabs
let debuggeeId = null;
let tabId = null;

// Listen for cookies from content script
chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.type === 'PAGE_COOKIES') {
        // Store cookies in extension storage
        chrome.storage.local.set(message.cookies, () => {
            console.log('🔑 Stored cookies in extension storage:', message.cookies);
        });
    }
});
chrome.tabs.onCreated.addListener((tab) => {
  attachDebugger(tab).catch(console.error);
});

// Reattach debugger when tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    attachDebugger(tab).catch(console.error);
  }
});

// Initialize service worker and keep it alive using Chrome alarms API
chrome.runtime.onInstalled.addListener(() => {
  // Create the keep-alive alarm
  chrome.alarms.create('keepAlive', { periodInMinutes: 0.5 });
  console.log('Keep-alive alarm created');
  
  // Initial debugger setup - only done once at install
  chrome.tabs.query({}, async (tabs) => {
    for (const tab of tabs) {
      await attachDebugger(tab);
    }
  });
});

// Keep-alive heartbeat that doesn't touch debugger connections
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    // Simple heartbeat to keep service worker alive
    console.log('Service worker heartbeat:', new Date().toISOString());
  }
});

// Handle network events from debugger
chrome.debugger.onEvent.addListener((source, method, params) => {
  // Only process Network events
  if (!method.startsWith('Network.')) return;

  if (method === 'Network.responseReceived') {
    const { requestId, response } = params;
    const urlMatch = response.url.match(/^https?:\/\/([^/]+)/);
    if (!urlMatch) return;
    
    const domain = urlMatch[1];
    
    // Check if this is a PubNub response
    if (domain.includes('pndsn.com') && response.url.includes('/v2/subscribe/')) {
      console.log('PubNub subscribe response detected, getting auth_token...');
      
      // Get auth_token from storage
      chrome.storage.local.get(['auth_token'], (result) => {
        if (result.auth_token) {
          auth_token = result.auth_token;
          console.log('🔑 Retrieved auth_token from storage:', auth_token);
          isJWTExpired(auth_token)
        } else {
          console.log('❗ No auth_token found in storage');
        }
      });
    }
    
    if (!domain.includes('bmwgroup.com') && 
        !domain.includes('urgent.ly') && 
        !domain.includes('pndsn.com')) return;

    console.log('Response intercepted:', {
      url: response.url,
      method: response.method,
      status: response.status,
      requestId
    });

    // Get the response body
    chrome.debugger.sendCommand(
      { tabId: source.tabId },
      'Network.getResponseBody',
      { requestId: requestId },
      (responseBody) => {
        if (chrome.runtime.lastError) {
          console.error('Failed to get response body:', {
            url: response.url,
            error: chrome.runtime.lastError.message,
            requestId,
            tabId: source.tabId
          });
          return;
        }
        
        if (responseBody) {
          // Parse and display the response body
          try {
            const parsedBody = responseBody.base64Encoded ? 
              atob(responseBody.body) : responseBody.body;


              // //////////////////////// extract from this response body ////////////////////////
              try {
                let message = JSON.parse(parsedBody.toString())['m'][0]["d"]["message"];

                console.log('*'.repeat(60));
                console.log('*'.repeat(60));
                console.log('*'.repeat(60));
                console.log("////// message ///////\n", message);
                console.log('*'.repeat(60));
                console.log('*'.repeat(60));
                console.log('*'.repeat(60));

                let po_number = JSON.parse(message)['service']['number'];
                console.log('*'.repeat(60));
                console.log("////// po_number ///////\n", po_number);
                console.log('*'.repeat(60));
          
                
                let id = JSON.parse(message)['caseDTO']['id'];
                console.log('*'.repeat(60));
                console.log("////// id /////////\n", id);
                console.log('*'.repeat(60));

                let status = JSON.parse(message)['service']["status"];
                try {
                  !status ? status = JSON.parse(message)['provider']['status'] : null;
                } catch (error) {
                  console.error('Failed to parse status:', error);
                }
                console.log('*'.repeat(60));
                console.log("////// status ///////\n", status);
                console.log('*'.repeat(60));

                let serviceId=JSON.parse(message)['service']['serviceId'];  
                console.log('*'.repeat(60));
                console.log("////// serviceId ///////\n", serviceId);
                serviceId==2001 ? console.log("Twoing Service Requested") : null;
                console.log('*'.repeat(60));
               

               



           
                let address = JSON.parse(message)['location']['address'];
                console.log('*'.repeat(60));
                console.log("////// address ///////\n", address);
                console.log('*'.repeat(60));
              
                let zip = JSON.parse(message)['location']['zipCode'];
                console.log('*'.repeat(60));
                console.log("////// zip ////////\n", zip);
                console.log('*'.repeat(60));
               
                let zipDropOff = null;
                let statusDescription = JSON.parse(message)['service']["statusDescription"];
                let timestamp = currentMoment();
        
        
                console.log('*'.repeat(60));
                console.log('*'.repeat(60));
                console.log('*'.repeat(60));
                console.log("////// address ///////\n", address);
                console.log("////// zip ////////\n", zip);
                console.log("////// id /////////\n", id);
                console.log("///// PO number /////\n", po_number);
                console.log('*'.repeat(60));
                console.log('*'.repeat(60));
                console.log('*'.repeat(60));
        
                if (status) {
                 
                  if (status == 1 || status == 1000) {
                    console.log("##########################################################");
                    console.log("##################### Assign Job #########################");
                    console.log("##########################################################");

               
                    (async () => {
                      try {
                          console.log('#'.repeat(60));
                          console.log('PO number:', po_number);
                          console.log('#'.repeat(60));
                          console.log('Received request for cookies from background worker');

                          // Get auth_token from extension storage
                          chrome.storage.local.get(['auth_token'], async (result) => {
                              if (result.auth_token) {
                                  console.log('🔑 Using auth_token from storage:', result.auth_token);
                                  isJWTExpired(result.auth_token)
                                  let state=await isAssignJob(address,zip,serviceId)
                                  if(state){
                                    await assignJob(po_number, result.auth_token);
                                  }
                              } else {
                                  console.log('❗ No auth_token available in storage');
                              }
                          });
                          
                          let state1=await isAssignJob(address,zip,serviceId)
                          if(state1){
                            await assignJob(po_number, auth_token);
                          }
                      
                      } catch (error) {
                          console.error('Error:', error);
                        
                      }
                  })();



                   

                   
                    
                  }
                }
        
        
        
              } catch (error) {
                console.error('Failed to parse PubNub message:', error);
              }

              // //////////////////////////////// end extract ////////////////////////////////////
            
            console.log('Response Body:', {
              url: response.url,
              status: response.status,
              headers: response.headers,
              body: parsedBody,
              requestId,
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            console.error('Failed to parse response:', {
              url: response.url,
              error: error.message,
              requestId
            });
          }
        }
      }
    );
  }
});

// Track active debugger connections
const activeDebuggers = new Set();

// Handle debugger detach
chrome.debugger.onDetach.addListener((source, reason) => {
  const tabId = source.tabId;
  console.log(`Debugger detached from tab ${tabId}, reason: ${reason}`);
  activeDebuggers.delete(tabId);

  // If this wasn't an intentional detachment (like tab closing), reattach
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      // Tab doesn't exist anymore, no need to reattach
      return;
    }
    console.log(`Attempting to reattach debugger to tab ${tabId}`);
    attachDebugger(tab).catch(console.error);
  });
});

// Function to format request body data
function formatRequestBody(requestBody) {
  if (!requestBody) return null;
  if (requestBody.raw) {
    return Array.from(requestBody.raw).map(chunk => {
      try {
        return new TextDecoder().decode(chunk.bytes);
      } catch (e) {
        return '[Binary Data]';
      }
    }).join('');
  }
  if (requestBody.formData) {
    return requestBody.formData;
  }
  return null;
}

// Monitor request headers
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    console.log('Request Headers:', {
      url: details.url,
      method: details.method,
      requestId: details.requestId,
      timestamp: new Date().toISOString(),
      headers: details.requestHeaders
    });
    return { requestHeaders: details.requestHeaders };
  },
  { urls: [
    "https://auth.bmwgroup.com/*",
    "https://sgate.bmwgroup.com/*",
    "https://*.bmwgroup.com/*",
    "https://*.urgent.ly/*",
    "https://bmw.urgent.ly/*",
    "https://portal.urgent.ly/*",
    "https://api.urgent.ly/*",
    "https://*.pndsn.com/v2/subscribe/*"
  ]},
  ["requestHeaders"]
);

// Monitor response headers
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    console.log('Response Headers:', {
      url: details.url,
      method: details.method,
      statusCode: details.statusCode,
      statusLine: details.statusLine,
      requestId: details.requestId,
      timestamp: new Date().toISOString(),
      headers: details.responseHeaders
    });
    return { responseHeaders: details.responseHeaders };
  },
  { urls: [
    "https://auth.bmwgroup.com/*",
    "https://sgate.bmwgroup.com/*",
    "https://*.bmwgroup.com/*",
    "https://*.urgent.ly/*",
    "https://bmw.urgent.ly/*",
    "https://portal.urgent.ly/*",
    "https://api.urgent.ly/*",
    "https://*.pndsn.com/v2/subscribe/*"
  ]},
  ["responseHeaders"]
);

// Monitor request body
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    console.log('Request Body:', {
      url: details.url,
      method: details.method,
      requestId: details.requestId,
      timestamp: new Date().toISOString(),
      body: formatRequestBody(details.requestBody)
    });
    return { cancel: false };
  },
  { urls: [
    "https://auth.bmwgroup.com/*",
    "https://sgate.bmwgroup.com/*",
    "https://*.bmwgroup.com/*",
    "https://*.urgent.ly/*",
    "https://bmw.urgent.ly/*",
    "https://portal.urgent.ly/*",
    "https://api.urgent.ly/*",
    "https://*.pndsn.com/v2/subscribe/*"
  ]},
  ["requestBody"]
);

// Monitor response headers for PubNub
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.url.includes('pndsn.com/v2/subscribe/')) {
      console.log('PubNub Response Headers:', {
        url: details.url,
        statusCode: details.statusCode,
        statusLine: details.statusLine,
        requestId: details.requestId,
        timestamp: new Date().toISOString(),
        headers: details.responseHeaders
      });
    }
    return { responseHeaders: details.responseHeaders };
  },
  { urls: [
    "https://auth.bmwgroup.com/*",
    "https://sgate.bmwgroup.com/*",
    "https://*.bmwgroup.com/*",
    "https://*.urgent.ly/*",
    "https://bmw.urgent.ly/*",
    "https://portal.urgent.ly/*",
    "https://api.urgent.ly/*",
    "https://*.pndsn.com/v2/subscribe/*"
  ]},
  ["responseHeaders", "extraHeaders"]
);

// Monitor response completion for PubNub
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.url.includes('pndsn.com/v2/subscribe/')) {
      console.log('PubNub Request Completed:', {
        url: details.url,
        statusCode: details.statusCode,
        requestId: details.requestId,
        timestamp: new Date().toISOString(),
        fromCache: details.fromCache
      });
    }
  },
  { urls: [
    "https://auth.bmwgroup.com/*",
    "https://sgate.bmwgroup.com/*",
    "https://*.bmwgroup.com/*",
    "https://*.urgent.ly/*",
    "https://bmw.urgent.ly/*",
    "https://portal.urgent.ly/*",
    "https://api.urgent.ly/*",
    "https://*.pndsn.com/v2/subscribe/*"
  ]}
);

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url === 'chrome://newtab/' || changeInfo.url === '') {
    setTimeout(() => {
      chrome.tabs.get(tabId, (currentTab) => {
        if (chrome.runtime.lastError) return;
        
        if (currentTab.url === 'chrome://newtab/' || currentTab.url === '') {
          chrome.tabs.update(tabId, { url: BMW_AUTH_URL });
        }
      });
    }, 5000); // 5 seconds timeout
  }
});
