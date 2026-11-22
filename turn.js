// api/turn.js  ->  Vercel serverless function, URL: /api/turn
// Vercel mein deploy hote hi ye backend ki tarah chalta hai. Browser sirf GET /api/turn karta hai.
//
// Vercel > Project > Settings > Environment Variables mein ye daalo (code mein NAHI):
//   METERED_APP_NAME   Metered app ka naam (subdomain wala hissa)
//   METERED_API_KEY    Metered ki secret API key (chat mein share mat karna)
//
// Frontend aur ye function same Vercel domain par hain, isliye CORS ki zaroorat nahi.

const TTL_MS = 10 * 60 * 1000; // server par 10 minute cache (har join par API call nahi)
let cache = { at: 0, iceServers: null };

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method not allowed" });
  }

  const app = process.env.METERED_APP_NAME;
  const key = process.env.METERED_API_KEY;
  if (!app || !key) {
    return res.status(500).json({ error: "server config missing" });
  }

  if (cache.iceServers && Date.now() - cache.at < TTL_MS) {
    return res.status(200).json({ iceServers: cache.iceServers });
  }

  try {
    const url = `https://${app}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(key)}`;
    const upstream = await fetch(url);
    if (!upstream.ok) {
      // Key ya response ka detail client ko nahi dikhate
      return res.status(502).json({ error: "turn provider error" });
    }
    const iceServers = await upstream.json();
    if (!Array.isArray(iceServers) || iceServers.length === 0) {
      return res.status(502).json({ error: "turn provider empty" });
    }
    cache = { at: Date.now(), iceServers };
    return res.status(200).json({ iceServers });
  } catch (err) {
    return res.status(502).json({ error: "turn fetch failed" });
  }
};
