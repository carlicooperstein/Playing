#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n✅ Verifying Spotify OAuth Configuration\n');
console.log('=' .repeat(60));

// Check .env.local
const envPath = path.join(__dirname, '.env.local');
let currentRedirectUri = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  lines.forEach(line => {
    if (line.includes('NEXT_PUBLIC_REDIRECT_URI') && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      currentRedirectUri = value;
    }
  });
}

console.log('\n📄 Your .env.local configuration:');
console.log(`  NEXT_PUBLIC_REDIRECT_URI = ${currentRedirectUri}`);

console.log('\n✅ Spotify Dashboard URIs (Updated):');
console.log('  ✓ https://playing-xi.vercel.app/api/spotify/callback');
console.log('  ✓ https://playing-production-7747.up.railway.app/api/spotify/callback');
console.log('  ✓ http://192.168.1.66:3000/api/spotify/callback');
console.log('  ✓ http://127.0.0.1:3000/api/spotify/callback');

console.log('\n🔍 Configuration Check:');

// Check if current env matches any registered URI
const registeredUris = [
  'https://playing-production-7747.up.railway.app/api/spotify/callback',
  'https://playing-xi.vercel.app/api/spotify/callback',
  'http://192.168.1.66:3000/api/spotify/callback',
  'http://127.0.0.1:3000/api/spotify/callback'
];

if (registeredUris.includes(currentRedirectUri.trim())) {
  console.log('  ✅ Your redirect URI matches a registered Spotify URI!');
  console.log(`     Using: ${currentRedirectUri}`);
} else {
  console.log('  ⚠️  WARNING: Your redirect URI doesn\'t match any registered URI!');
  console.log(`     Current: ${currentRedirectUri}`);
  console.log('     Expected one of the registered URIs above');
}

console.log('\n📍 Current Configuration Analysis:');
if (currentRedirectUri.includes('railway')) {
  console.log('  🚂 You are configured for Railway production');
  console.log('  ℹ️  For local development, change to:');
  console.log('     NEXT_PUBLIC_REDIRECT_URI=http://192.168.1.66:3000/api/spotify/callback');
} else if (currentRedirectUri.includes('vercel')) {
  console.log('  ▲ You are configured for Vercel production');
  console.log('  ℹ️  For local development, change to:');
  console.log('     NEXT_PUBLIC_REDIRECT_URI=http://192.168.1.66:3000/api/spotify/callback');
} else if (currentRedirectUri.includes('192.168') || currentRedirectUri.includes('127.0.0.1')) {
  console.log('  💻 You are configured for local development');
  console.log('  ✅ This is correct for testing locally!');
} else {
  console.log('  ❓ Unknown configuration');
}

console.log('\n🎯 Quick Switch Commands:');
console.log('  For local development:');
console.log('    NEXT_PUBLIC_REDIRECT_URI=http://192.168.1.66:3000/api/spotify/callback');
console.log('\n  For Railway production:');
console.log('    NEXT_PUBLIC_REDIRECT_URI=https://playing-production-7747.up.railway.app/api/spotify/callback');
console.log('\n  For Vercel production:');
console.log('    NEXT_PUBLIC_REDIRECT_URI=https://playing-xi.vercel.app/api/spotify/callback');

console.log('\n' + '=' .repeat(60));
console.log('\n');
