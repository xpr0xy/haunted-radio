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

const state = {
  powered: false,
  stations: [],
  stationSource: 'booting',
  usingFallback: false,
  dialValue: 0.43,
  stationIndex: 0,
  isLoadingStations: true,
  loadToken: 0,
  tuneTimer: null,
  driftPhase: Math.random() * Math.PI * 2,
  lastLevel: 0,
  animationStart: performance.now(),
  recoveries: 0,
  lastFault: 'none',
  currentRuntime: 'receiver sleeping',
  cooldowns: new Map(),
  audio: {
    ctx: null,
    currentEl: null,
    currentMode: 'silent',
    sourceNode: null,
    analyser: null,
    meterData: null,
    runtimeWatchers: [],
    chain: {},
  },
};

const dom = {
  dialCanvas: document.getElementById('dialCanvas'),
  meterCanvas: document.getElementById('meterCanvas'),
  frequencyReadout: document.getElementById('frequencyReadout'),
  stationName: document.getElementById('stationName'),
  stationMeta: document.getElementById('stationMeta'),
  statusChip: document.getElementById('statusChip'),
  statusText: document.getElementById('statusText'),
  sourceBadge: document.getElementById('sourceBadge'),
  pathBadge: document.getElementById('pathBadge'),
  carrierBadge: document.getElementById('carrierBadge'),
  recoveryBadge: document.getElementById('recoveryBadge'),
  lockState: document.getElementById('lockState'),
  runtimeStatus: document.getElementById('runtimeStatus'),
  meterDetail: document.getElementById('meterDetail'),
  telemetryMode: document.getElementById('telemetryMode'),
  telemetryPath: document.getElementById('telemetryPath'),
  telemetryStation: document.getElementById('telemetryStation'),
  fallbackMode: document.getElementById('fallbackMode'),
  faultLine: document.getElementById('faultLine'),
  hostBadge: document.getElementById('hostBadge'),
  routeSource: document.getElementById('routeSource'),
  routeProxy: document.getElementById('routeProxy'),
  routeOutput: document.getElementById('routeOutput'),
  routeRecovery: document.getElementById('routeRecovery'),
  bandmapCount: document.getElementById('bandmapCount'),
  bandmapList: document.getElementById('bandmapList'),
  powerBtn: document.getElementById('powerBtn'),
  scanBtn: document.getElementById('scanBtn'),
  recoverBtn: document.getElementById('recoverBtn'),
  sliders: {
    decay: document.getElementById('decaySlider'),
    wobble: document.getElementById('wobbleSlider'),
    dirt: document.getElementById('dirtSlider'),
    void: document.getElementById('voidSlider'),
    static: document.getElementById('staticSlider'),
  },
  values: {
    decay: document.getElementById('decayValue'),
    wobble: document.getElementById('wobbleValue'),
    dirt: document.getElementById('dirtValue'),
    void: document.getElementById('voidValue'),
    static: document.getElementById('staticValue'),
  },
};

const dialCtx = dom.dialCanvas.getContext('2d');
const meterCtx = dom.meterCanvas.getContext('2d');
const dialBounds = { width: 920, height: 480, dpr: 1 };
const meterBounds = { width: 920, height: 120, dpr: 1 };

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sliderValue(name) {
  return Number(dom.sliders[name].value) / 100;
}

function currentStation() {
  return state.stations[state.stationIndex] || null;
}

function stationIndexFromDial() {
  if (!state.stations.length) return 0;
  return clamp(Math.round(state.dialValue * (state.stations.length - 1)), 0, state.stations.length - 1);
}

function normalizeCountry(country) {
  return (country || 'unknown origin')
    .replace('The United States Of America', 'usa')
    .replace('The United Kingdom Of Great Britain And Northern Ireland', 'uk')
    .replace('The United Kingdom', 'uk')
    .replace('The Netherlands', 'netherlands');
}

function niceTags(tags = '') {
  return tags
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(' / ');
}

function setRuntime(text) {
  state.currentRuntime = text;
  dom.runtimeStatus.textContent = text;
}

function setFault(text) {
  state.lastFault = text;
  dom.faultLine.textContent = text;
}

function setStatus(text, mode = 'idle') {
  dom.statusText.textContent = text;
  dom.statusChip.textContent = mode;
  dom.statusChip.classList.toggle('live', mode === 'live');
  dom.statusChip.classList.toggle('error', mode === 'error');
  dom.carrierBadge.textContent = mode;
  syncTelemetry();
}

