document.addEventListener('DOMContentLoaded', function() {
    // Load saved settings
    chrome.storage.sync.get(['username', 'passcode', 'topic'], function(items) {
        if (items.username) {
            document.getElementById('username').value = items.username;
        }
        if (items.passcode) {
            document.getElementById('passcode').value = items.passcode;
        }
        if (items.topic) {
            document.getElementById('topic').value = items.topic;
        }
    });

    // Save settings
    document.getElementById('save').addEventListener('click', function() {
        const username = document.getElementById('username').value;
        const passcode = document.getElementById('passcode').value;
        const topic = document.getElementById('topic').value;
        
        chrome.storage.sync.set({
            username: username,
            passcode: passcode,
            topic: topic
        }, function() {
            const status = document.getElementById('status');
            status.textContent = 'Settings saved!';
            status.className = 'status success';
            
            // Hide status message after 2 seconds
            setTimeout(function() {
                status.className = 'status';
            }, 2000);
        });
    });
});
