const http = require('http');

// Log all environment variables that might be relevant
console.log('=== ENVIRONMENT VARIABLES ===');
console.log('PORT:', process.env.PORT);
console.log('RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('RAILWAY_PUBLIC_DOMAIN:', process.env.RAILWAY_PUBLIC_DOMAIN);
console.log('===========================');

const port = process.env.PORT || 3000;

console.log(`Attempting to start server on port ${port}`);

const server = http.createServer((req, res) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(`OK - Server is working!\nPort: ${port}\nPath: ${req.url}\n`);
});

// Try different binding approaches
server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

server.on('listening', () => {
  const addr = server.address();
  console.log(`Server successfully listening on ${addr.address}:${addr.port}`);
});

// Don't specify host to let Node.js decide
server.listen(port, () => {
  console.log(`Server started on port ${port}`);
  console.log('Waiting for requests...');
});