function syncTelemetry() {
  const station = currentStation();
  let host = 'unknown host';
  if (station?.url) {
    try {
      host = new URL(station.url).host.replace(/^www\./, '');
    } catch {}
  }

  dom.telemetryMode.textContent = state.powered ? 'powered' : 'standby';
  dom.telemetryPath.textContent = state.audio.currentMode;
  dom.telemetryStation.textContent = `${state.stations.length ? state.stationIndex + 1 : 0} / ${state.stations.length}`;
  dom.pathBadge.textContent = state.audio.currentMode;
  dom.recoveryBadge.textContent = String(state.recoveries);
  dom.lockState.textContent = state.powered ? state.audio.currentMode : 'off-air';
  dom.fallbackMode.textContent = state.usingFallback ? 'curated fallback' : 'live api';
  dom.sourceBadge.textContent = state.stationSource;
  dom.runtimeStatus.textContent = state.currentRuntime;
  dom.faultLine.textContent = state.lastFault;
  dom.hostBadge.textContent = host;
  dom.routeSource.textContent = station ? station.name : 'live station';
  dom.routeProxy.textContent = state.audio.currentMode === 'processed' ? 'proxy locked' : state.audio.currentMode === 'raw' ? 'bypassed' : 'awaiting lock';
  dom.routeOutput.textContent = state.audio.currentMode === 'silent' ? 'silent bus' : state.audio.currentMode === 'raw' ? 'raw output' : 'fx chain live';
  dom.routeRecovery.textContent = state.recoveries ? `${state.recoveries} recoveries` : 'ready';
}

function setStationDisplay(station, note = '') {
  if (!station) {
    dom.stationName.textContent = '— dead air —';
    dom.stationMeta.textContent = note || 'waiting for carrier';
    return;
  }

  dom.stationName.textContent = station.name;
  const parts = [
    normalizeCountry(station.country),
    station.codec,
    station.bitrate ? `${station.bitrate} kbps` : '',
  ];
  const tags = niceTags(station.tags);
  if (tags) parts.push(tags);
  if (note) parts.push(note);
  dom.stationMeta.textContent = parts.filter(Boolean).join(' · ');
}

function updateSliderLabels() {
  for (const [name, input] of Object.entries(dom.sliders)) {
    dom.values[name].textContent = input.value;
  }
}

function updateFrequencyReadout() {
  const freq = 87.5 + state.dialValue * 20.5;
  dom.frequencyReadout.textContent = `${freq.toFixed(1)} MHz`;
}

function resizeCanvas(canvas, ctx, target) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  target.width = Math.round(rect.width);
  target.height = Math.round(rect.height);
  target.dpr = dpr;
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function renderBandmap() {
  const count = Math.min(8, state.stations.length);
  dom.bandmapCount.textContent = `${state.stations.length} loaded`;
  dom.bandmapList.innerHTML = '';

  if (!count) return;

  const start = clamp(state.stationIndex - 3, 0, Math.max(0, state.stations.length - count));
  const subset = state.stations.slice(start, start + count);

  subset.forEach((station, offset) => {
    const index = start + offset;
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `bandmap-item${index === state.stationIndex ? ' active' : ''}`;
    item.innerHTML = `
      <header>
        <strong>${station.name}</strong>
        <small>${(87.5 + (index / Math.max(1, state.stations.length - 1)) * 20.5).toFixed(1)} mhz</small>
      </header>
      <small>${[normalizeCountry(station.country), station.codec, station.bitrate ? `${station.bitrate} kbps` : '', niceTags(station.tags)].filter(Boolean).join(' · ')}</small>
    `;
    item.addEventListener('click', () => {
      state.stationIndex = index;
      state.dialValue = index / Math.max(1, state.stations.length - 1);
      updateFrequencyReadout();
      setStationDisplay(station, state.powered ? 'retuning…' : 'queued frequency');
      syncTelemetry();
      renderBandmap();
      if (state.powered) queueTune(true, 'manual-bandmap');
    });
    dom.bandmapList.appendChild(item);
  });
}

function setDialValue(next, { shouldTune = true } = {}) {
  state.dialValue = clamp(next, 0, 1);
  updateFrequencyReadout();

  const nextIndex = stationIndexFromDial();
  if (nextIndex !== state.stationIndex) {
    state.stationIndex = nextIndex;
    setStationDisplay(currentStation(), state.powered ? 'retuning…' : 'queued frequency');
    renderBandmap();
    if (state.powered && shouldTune) queueTune(false, 'manual-dial');
  }
  syncTelemetry();
}

