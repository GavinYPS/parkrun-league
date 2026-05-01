exports.handler = async function(event) {
  const target = (event.queryStringParameters || {}).url || '';
  if (!target.startsWith('https://www.parkrun.org.uk/')) {
    return { statusCode: 400, body: 'Invalid URL' };
  }
  try {
    const res = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
      }
    });
    const html = await res.text();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      },
      body: html
    };
  } catch(e) {
    return { statusCode: 500, body: e.message };
  }
};
