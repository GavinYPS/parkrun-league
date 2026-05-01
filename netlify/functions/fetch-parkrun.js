const https = require('https');

exports.handler = async (event) => {
  const target = event.queryStringParameters?.url;
  if (!target || !target.includes('parkrun.org.uk')) {
    return { statusCode: 400, body: 'Invalid URL' };
  }
  return new Promise((resolve) => {
    https.get(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120',
        'Accept': 'text/html'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/html' },
        body: data
      }));
    }).on('error', (e) => resolve({ statusCode: 500, body: e.message }));
  });
};
