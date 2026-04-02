// Vercel serverless streaming proxy — adds CORS headers to any radio stream
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('url');

  if (!target) {
    return new Response(JSON.stringify({ error: 'missing ?url= param' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    const upstream = await fetch(target, {
      headers: {
        'User-Agent': 'HauntedRadio/1.0',
        'Icy-MetaData': '1',
      },
      redirect: 'follow',
    });

    const headers = new Headers();
    // copy relevant upstream headers
    for (const [k, v] of upstream.headers) {
      if (['content-type', 'icy-name', 'icy-description', 'icy-genre', 'icy-br'].includes(k.toLowerCase())) {
        headers.set(k, v);
      }
    }
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Cache-Control', 'no-cache');

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
}
