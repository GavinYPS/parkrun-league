exports.handler = async function (event) {
    const headers = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Content-Type": "application/json",
    };
    if (event.httpMethod === "OPTIONS") {
          return { statusCode: 204, headers, body: "" };
    }
    const params = event.queryStringParameters || {};
    let targetUrl = params.url;
    if (!targetUrl) {
          const { event: eventName, id } = params;
          if (!eventName || !id) {
                  return { statusCode: 400, headers, body: JSON.stringify({ error: "Provide ?url= or both ?event=<name>&id=<number>" }) };
          }
          targetUrl = `https://www.parkrun.org.uk/${eventName}/parkrunner/${id}/`;
    }
    let html;
    try {
          const res = await fetch(targetUrl, {
                  headers: { "User-Agent": "Mozilla/5.0 (compatible; ParkrunLeagueTracker/1.0)" }
          });
          if (!res.ok) {
                  return { statusCode: 502, headers, body: JSON.stringify({ error: `parkrun returned HTTP ${res.status}` }) };
          }
          html = await res.text();
    } catch (err) {
          return { statusCode: 502, headers, body: JSON.stringify({ error: `Fetch failed: ${err.message}` }) };
    }
    const nameMatch = html.match(/<h2[^>]*>([^(<]+)\s*\(/);
    const name = nameMatch ? nameMatch[1].trim() : null;
    const annualSection = html.match(/Best Annual Achievements[\s\S]*?<table[\s\S]*?<\/table>/i);
    let bestAnnualTime = null;
    const annualResults = {};
    if (annualSection) {
          const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
          let rowMatch;
          while ((rowMatch = rowRegex.exec(annualSection[0])) !== null) {
                  const cells = [];
                  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
                  let cellMatch;
                  while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
                            cells.push(cellMatch[1].replace(/<[^>]+>/g, "").trim());
                  }
                  if (cells.length >= 2 && /^\d{4}$/.test(cells[0])) {
                            annualResults[cells[0]] = cells[1];
                  }
          }
          const currentYear = String(new Date().getFullYear());
          if (annualResults[currentYear]) {
                  bestAnnualTime = annualResults[currentYear];
          } else {
                  const sorted = Object.entries(annualResults).sort((a, b) => a[1].localeCompare(b[1]));
                  if (sorted.length) bestAnnualTime = sorted[0][1];
          }
    }
    if (!name && !bestAnnualTime) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: "Could not parse runner data", url: targetUrl }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ name, bestAnnualTime, annualResults, url: targetUrl }) };
};
