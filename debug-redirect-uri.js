#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🔍 Debugging Spotify Redirect URI Configuration\n');
console.log('=' .repeat(60));

// Check .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  console.log('\n📄 Current .env.local configuration:');
  lines.forEach(line => {
    if (line.includes('REDIRECT_URI') && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      console.log(`  ${key} = ${value}`);
    }
  });
} else {
  console.log('\n❌ No .env.local file found!');
}

console.log('\n📋 Registered Spotify Redirect URIs (from your screenshot):');
console.log('  ✅ http://192.168.1.66:3000/api/spotify/callback');
console.log('  ✅ http://127.0.0.1:3000/api/spotify/callback');
console.log('  ✅ https://playing-production-7747.up.railway.app/');
console.log('  ✅ https://playing-xi.vercel.app/');

console.log('\n⚠️  IMPORTANT: The Railway and Vercel URIs are missing the callback path!');
console.log('  They should be:');
console.log('  ❗ https://playing-production-7747.up.railway.app/api/spotify/callback');
console.log('  ❗ https://playing-xi.vercel.app/api/spotify/callback');

console.log('\n🔧 To fix the "Invalid redirect URI" error:');
console.log('\n1. Update your .env.local file:');
console.log('   NEXT_PUBLIC_REDIRECT_URI=http://192.168.1.66:3000/api/spotify/callback');
console.log('\n2. For production (Railway), add to Spotify Dashboard:');
console.log('   https://playing-production-7747.up.railway.app/api/spotify/callback');
console.log('\n3. For production (Vercel), add to Spotify Dashboard:');
console.log('   https://playing-xi.vercel.app/api/spotify/callback');

console.log('\n💡 The redirect URI must match EXACTLY including the path!');
console.log('=' .repeat(60));
console.log('\n');
