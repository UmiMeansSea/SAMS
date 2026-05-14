const { execSync } = require('child_process');
try {
    console.log('Adding SRS.md...');
    execSync('git add SRS.md');
    console.log('Committing...');
    execSync('git commit -m "docs: update SRS documentation"');
    console.log('Pushing...');
    execSync('git push');
    console.log('Success!');
} catch (error) {
    console.error('Git operation failed:');
    console.error(error.stdout?.toString() || error.message);
}