function makeCurve(amount) {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const k = 1 + amount * 96;
  for (let i = 0; i < samples; i += 1) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

function buildImpulseResponse(ctx, duration = 2.5, decay = 2) {
  const length = Math.floor(ctx.sampleRate * duration);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

function buildNoiseBuffer(ctx) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

async function ensureAudio() {
  if (state.audio.ctx) {
    await state.audio.ctx.resume();
    return state.audio;
  }

  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const chain = {};

  chain.input = ctx.createGain();
  chain.input.gain.value = 0.92;

  chain.highpass = ctx.createBiquadFilter();
  chain.highpass.type = 'highpass';
  chain.highpass.frequency.value = 95;

  chain.bandpass = ctx.createBiquadFilter();
  chain.bandpass.type = 'bandpass';
  chain.bandpass.frequency.value = 980;
  chain.bandpass.Q.value = 1.7;

  chain.dry = ctx.createGain();
  chain.dry.gain.value = 0.7;

  chain.delay = ctx.createDelay(0.9);
  chain.delay.delayTime.value = 0.085;
  chain.delayFeedback = ctx.createGain();
  chain.delayFeedback.gain.value = 0.24;
  chain.delayWet = ctx.createGain();
  chain.delayWet.gain.value = 0.34;

  chain.shaper = ctx.createWaveShaper();
  chain.shaper.curve = makeCurve(0.2);
  chain.shaper.oversample = '4x';

  chain.post = ctx.createGain();
  chain.post.gain.value = 0.82;

  chain.convolver = ctx.createConvolver();
  chain.convolver.buffer = buildImpulseResponse(ctx);
  chain.reverbWet = ctx.createGain();
  chain.reverbWet.gain.value = 0.34;
  chain.reverbDry = ctx.createGain();
  chain.reverbDry.gain.value = 0.78;

  chain.master = ctx.createGain();
  chain.master.gain.value = 0;

  chain.staticGain = ctx.createGain();
  chain.staticGain.gain.value = 0;

  chain.analyser = ctx.createAnalyser();
  chain.analyser.fftSize = 128;

  chain.bpLfo = ctx.createOscillator();
  chain.bpLfo.type = 'sine';
  chain.bpLfo.frequency.value = 0.075;
  chain.bpLfoGain = ctx.createGain();
  chain.bpLfoGain.gain.value = 140;
  chain.bpLfo.connect(chain.bpLfoGain);
  chain.bpLfoGain.connect(chain.bandpass.frequency);

  chain.wowLfo = ctx.createOscillator();
  chain.wowLfo.type = 'sine';
  chain.wowLfo.frequency.value = 0.3;
  chain.wowLfoGain = ctx.createGain();
  chain.wowLfoGain.gain.value = 0.0022;
  chain.wowLfo.connect(chain.wowLfoGain);
  chain.wowLfoGain.connect(chain.delay.delayTime);

  chain.flutterLfo = ctx.createOscillator();
  chain.flutterLfo.type = 'triangle';
  chain.flutterLfo.frequency.value = 4.2;
  chain.flutterLfoGain = ctx.createGain();
  chain.flutterLfoGain.gain.value = 0.00045;
  chain.flutterLfo.connect(chain.flutterLfoGain);
  chain.flutterLfoGain.connect(chain.delay.delayTime);

  const noise = ctx.createBufferSource();
  noise.buffer = buildNoiseBuffer(ctx);
  noise.loop = true;
  noise.connect(chain.staticGain);
  chain.staticGain.connect(chain.master);

  chain.input.connect(chain.highpass);
  chain.highpass.connect(chain.bandpass);
  chain.bandpass.connect(chain.dry);
  chain.bandpass.connect(chain.delay);
  chain.delay.connect(chain.delayFeedback);
  chain.delayFeedback.connect(chain.delay);
  chain.delay.connect(chain.delayWet);
  chain.dry.connect(chain.shaper);
  chain.delayWet.connect(chain.shaper);
  chain.shaper.connect(chain.post);
  chain.post.connect(chain.reverbDry);
  chain.post.connect(chain.convolver);
  chain.convolver.connect(chain.reverbWet);
  chain.reverbDry.connect(chain.master);
  chain.reverbWet.connect(chain.master);
  chain.master.connect(chain.analyser);
  chain.analyser.connect(ctx.destination);

  chain.bpLfo.start();
  chain.wowLfo.start();
  chain.flutterLfo.start();
  noise.start();

  state.audio.ctx = ctx;
  state.audio.chain = chain;
  state.audio.analyser = chain.analyser;
  state.audio.meterData = new Uint8Array(chain.analyser.frequencyBinCount);

  applyFx();
  setNoiseProfile('idle');
  await ctx.resume();
  return state.audio;
}

function setNoiseProfile(mode = 'idle') {
  const { ctx, chain } = state.audio;
  if (!ctx || !chain.staticGain) return;
  const now = ctx.currentTime;
  const staticAmount = sliderValue('static');
  const targets = {
    idle: staticAmount * 0.012,
    tuning: 0.005 + staticAmount * 0.028,
    processed: staticAmount * 0.008,
    raw: staticAmount * 0.018,
    error: 0.01 + staticAmount * 0.03,
  };
  chain.staticGain.gain.setTargetAtTime(targets[mode] ?? targets.idle, now, 0.08);
  dom.meterDetail.textContent = `${mode} / static ${Math.round(staticAmount * 100)}%`;
}

function applyFx() {
  const { ctx, chain } = state.audio;
  if (!ctx || !chain.master) return;
  const now = ctx.currentTime;
  const decay = sliderValue('decay');
  const wobble = sliderValue('wobble');
  const dirt = sliderValue('dirt');
  const voidAmount = sliderValue('void');

  chain.delayFeedback.gain.setTargetAtTime(0.04 + decay * 0.42, now, 0.06);
  chain.delayWet.gain.setTargetAtTime(0.08 + decay * 0.52, now, 0.06);
  chain.dry.gain.setTargetAtTime(0.85 - decay * 0.18, now, 0.06);

  chain.wowLfoGain.gain.setTargetAtTime(0.0001 + wobble * 0.0048, now, 0.06);
  chain.flutterLfoGain.gain.setTargetAtTime(0.00005 + wobble * 0.0012, now, 0.06);
  chain.bpLfoGain.gain.setTargetAtTime(40 + wobble * 260, now, 0.06);
  chain.bandpass.Q.setTargetAtTime(1.35 + wobble * 1.65, now, 0.06);

  chain.shaper.curve = makeCurve(dirt * 0.85);
  chain.post.gain.setTargetAtTime(0.86 - dirt * 0.08, now, 0.06);

  chain.reverbWet.gain.setTargetAtTime(0.06 + voidAmount * 0.5, now, 0.06);
  chain.reverbDry.gain.setTargetAtTime(0.96 - voidAmount * 0.22, now, 0.06);

  setNoiseProfile(state.audio.currentMode === 'processed' ? 'processed' : state.audio.currentMode === 'raw' ? 'raw' : 'idle');
}

function clearRuntimeWatchers() {
  for (const teardown of state.audio.runtimeWatchers) teardown();
  state.audio.runtimeWatchers = [];
}

function disconnectCurrentSource() {
  clearRuntimeWatchers();
  if (state.audio.sourceNode) {
    try {
      state.audio.sourceNode.disconnect();
    } catch {}
    state.audio.sourceNode = null;
  }
}

function stopCurrentStream({ bumpToken = true } = {}) {
  if (bumpToken) state.loadToken += 1;
  clearTimeout(state.tuneTimer);
  disconnectCurrentSource();

  if (state.audio.currentEl) {
    state.audio.currentEl.pause();
    state.audio.currentEl.src = '';
    state.audio.currentEl.removeAttribute('src');
    state.audio.currentEl.load();
    state.audio.currentEl = null;
  }

  state.audio.currentMode = 'silent';
  setNoiseProfile('idle');
  syncTelemetry();
}

function waitForAudioEvent(audio, timeout = 12000) {
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (fn, value) => {
      if (done) return;
      done = true;
      cleanup();
      fn(value);
    };

    const onPlaying = () => finish(resolve);
    const onCanPlay = () => finish(resolve);
    const onError = () => finish(reject, new Error('audio element failed'));
    const timer = window.setTimeout(() => finish(reject, new Error('stream timeout')), timeout);

    function cleanup() {
      window.clearTimeout(timer);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error', onError);
    }

    audio.addEventListener('playing', onPlaying, { once: true });
    audio.addEventListener('canplay', onCanPlay, { once: true });
    audio.addEventListener('error', onError, { once: true });
    audio.play().catch((error) => finish(reject, error));
  });
}

