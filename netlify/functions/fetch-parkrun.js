export default async (request, context) => {
  const url = new URL(request.url);
  const target = url.searchParams.get('url');

  if (!target || !target.includes('parkrun.org.uk')) {
    return new Response('Invalid URL', { status: 400 });
  }

  try {
    const resp = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
      }
    });

    if (!resp.ok) {
      return new Response('Upstream error: ' + resp.status, { status: resp.status });
    }

    const html = await resp.text();
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      }
    });
  } catch (e) {
    return new Response('Fetch failed: ' + e.message, { status: 500 });
  }
};

export const config = { path: '/api/fetch-parkrun' };
