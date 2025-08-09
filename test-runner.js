import UrgentlyAutomationTest from './UrgentlyAutomationTest.js';
import chalk from 'chalk';

async function runTests() {
    console.log(chalk.cyan('='.repeat(80)));
    console.log(chalk.cyan('UrgentlyAutomation Test Runner'));
    console.log(chalk.cyan('='.repeat(80)));
    
    const tester = new UrgentlyAutomationTest();
    
    try {
        // Run test in TEST MODE (simulated)
        console.log(chalk.yellow('\n🧪 Running in TEST MODE (simulated)...'));
        const testResult = await tester.runTest(true);
        
        console.log(chalk.green('\n✅ Test Mode Results:'));
        console.log(JSON.stringify(testResult, null, 2));
        
        // Ask if user wants to run in real mode
        console.log(chalk.yellow('\n⚠️  To run in REAL MODE (actual API calls), change testMode to false in the code below'));
        console.log(chalk.gray('// Uncomment the next lines to run in real mode:'));
        console.log(chalk.gray('// console.log(chalk.red("\\n🚨 Running in REAL MODE (actual API calls)..."));'));
        console.log(chalk.gray('// const realResult = await tester.runTest(false);'));
        console.log(chalk.gray('// console.log(chalk.green("\\n✅ Real Mode Results:"));'));
        console.log(chalk.gray('// console.log(JSON.stringify(realResult, null, 2));'));
        
        // Uncomment these lines to run in real mode:
        // console.log(chalk.red('\n🚨 Running in REAL MODE (actual API calls)...'));
        // const realResult = await tester.runTest(false);
        // console.log(chalk.green('\n✅ Real Mode Results:'));
        // console.log(JSON.stringify(realResult, null, 2));
        
    } catch (error) {
        console.error(chalk.red('❌ Test failed:'), error);
    }
    
    console.log(chalk.cyan('\n' + '='.repeat(80)));
    console.log(chalk.cyan('Test Runner Complete'));
    console.log(chalk.cyan('='.repeat(80)));
}

// Run the tests
runTests();
