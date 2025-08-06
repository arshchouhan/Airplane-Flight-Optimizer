// This script is used by Vercel to build the application
const { execSync } = require('child_process');
const fs = require('fs');

console.log('Installing dependencies...');
execSync('npm install', { stdio: 'inherit' });

console.log('Building application...');
execSync('npm run build', { stdio: 'inherit' });

// Create a vercel.json file in the build directory
const vercelConfig = {
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "build" }
    }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "/" }
  ]
};

fs.writeFileSync('build/vercel.json', JSON.stringify(vercelConfig, null, 2));
console.log('Vercel configuration file created.');
