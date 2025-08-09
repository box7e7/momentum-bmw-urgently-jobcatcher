# UrgentlyAutomation Test Kit

This test kit allows you to test the UrgentlyAutomation job assignment logic without requiring login or real-time message capture. It reads messages from a JSON file and simulates the entire job processing workflow.

## Files Created

1. **`UrgentlyAutomationTest.js`** - Main test class with all functions from UrgentlyAutomation.js except login
2. **`test-runner.js`** - Simple test runner to execute tests
3. **`sample-message.json`** - Sample message file for testing
4. **`TEST-README.md`** - This documentation file

## How to Use

### Step 1: Prepare Message Data

1. **Option A: Use existing message.json**
   - If you already have a `message.json` file from the real system, the test will use it automatically

2. **Option B: Use the sample**
   - Copy `sample-message.json` to `message.json`:
   ```bash
   cp sample-message.json message.json
   ```

3. **Option C: Create your own**
   - Create a `message.json` file with the structure:
   ```json
   {
     "message": {
       "poNumber": 9035294,
       "caseDTO": { "id": "7256404" },
       "service": {
         "number": 9035294,
         "status": 1,
         "statusDescription": "Found Providers",
         "serviceId": 2001,
         "type": "RSA_ON_DEMAND"
       },
       "provider": { "status": 1 },
       "location": {
         "address": "9911 Centre Pkwy, Houston, TX 77036, USA",
         "zipCode": "77036"
       }
     }
   }
   ```

### Step 2: Run Tests

#### Quick Test (Recommended)
```bash
node test-runner.js
```

#### Manual Test
```bash
node -e "
import UrgentlyAutomationTest from './UrgentlyAutomationTest.js';
const tester = new UrgentlyAutomationTest();
tester.runTest(true).then(result => console.log('Result:', result));
"
```

### Step 3: Test Modes

#### Test Mode (Safe - Default)
- **testMode = true**
- Simulates API calls without making real requests
- Safe to run multiple times
- No actual job assignments

#### Real Mode (Live API calls)
- **testMode = false**
- Makes actual API calls to Urgently
- Requires valid auth token in environment
- Will attempt real job assignments
- Use with caution!

## Environment Setup

### Required Environment Variables

Add to your `.env` file:

```env
# For real mode testing (optional)
TEST_AUTH_TOKEN=your_actual_auth_token
```

### Dependencies

Required dependencies:
- node-fetch
- dotenv
- chalk

## Test Scenarios

### Scenario 1: Status 1 Message (Should Process)
```json
{
  "message": {
    "service": { "status": 1, "serviceId": 2001, "type": "RSA_ON_DEMAND" },
    "poNumber": 12345,
    "location": { "address": "123 Test St", "zipCode": "12345" }
  }
}
```

### Scenario 2: Status 3 Message (Should Skip)
```json
{
  "message": {
    "service": { "status": 3, "serviceId": 2001, "type": "RSA_ON_DEMAND" },
    "poNumber": 12345
  }
}
```

### Scenario 3: Scheduled Service
```json
{
  "message": {
    "service": { "status": 1, "serviceId": 2001, "type": "RSA_SCHEDULED_SERVICE" },
    "poNumber": 12345,
    "location": { "address": "123 Test St", "zipCode": "12345" }
  }
}
```

## Features

### ✅ What's Included
- All job assignment logic from UrgentlyAutomation.js
- Message processing and extraction
- Location checking (Austin/Dallas counties)
- ETA configuration
- Multiple assignment attempts
- Error handling
- Test mode simulation

### ❌ What's Excluded
- Browser automation (Puppeteer)
- Login functionality
- Real-time message listening
- Screenshot taking

## Debugging

### Common Issues

1. **"No message found in message.json"**
   - Ensure `message.json` exists in the project root
   - Check JSON syntax is valid

2. **"Error fetching location data"**
   - Geocoding service might be down
   - Test will use mock location data automatically

3. **"Error fetching ETA config"**
   - Web control server might not be running
   - Test will use default ETA values

### Verbose Logging

The test includes extensive console logging:
- Message processing steps
- Job assignment decisions
- API call results (or simulations)
- Error details

## Customization

### Modify Test Behavior

Edit `UrgentlyAutomationTest.js`:

```javascript
// Change default ETA values
this.etaConfig = { austin: 45, dallas: 45, other: 45 };

// Add more counties
this.austin_counties.push('New County');

// Change test auth token
this.authTokenGlobal = "your-test-token";
```

### Add New Test Cases

Create multiple message files and run them:

```javascript
const tester = new UrgentlyAutomationTest();

// Test different scenarios
await tester.processMessage(message1, true);
await tester.processMessage(message2, true);
await tester.processMessage(message3, true);
```

## Safety Notes

⚠️ **Important**: 
- Always test in TEST MODE first
- Real mode makes actual API calls and job assignments
- Use valid auth tokens only in secure environments

## Support

If you encounter issues:
1. Check the console output for detailed error messages
2. Verify your `message.json` structure matches the expected format
3. Ensure all environment variables are set correctly
4. Test with the provided `sample-message.json` first