function makeAudioElement(url, useCors = true) {
  const audio = new Audio();
  audio.preload = 'none';
  audio.autoplay = false;
  audio.playsInline = true;
  if (useCors) audio.crossOrigin = 'anonymous';
  audio.src = url;
  return audio;
}

function markCooldown(station, reason = 'fault') {
  const existing = state.cooldowns.get(station.url) || { failures: 0 };
  const failures = existing.failures + 1;
  const cooldownUntil = Date.now() + Math.min(120000, 6000 * 2 ** (failures - 1));
  state.cooldowns.set(station.url, { failures, cooldownUntil, reason });
}

function clearCooldown(station) {
  state.cooldowns.delete(station.url);
}

function isStationCoolingDown(station) {
  const record = state.cooldowns.get(station.url);
  if (!record) return false;
  if (record.cooldownUntil <= Date.now()) {
    state.cooldowns.delete(station.url);
    return false;
  }
  return true;
}

function findNextViableIndex(startIndex = state.stationIndex, direction = 1) {
  if (!state.stations.length) return startIndex;
  for (let step = 1; step <= state.stations.length; step += 1) {
    const index = (startIndex + direction * step + state.stations.length) % state.stations.length;
    if (!isStationCoolingDown(state.stations[index])) return index;
  }
  return startIndex;
}

