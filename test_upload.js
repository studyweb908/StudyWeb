const http = require('http');

const data = JSON.stringify({
  workspaceId: 'test-ws',
  userId: 'test-user',
  name: 'test.pdf',
  type: 'pdf',
  size: '1KB',
  content: 'test content'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/knowledge/upload',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  let body = '';
  res.on('data', d => { body += d; });
  res.on('end', () => { console.log(body); });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
