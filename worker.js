// Cloudflare Worker — CORS proxy for radio streams
// Deploy at: dash.cloudflare.com → Workers & Pages → Create → paste this
// Name it anything (e.g. "haunted-radio-proxy")
// Set a custom domain or use the *.workers.dev URL it gives you

export default {
  async fetch(request) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);
    const target = url.searchParams.get('url');
    if (!target) return new Response('missing ?url= param', { status: 400 });

    try {
      const upstream = await fetch(target, {
        headers: {
          'User-Agent': 'HauntedRadio/1.0',
          'Icy-MetaData': '1',
          'Accept': '*/*',
        },
        redirect: 'follow',
      });

      const headers = new Headers(upstream.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Cache-Control', 'no-cache');
      // Remove content-encoding to avoid double-compression issues
      headers.delete('content-encoding');
      headers.delete('content-length');

      return new Response(upstream.body, {
        status: upstream.status,
        headers,
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  },
};