function buildProxyUrl(station, attempt = 0) {
  const url = new URL('/api/proxy', window.location.origin);
  url.searchParams.set('url', station.url);
  url.searchParams.set('attempt', String(attempt));
  url.searchParams.set('t', String(Date.now()));
  return url.toString();
}

function installRuntimeWatchers(audio, station, token) {
  clearRuntimeWatchers();
  let recoveryTimer = null;

  const scheduleRecovery = (reason) => {
    if (!state.powered || token !== state.loadToken) return;
    if (recoveryTimer) return;
    recoveryTimer = window.setTimeout(() => {
      recoveryTimer = null;
      if (!state.powered || token !== state.loadToken) return;
      recoverCurrentStation(reason).catch((error) => {
        console.error(error);
        setStatus('recovery routine faceplanted.', 'error');
      });
    }, 2600);
  };

  const listeners = [
    ['stalled', () => scheduleRecovery('stalled carrier')],
    ['emptied', () => scheduleRecovery('emptied buffer')],
    ['ended', () => scheduleRecovery('ended stream')],
    ['error', () => scheduleRecovery('runtime audio error')],
  ];

  listeners.forEach(([event, handler]) => audio.addEventListener(event, handler));
  state.audio.runtimeWatchers.push(() => {
    if (recoveryTimer) window.clearTimeout(recoveryTimer);
    listeners.forEach(([event, handler]) => audio.removeEventListener(event, handler));
  });
}

async function attachProcessedStream(audio, station, token) {
  const audioState = await ensureAudio();
  disconnectCurrentSource();
  audioState.sourceNode = audioState.ctx.createMediaElementSource(audio);
  audioState.sourceNode.connect(audioState.chain.input);
  state.audio.currentMode = 'processed';
  state.audio.currentEl = audio;
  installRuntimeWatchers(audio, station, token);
  setNoiseProfile('processed');
}

async function attachRawStream(audio, station, token) {
  disconnectCurrentSource();
  state.audio.currentEl = audio;
  state.audio.currentMode = 'raw';
  installRuntimeWatchers(audio, station, token);
  setNoiseProfile('raw');
}

async function tryProxyLoad(station, token) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const audio = makeAudioElement(buildProxyUrl(station, attempt), true);
    try {
      await waitForAudioEvent(audio, 12000 + attempt * 2000);
      if (token !== state.loadToken) {
        audio.pause();
        return false;
      }
      await attachProcessedStream(audio, station, token);
      clearCooldown(station);
      setStatus('carrier locked through proxy. effects active.', 'live');
      setRuntime('processed chain stable');
      setStationDisplay(station, 'processed');
      syncTelemetry();
      return true;
    } catch (error) {
      audio.pause();
      if (attempt === 0) setRuntime('proxy path slipped, retrying…');
      if (attempt === 1) throw error;
    }
  }
  return false;
}

async function tryDirectLoad(station, token) {
  const audio = makeAudioElement(`${station.url}${station.url.includes('?') ? '&' : '?'}t=${Date.now()}`, false);
  await waitForAudioEvent(audio, 12000);
  if (token !== state.loadToken) {
    audio.pause();
    return false;
  }
  await attachRawStream(audio, station, token);
  setStatus('station alive, but source refused processing. raw path only.', 'live');
  setRuntime('raw fallback active');
  setStationDisplay(station, 'raw fallback');
  syncTelemetry();
  return true;
}

