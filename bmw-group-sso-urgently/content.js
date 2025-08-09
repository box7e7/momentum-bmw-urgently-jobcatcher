// Function to check if an element exists and is visible
function elementExists(id) {
    const element = document.getElementById(id);
    return element !== null && element.offsetParent !== null;
}

// Function to wait for a specified time
function sleep(ms) {
    return new Promise(resolve => {
        console.log(`Waiting for ${ms}ms...`);
        setTimeout(() => {
            console.log(`Completed ${ms}ms wait`);
            resolve();
        }, ms);
    });
}

// Function to wait for an element to become available
async function waitForElement(id, timeout = 10000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        if (elementExists(id)) {
            console.log(`Element ${id} found`);
            return true;
        }
        await sleep(500); // Check every 500ms
    }
    console.log(`Timeout waiting for element ${id}`);
    return false;
}

// Main automation function
async function autoFillForm() {
    console.log('Starting automation after page load');
    
    // Get saved credentials
    const credentials = await new Promise(resolve => {
        chrome.storage.sync.get(['username', 'passcode'], function(items) {
            resolve(items);
        });
    });

    // Wait for both username field and button to be available
    const [usernameField, submitButton] = await Promise.all([
        waitForElement('idToken2'),
        waitForElement('callback_2_1')
    ]);

    if (usernameField && submitButton) {
        console.log('Both username field and submit button are available');
        document.getElementById('idToken2').value = credentials.username || '';
        await sleep(500); // Small delay to ensure username is set
        document.getElementById('callback_2_1').click();
    } else {
        console.log('Could not find all required elements:', {
            usernameField: usernameField,
            submitButton: submitButton
        });
    }
    
    if (await waitForElement('idToken4_0')) {
        document.getElementById('idToken4_0').click();
    }

    // Wait for second set of elements
    await sleep(2000);
    
    if (await waitForElement('idToken1')) {
        document.getElementById('idToken1').value = credentials.passcode || '';
    }
    
    if (elementExists('idToken2_0')) {
        document.getElementById('idToken2_0').click();
        
        // Send notification after clicking the submit button
        try {
            // Get the saved topic
            const topic = credentials.topic || 'myTopic';
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
        } catch (error) {
            console.error('Error sending notification:', error);
        }
    }
}

// Run the automation when the page loads
if (window.location.href.includes('https://auth.bmwgroup.com/auth/XUI/?realm')) {
    // Wait for the page to be fully loaded
    if (document.readyState === 'complete') {
        autoFillForm();
    } else {
        window.addEventListener('load', () => {
            autoFillForm();
        });
    }
}
