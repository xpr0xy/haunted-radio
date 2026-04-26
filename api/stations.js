const FALLBACK_STATIONS = [
  {
    name: 'Classic Vinyl HD',
    url: 'https://icecast.walmradio.com:8443/classic',
    country: 'The United States Of America',
    codec: 'MP3',
    bitrate: 320,
    tags: 'oldies,jazz,lounge,swing',
  },
  {
    name: 'SomaFM Drone Zone',
    url: 'https://ice6.somafm.com/dronezone-128-mp3',
    country: 'The United States Of America',
    codec: 'MP3',
    bitrate: 128,
    tags: 'ambient,drone,space',
  },
  {
    name: 'SomaFM Dark Zone',
    url: 'https://ice6.somafm.com/darkzone-128-mp3',
    country: 'The United States Of America',
    codec: 'MP3',
    bitrate: 128,
    tags: 'dark ambient,experimental',
  },
  {
    name: 'BBC World Service',
    url: 'http://stream.live.vc.bbcmedia.co.uk/bbc_world_service',
    country: 'The United Kingdom',
    codec: 'MP3',
    bitrate: 56,
    tags: 'news,talk',
  },
  {
    name: 'MANGORADIO',
    url: 'https://mangoradio.stream.laut.fm/mangoradio',
    country: 'Germany',
    codec: 'MP3',
    bitrate: 128,
    tags: 'music,variety',
  },
  {
    name: '101 SMOOTH JAZZ',
    url: 'http://jking.cdnstream1.com/b22139_128mp3',
    country: 'The United States Of America',
    codec: 'MP3',
    bitrate: 128,
    tags: 'easy listening,jazz,smooth jazz',
  },
  {
    name: 'Radio Paradise Main Mix (EU) 320k AAC',
    url: 'http://stream-uk1.radioparadise.com/aac-320',
    country: 'The United States Of America',
    codec: 'AAC',
    bitrate: 320,
    tags: 'eclectic,ambient,rock',
  },
  {
    name: 'SWR3',
    url: 'https://liveradio.swr.de/sw282p3/swr3/play.mp3',
    country: 'Germany',
    codec: 'MP3',
    bitrate: 128,
    tags: 'news,pop,rock',
  },
  {
    name: 'Deutschlandfunk | DLF | MP3 128k',
    url: 'https://st01.sslstream.dlf.de/dlf/01/128/mp3/stream.mp3?aggregator=web',
    country: 'Germany',
    codec: 'MP3',
    bitrate: 128,
    tags: 'culture,news,public service',
  },
  {
    name: 'Dance Wave!',
    url: 'https://dancewave.online/dance.mp3',
    country: 'Hungary',
    codec: 'MP3',
    bitrate: 128,
    tags: 'dance,house,trance',
  },
  {
    name: 'JOE',
    url: 'https://stream.joe.nl/joe/aachigh',
    country: 'The Netherlands',
    codec: 'AAC+',
    bitrate: 95,
    tags: 'pop,rock',
  },
  {
    name: '1LIVE',
    url: 'http://wdr-1live-live.icecast.wdr.de/wdr/1live/live/mp3/128/stream.mp3',
    country: 'Germany',
    codec: 'MP3',
    bitrate: 128,
    tags: 'public radio,rock,top 40',
  }
];

const MIRRORS = [
  'https://de1.api.radio-browser.info',
  'https://fi1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://fr1.api.radio-browser.info',
  'https://all.api.radio-browser.info',
];

function normalizeStation(station) {
  return {
    name: (station.name || 'Unknown station').trim(),
    url: station.url_resolved || station.url,
    country: station.country || 'Unknown origin',
    codec: (station.codec || 'stream').toUpperCase(),
    bitrate: Number(station.bitrate) || 0,
    tags: station.tags || '',
    votes: Number(station.votes) || 0,
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');

  for (const base of MIRRORS) {
    try {
      const response = await fetch(`${base}/json/stations/search?limit=220&hidebroken=true&order=clickcount&reverse=true`, {
        headers: {
          'User-Agent': 'HauntedRadio/2.0 (+https://github.com/xpr0xy/haunted-radio)'
        },
      });

      if (!response.ok) continue;
      const rows = await response.json();
      const seen = new Set();
      const stations = rows
        .map(normalizeStation)
        .filter((station) => {
          if (!station.url) return false;
          if (String(station.url).includes('.m3u8')) return false;
          if (seen.has(station.url)) return false;
          seen.add(station.url);
          return true;
        })
        .slice(0, 96);

      if (stations.length) {
        return res.status(200).json({
          source: base,
          count: stations.length,
          stations,
        });
      }
    } catch {
      // try next mirror
    }
  }

  return res.status(200).json({
    source: 'fallback',
    count: FALLBACK_STATIONS.length,
    stations: FALLBACK_STATIONS,
  });
};