async function tuneToCurrentStation(reason = 'manual') {
  const station = currentStation();
  if (!station) return;

  const token = ++state.loadToken;
  stopCurrentStream({ bumpToken: false });
  setNoiseProfile('tuning');
  setStatus(`retuning carrier… ${reason}`, 'idle');
  setRuntime('locking carrier');
  setStationDisplay(station, 'retuning…');

  try {
    const processed = await tryProxyLoad(station, token);
    if (processed) return;
  } catch (error) {
    console.warn('proxy path failed', error);
    setFault(`proxy fault · ${station.name}`);
  }

  if (token !== state.loadToken) return;

  try {
    const raw = await tryDirectLoad(station, token);
    if (raw) return;
  } catch (error) {
    console.warn('direct path failed', error);
    setFault(`direct fault · ${station.name}`);
  }

  if (token !== state.loadToken) return;
  await recoverCurrentStation('station unreachable');
}

async function recoverCurrentStation(reason = 'carrier fault') {
  const station = currentStation();
  if (!station) return;
  state.recoveries += 1;
  markCooldown(station, reason);
  setFault(`${reason} · ${station.name}`);
  setStatus(`carrier dropped. hopping around the graveyard…`, 'error');
  setRuntime('searching next viable station');
  setNoiseProfile('error');

  const nextIndex = findNextViableIndex(state.stationIndex, 1);
  if (nextIndex === state.stationIndex && isStationCoolingDown(station)) {
    state.cooldowns.clear();
  }

  state.stationIndex = nextIndex === state.stationIndex ? findNextViableIndex(state.stationIndex, -1) : nextIndex;
  state.dialValue = state.stationIndex / Math.max(1, state.stations.length - 1);
  updateFrequencyReadout();
  renderBandmap();
  syncTelemetry();
  setStationDisplay(currentStation(), 'recovered hop');
  queueTune(true, 'auto-recovery');
}

function queueTune(force = false, reason = 'manual') {
  if (!state.powered || !currentStation()) return;
  clearTimeout(state.tuneTimer);
  state.tuneTimer = window.setTimeout(() => {
    tuneToCurrentStation(reason).catch((error) => {
      console.error(error);
      setStatus('stream loading blew up. trying to recover.', 'error');
      recoverCurrentStation('tune exception').catch(console.error);
    });
  }, force ? 0 : 160);
}

async function powerOn() {
  if (!state.stations.length) return;
  state.powered = true;
  dom.powerBtn.textContent = 'power off';
  dom.powerBtn.classList.add('live');
  await ensureAudio();
  state.audio.chain.master.gain.setTargetAtTime(0.88, state.audio.ctx.currentTime, 0.35);
  setStatus('carrier locked. bring up the ghosts.', 'live');
  setRuntime('warming signal chain');
  syncTelemetry();
  queueTune(true, 'power-on');
}

function powerOff() {
  state.powered = false;
  dom.powerBtn.textContent = 'power on';
  dom.powerBtn.classList.remove('live');
  stopCurrentStream();
  if (state.audio.ctx) state.audio.chain.master.gain.setTargetAtTime(0, state.audio.ctx.currentTime, 0.22);
  setStatus('receiver sleeping.', 'idle');
  setRuntime('receiver sleeping');
  setStationDisplay(currentStation(), 'standby');
  syncTelemetry();
}

async function togglePower() {
  if (state.isLoadingStations) return;
  if (state.powered) {
    powerOff();
    return;
  }
  await powerOn();
}

function scanRandom() {
  if (!state.stations.length) return;
  let attempts = 0;
  let nextIndex = state.stationIndex;
  while (attempts < 20) {
    nextIndex = Math.floor(Math.random() * state.stations.length);
    if (!isStationCoolingDown(state.stations[nextIndex])) break;
    attempts += 1;
  }
  state.stationIndex = nextIndex;
  state.dialValue = nextIndex / Math.max(1, state.stations.length - 1);
  updateFrequencyReadout();
  renderBandmap();
  setStationDisplay(currentStation(), state.powered ? 'retuning…' : 'queued frequency');
  syncTelemetry();
  if (state.powered) queueTune(true, 'scan');
}

