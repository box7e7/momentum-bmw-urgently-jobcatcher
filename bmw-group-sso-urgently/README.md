# BMW Group SSO Auto Login Extension

This Chrome extension automates the login process for BMW Group SSO.

## Installation Instructions

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select this directory
4. The extension will now be active

## How it Works

The extension automatically:
1. Fills in the username
2. Clicks the necessary buttons
3. Waits 2 seconds
4. Enters the PIN
5. Submits the form

The automation triggers when visiting any URL that includes: https://auth.bmwgroup.com/auth/XUI/?realm
