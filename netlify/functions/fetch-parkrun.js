// netlify/functions/fetch-parkrun.js
// Scrapes parkrun.org.uk for a runner's name and best annual time.
// Works on Netlify's Node 18+ runtime (native fetch, no extra deps needed).

exports.handler = async function (event) {
  // ── CORS headers ──────────────────────────────────────────────────────────
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  // Handle CORS pre-flight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  // ── Parse query params ─────────────────────────────────────────────────────
  // Accepts either:
  //   ?url=https://www.parkrun.org.uk/macclesfield/parkrunner/8416304/
  //   ?event=macclesfield&id=8416304
  const params = event.queryStringParameters || {};
  let targetUrl = params.url;

  if (!targetUrl) {
    const { event: eventName, id } = params;
    if (!eventName || !id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Provide ?url=… or both ?event=<name>&id=<number>",
        }),
      };
    }
    targetUrl = `https://www.parkrun.org.uk/${eventName}/parkrunner/${id}/`;
  }

  // ── Fetch the parkrun page ─────────────────────────────────────────────────
  let html;
  try {
    const res = await fetch(targetUrl, {
      headers: {
        // Mimic a real browser – parkrun doesn't block server requests but
        // a recognisable UA reduces any future risk of 403s.
        "User-Agent":
          "Mozilla/5.0 (compatible; ParkrunLeagueTracker/1.0; +https://parkrun-league.netlify.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: `parkrun returned HTTP ${res.status} for ${targetUrl}`,
        }),
      };
    }

    html = await res.text();
  } catch (err) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: `Fetch failed: ${err.message}` }),
    };
  }

  // ── Parse name ─────────────────────────────────────────────────────────────
  // The page contains e.g.:  <h2>Gavin TREVENA (A8416304)</h2>
  const nameMatch = html.match(/<h2[^>]*>([^(<]+)\s*\(/);
  const name = nameMatch ? nameMatch[1].trim() : null;

  // ── Parse Best Annual Achievements table ───────────────────────────────────
  // We look for the section that contains "Best Annual Achievements" then
  // scrape all <tr> rows that have a year + time.
  //
  // HTML shape (simplified):
  //   <h3>Best Annual Achievements …</h3>
  //   <table> <thead>…</thead> <tbody>
  //     <tr><td>2026</td><td>00:21:06</td><td>64.22%</td></tr>
  //     …
  //   </tbody> </table>

  const annualSection = html.match(
    /Best Annual Achievements[\s\S]*?<table[\s\S]*?<\/table>/i
  );

  let bestAnnualTime = null;
  const annualResults = {}; // { "2026": "00:21:06", … }

  if (annualSection) {
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(annualSection[0])) !== null) {
      const cells = [];
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        // Strip any inner HTML tags to get plain text
        cells.push(cellMatch[1].replace(/<[^>]+>/g, "").trim());
      }
      // Row format: Year | Best Time | Best Age Grading
      if (cells.length >= 2 && /^\d{4}$/.test(cells[0])) {
        annualResults[cells[0]] = cells[1]; // e.g. "00:21:06"
      }
    }

    // Pick best time: prefer current year, otherwise the fastest overall
    const currentYear = String(new Date().getFullYear());
    if (annualResults[currentYear]) {
      bestAnnualTime = annualResults[currentYear];
    } else {
      // Sort by time string (HH:MM:SS lexicographic sort works for equal length)
      const sorted = Object.entries(annualResults).sort((a, b) =>
        a[1].localeCompare(b[1])
      );
      if (sorted.length) bestAnnualTime = sorted[0][1]; // fastest = lowest
    }
  }

  // ── Overall fastest time (from Summary Stats table) ────────────────────────
  // Useful as a fallback / extra data point.
  const fastestMatch = html.match(
    /Summary Stats[\s\S]*?<td[^>]*>\s*([\d:]+)\s*<\/td>/i
  );
  const overallFastest = fastestMatch ? fastestMatch[1].trim() : null;

  // ── Return ─────────────────────────────────────────────────────────────────
  if (!name && !bestAnnualTime) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: "Could not parse runner data – page structure may have changed",
        url: targetUrl,
      }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      name,
      bestAnnualTime,      // e.g. "00:21:06"  (current year, or fastest year)
      annualResults,       // all years: { "2023": "00:25:23", … }
      overallFastest,      // from the Summary Stats table
      url: targetUrl,
    }),
  };
};