async function fetchStations() {
  setStatus('scanning radio-browser mirrors…', 'idle');
  setRuntime('building station cache');
  try {
    const response = await fetch('/api/stations');
    if (!response.ok) throw new Error(`stations endpoint returned ${response.status}`);
    const payload = await response.json();
    state.stations = payload.stations?.length ? payload.stations : FALLBACK_STATIONS;
    state.stationSource = payload.source === 'fallback' ? 'curated fallback' : 'radio-browser';
    state.usingFallback = payload.source === 'fallback';
    state.isLoadingStations = false;
    state.stationIndex = stationIndexFromDial();
    setStationDisplay(currentStation(), `${state.stations.length} frequencies cached`);
    setStatus(`${state.stations.length} stations loaded from ${payload.source}. tune when ready.`, 'idle');
    setRuntime('station cache ready');
    renderBandmap();
    syncTelemetry();
  } catch (error) {
    console.error(error);
    state.stations = FALLBACK_STATIONS;
    state.stationSource = 'curated fallback';
    state.usingFallback = true;
    state.isLoadingStations = false;
    state.stationIndex = stationIndexFromDial();
    setStationDisplay(currentStation(), 'offline fallback set');
    setStatus('radio-browser choked. using local fallback stations instead.', 'error');
    setRuntime('fallback cache ready');
    renderBandmap();
    syncTelemetry();
  }
}

function drawDial(now) {
  const { width, height } = dialBounds;
  dialCtx.clearRect(0, 0, width, height);

  const cx = width * 0.5;
  const cy = height * 0.75;
  const radius = Math.min(width * 0.42, height * 0.6);
  const t = (now - state.animationStart) / 1000;
  const glow = state.powered ? 0.55 + 0.45 * Math.sin(t * 2.1) : 0.12;
  const stationDensity = Math.max(24, Math.min(64, state.stations.length || 48));

  const bg = dialCtx.createRadialGradient(cx, cy, radius * 0.12, cx, cy, radius * 1.08);
  bg.addColorStop(0, 'rgba(136,204,255,0.12)');
  bg.addColorStop(1, 'rgba(136,204,255,0)');
  dialCtx.fillStyle = bg;
  dialCtx.fillRect(0, 0, width, height);

  dialCtx.beginPath();
  dialCtx.arc(cx, cy, radius, Math.PI, 0, false);
  dialCtx.strokeStyle = 'rgba(188, 208, 255, 0.26)';
  dialCtx.lineWidth = 2;
  dialCtx.stroke();

  for (let i = 0; i <= stationDensity; i += 1) {
    const angle = Math.PI + (i / stationDensity) * Math.PI;
    const major = i % 5 === 0;
    const inner = radius - (major ? 38 : 18);
    const outer = radius + (major ? 9 : 4);
    dialCtx.beginPath();
    dialCtx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    dialCtx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    dialCtx.strokeStyle = major ? 'rgba(216, 228, 255, 0.66)' : 'rgba(145, 164, 209, 0.24)';
    dialCtx.lineWidth = major ? 1.5 : 0.8;
    dialCtx.stroke();
  }

  const left = 87.5;
  const step = 20.5 / 5;
  dialCtx.fillStyle = 'rgba(194, 207, 240, 0.82)';
  dialCtx.font = '12px IBM Plex Mono';
  dialCtx.textAlign = 'center';
  for (let i = 0; i <= 5; i += 1) {
    const labelAngle = Math.PI + (i / 5) * Math.PI;
    dialCtx.fillText(`${(left + step * i).toFixed(1)}`, cx + Math.cos(labelAngle) * (radius - 58), cy + Math.sin(labelAngle) * (radius - 58) + 4);
  }

  const idleDrift = !state.powered ? Math.sin(t * 0.3 + state.driftPhase) * 0.0015 : 0;
  const needleAngle = Math.PI + (state.dialValue + idleDrift) * Math.PI;

  dialCtx.beginPath();
  dialCtx.moveTo(cx, cy);
  dialCtx.lineTo(cx + Math.cos(needleAngle) * (radius - 22), cy + Math.sin(needleAngle) * (radius - 22));
  dialCtx.strokeStyle = `rgba(136, 204, 255, ${0.2 + glow * 0.35})`;
  dialCtx.lineWidth = 10;
  dialCtx.stroke();

  dialCtx.beginPath();
  dialCtx.moveTo(cx, cy);
  dialCtx.lineTo(cx + Math.cos(needleAngle) * (radius - 24), cy + Math.sin(needleAngle) * (radius - 24));
  dialCtx.strokeStyle = state.powered ? '#e4efff' : 'rgba(145, 164, 209, 0.42)';
  dialCtx.lineWidth = 2;
  dialCtx.stroke();

  dialCtx.beginPath();
  dialCtx.arc(cx, cy, 7, 0, Math.PI * 2);
  dialCtx.fillStyle = state.powered ? '#ecf4ff' : 'rgba(145, 164, 209, 0.6)';
  dialCtx.fill();

  const station = currentStation();
  if (station) {
    dialCtx.fillStyle = 'rgba(216, 228, 255, 0.8)';
    dialCtx.font = '13px IBM Plex Mono';
    dialCtx.fillText(station.name.slice(0, 38), cx, cy + 38);
  }
}

