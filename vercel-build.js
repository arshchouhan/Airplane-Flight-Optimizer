// This script is used by Vercel to build the application
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Installing web-app dependencies...');
execSync('cd web-app && npm install', { stdio: 'inherit' });

console.log('Building web-app...');
execSync('cd web-app && npm run build', { stdio: 'inherit' });

console.log('Installing server dependencies...');
execSync('npm install', { stdio: 'inherit' });

console.log('Build completed successfully!');
