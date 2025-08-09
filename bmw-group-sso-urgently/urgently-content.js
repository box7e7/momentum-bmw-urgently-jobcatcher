const BASE_URL = 'https://ops-apis.urgent.ly/v3/ops/jobs';
const PROVIDER_ID = 'd6164d60-abfb-44d1-af50-3af43c04f77b';
const TRUCK_ID = '09e075c8-fcde-47c9-9101-a32d59c1c266';
const ETA_MINUTES = 40;

async function assignJob(poNumber) {
    let auth_token = document.cookie.split(';').find(cookie => cookie.startsWith('auth_token='));
    auth_token = auth_token.replace(/%22/g,"")
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
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        console.log('Job assigned successfully');
        return true;
    } catch (error) {
        console.error('Error assigning job:', error);
        return false;
    }
}

// Function to get cookies and send to background script
function sendCookiesToBackground() {
    const cookies = document.cookie.split('; ');
    let auth_token = null;
    
    for (const cookie of cookies) {
        if (cookie.startsWith('auth-token=')) {
            auth_token = cookie.split('=')[1].replace(/%22/g, '');
            console.log('🔑 Found auth_token:', auth_token);
            break;
        }
    }

    if (auth_token) {
        console.log('🔑 Found auth_token, sending to background');
        chrome.runtime.sendMessage({ 
            type: 'PAGE_COOKIES', 
            cookies: {
                auth_token: auth_token
            }
        });
        return true; // Signal that we found and sent the token
    } else {
        console.log('❗ No auth_token found in cookies');
        return false; // Signal that we didn't find the token
    }
}

// Function to periodically check for auth token
function checkAuthTokenPeriodically() {
    const MAX_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
    const INTERVAL = 3000; // 3 seconds
    const startTime = Date.now();
    let intervalId;

    const check = () => {
        const currentTime = Date.now();
        if (currentTime - startTime >= MAX_DURATION) {
            console.log('❌ Stopped checking for auth token after 5 minutes');
            clearInterval(intervalId);
            return;
        }

        if (sendCookiesToBackground()) {
            console.log('✅ Auth token found and sent. Stopping periodic checks.');
            clearInterval(intervalId);
            return;
        }
    };

    // Start periodic checking
    intervalId = setInterval(check, INTERVAL);
    // Also check immediately
    check();
}

// Run when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuthTokenPeriodically);
} else {
    checkAuthTokenPeriodically();
}