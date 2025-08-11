import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';

const credentials = {
  user: "Momentum-roadside18",
  password: "fekaTXMRN@18"
};

const browserArgs = [
  '--start-maximized',
  '--enable-save-password-bubble',
  '--enable-automatic-password-saving',
  '--enable-automation',
  '--no-sandbox'
];

export async function getCookies() {
  const browser = await puppeteer.launch({
    headless: true,
    ignoreDefaultArgs: ["--disable-extensions"],
    args: browserArgs
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1150, height: 1200 });
    
    // Navigate to Towbook
    const res = await page.goto('https://app.towbook.com/DS4/');
    const headers = res.headers();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Login process
    const usernameSelector = '#Username';
    await page.waitForSelector(usernameSelector);
    await page.click(usernameSelector);
    await page.type(usernameSelector, credentials.user);

    const passwordSelector = '#Password';
    await page.waitForSelector(passwordSelector);
    await page.click(passwordSelector);
    await page.type(passwordSelector, credentials.password);

    const loginSelector = '#bSignIn';
    await page.waitForSelector(loginSelector);
    await page.click(loginSelector);
    console.log('Sign in clicked!');
    // Removed the else block as it was not properly formatted and was not being used

    // Wait for login to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('Ready to get cookies');

    // Take screenshot for verification
    await page.screenshot({
      path: './screenshot.png',
      fullPage: true
    });

    // Get and save cookies
    const cookies = await page.cookies('https://app.towbook.com/DS4/');
    await fs.writeFile('./cookies_towbook18.json', JSON.stringify(cookies, null, 2));
    console.log('Cookies saved successfully');
    
    return cookies;
  } catch (error) {
    console.error('Error in getCookies:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run directly if called as a script
if (process.argv[1] === new URL(import.meta.url).pathname) {
  getCookies()
    .then(cookies => console.log(cookies))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}
