exports.handler = async function(event) {
  const url = (event.queryStringParameters || {}).url || '';
  if (!url.startsWith('https://www.parkrun.org.uk/')) {
    return { statusCode: 400, body: 'Invalid URL' };
  }
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' }
  });
  const body = await r.text();
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' },
    body
  };
};