function drawMeter(now) {
  const { width, height } = meterBounds;
  meterCtx.clearRect(0, 0, width, height);
  meterCtx.fillStyle = 'rgba(255,255,255,0.02)';
  meterCtx.fillRect(0, 0, width, height);

  const mid = height * 0.54;
  meterCtx.strokeStyle = 'rgba(255,255,255,0.06)';
  meterCtx.lineWidth = 1;
  meterCtx.beginPath();
  meterCtx.moveTo(0, mid);
  meterCtx.lineTo(width, mid);
  meterCtx.stroke();

  let level = 0;
  if (state.audio.analyser && state.audio.meterData && state.powered) {
    state.audio.analyser.getByteFrequencyData(state.audio.meterData);
    let sum = 0;
    for (const value of state.audio.meterData) sum += value;
    level = sum / (state.audio.meterData.length * 255);
    state.lastLevel += (level - state.lastLevel) * 0.16;
  } else {
    const t = (now - state.animationStart) / 1000;
    state.lastLevel = 0.03 + 0.02 * (0.5 + 0.5 * Math.sin(t * 0.8));
  }

  const bars = 46;
  const gap = 3;
  const barWidth = (width - gap * (bars - 1)) / bars;
  for (let i = 0; i < bars; i += 1) {
    const phase = (i / bars) * Math.PI * 3;
    const motion = 0.62 + 0.38 * Math.sin(now * 0.002 + phase);
    const magnitude = Math.max(0.05, state.lastLevel * motion);
    const barHeight = magnitude * (height * 0.88);
    const x = i * (barWidth + gap);
    const y = mid - barHeight * 0.5;
    meterCtx.fillStyle = state.powered ? 'rgba(136, 204, 255, 0.9)' : 'rgba(145, 164, 209, 0.34)';
    meterCtx.fillRect(x, y, barWidth, barHeight);
  }
}

function animate(now) {
  drawDial(now);
  drawMeter(now);
  requestAnimationFrame(animate);
}

function handlePointer(clientX) {
  const rect = dom.dialCanvas.getBoundingClientRect();
  const ratio = (clientX - rect.left) / rect.width;
  setDialValue(ratio);
}

function bindEvents() {
  dom.powerBtn.addEventListener('click', () => {
    togglePower().catch((error) => {
      console.error(error);
      setStatus('power-up failed. browser probably blocked audio.', 'error');
      setRuntime('audio bootstrap failed');
    });
  });

  dom.scanBtn.addEventListener('click', scanRandom);
  dom.recoverBtn.addEventListener('click', () => recoverCurrentStation('manual recover'));

  dom.dialCanvas.addEventListener('pointerdown', (event) => {
    dom.dialCanvas.setPointerCapture(event.pointerId);
    handlePointer(event.clientX);
  });

  dom.dialCanvas.addEventListener('pointermove', (event) => {
    if (event.buttons) handlePointer(event.clientX);
  });

  dom.dialCanvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    setDialValue(state.dialValue + (event.deltaY > 0 ? 0.012 : -0.012));
  }, { passive: false });

  document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      event.preventDefault();
      togglePower().catch(console.error);
      return;
    }

    if (event.code === 'ArrowRight' || event.code === 'ArrowDown') {
      event.preventDefault();
      setDialValue(state.dialValue + 0.012);
      return;
    }

    if (event.code === 'ArrowLeft' || event.code === 'ArrowUp') {
      event.preventDefault();
      setDialValue(state.dialValue - 0.012);
    }
  });

  for (const [name, input] of Object.entries(dom.sliders)) {
    input.addEventListener('input', () => {
      dom.values[name].textContent = input.value;
      applyFx();
    });
  }

  const onResize = () => {
    resizeCanvas(dom.dialCanvas, dialCtx, dialBounds);
    resizeCanvas(dom.meterCanvas, meterCtx, meterBounds);
  };

  window.addEventListener('resize', onResize);
  onResize();
}

async function init() {
  updateSliderLabels();
  updateFrequencyReadout();
  syncTelemetry();
  bindEvents();
  await fetchStations();
  requestAnimationFrame(animate);
}

init().catch((error) => {
  console.error(error);
  setStatus('initialization failed. something is cursed.', 'error');
  setRuntime('boot sequence failed');
});
