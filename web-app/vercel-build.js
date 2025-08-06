// This script is used by Vercel to build the application
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Helper function to run commands with better error handling
function runCommand(command, options = {}) {
  console.log(`Running: ${command}`);
  try {
    execSync(command, { 
      stdio: 'inherit',
      ...options,
      env: { 
        ...process.env,
        NODE_ENV: 'production',
        CI: 'true',
        NPM_CONFIG_PRODUCTION: 'false',
        NPM_CONFIG_AUDIT: 'false',
        NPM_CONFIG_FUND: 'false',
        ...(options.env || {})
      }
    });
    return true;
  } catch (error) {
    console.error(`Command failed: ${command}`, error);
    process.exit(1);
  }
}

// Main build process
console.log('=== Starting Vercel Build ===');
console.log('Current directory:', process.cwd());

// Install dependencies
console.log('\n=== Installing Dependencies ===');
runCommand('npm install --prefer-offline --no-audit --progress=false');

// Build the application
console.log('\n=== Building Application ===');
runCommand('npm run build');

// Verify build output
const buildDir = path.join(process.cwd(), 'build');
if (!fs.existsSync(buildDir)) {
  console.error('Error: Build directory not found after build process');
  process.exit(1);
}

console.log('\n=== Build Output ===');
console.log(fs.readdirSync(buildDir));

console.log('\n=== Vercel Build Completed Successfully ===');
