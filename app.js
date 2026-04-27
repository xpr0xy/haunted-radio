const FALLBACK_STATIONS = [
  { name: 'Classic Vinyl HD', url: 'https://icecast.walmradio.com:8443/classic', country: 'The United States Of America', codec: 'MP3', bitrate: 320, tags: 'oldies,jazz,lounge,swing' },
  { name: 'SomaFM Drone Zone', url: 'https://ice6.somafm.com/dronezone-128-mp3', country: 'The United States Of America', codec: 'MP3', bitrate: 128, tags: 'ambient,drone,space' },
  { name: 'SomaFM Dark Zone', url: 'https://ice6.somafm.com/darkzone-128-mp3', country: 'The United States Of America', codec: 'MP3', bitrate: 128, tags: 'dark ambient,experimental' },
  { name: 'BBC World Service', url: 'http://stream.live.vc.bbcmedia.co.uk/bbc_world_service', country: 'The United Kingdom', codec: 'MP3', bitrate: 56, tags: 'news,talk' },
  { name: 'MANGORADIO', url: 'https://mangoradio.stream.laut.fm/mangoradio', country: 'Germany', codec: 'MP3', bitrate: 128, tags: 'music,variety' },
  { name: '101 SMOOTH JAZZ', url: 'http://jking.cdnstream1.com/b22139_128mp3', country: 'The United States Of America', codec: 'MP3', bitrate: 128, tags: 'easy listening,jazz,smooth jazz' },
  { name: 'Radio Paradise Main Mix (EU) 320k AAC', url: 'http://stream-uk1.radioparadise.com/aac-320', country: 'The United States Of America', codec: 'AAC', bitrate: 320, tags: 'eclectic,ambient,rock' },
  { name: 'SWR3', url: 'https://liveradio.swr.de/sw282p3/swr3/play.mp3', country: 'Germany', codec: 'MP3', bitrate: 128, tags: 'news,pop,rock' },
  { name: 'Deutschlandfunk | DLF | MP3 128k', url: 'https://st01.sslstream.dlf.de/dlf/01/128/mp3/stream.mp3?aggregator=web', country: 'Germany', codec: 'MP3', bitrate: 128, tags: 'culture,news,public service' },
  { name: 'Dance Wave!', url: 'https://dancewave.online/dance.mp3', country: 'Hungary', codec: 'MP3', bitrate: 128, tags: 'dance,house,trance' },
  { name: 'JOE', url: 'https://stream.joe.nl/joe/aachigh', country: 'The Netherlands', codec: 'AAC+', bitrate: 95, tags: 'pop,rock' },
  { name: '1LIVE', url: 'http://wdr-1live-live.icecast.wdr.de/wdr/1live/live/mp3/128/stream.mp3', country: 'Germany', codec: 'MP3', bitrate: 128, tags: 'public radio,rock,top 40' },
];

const PRESETS = [
  {
    id: 'manual',
    name: 'manual',
    summary: 'raw machine state. tune first, then wreck it deliberately.',
    guidance: 'manual scene armed. lock a carrier and shape from zero.',
    values: null,
  },
  {
    id: 'numbers',
    name: 'numbers station',
    summary: 'tight bandpass, eerie tail, moderate wobble, disciplined static floor.',
    guidance: 'cold voice fragments and disciplined carrier fog.',
    values: { decay: 48, wobble: 36, dirt: 18, void: 58, static: 12 },
  },
  {
    id: 'graveyard',
    name: 'graveyard drift',
    summary: 'slow wow, long tails, soft corrosion, deep room bloom.',
    guidance: 'best for ambient carriers and half-dead talk radio.',
    values: { decay: 66, wobble: 63, dirt: 22, void: 74, static: 14 },
  },
  {
    id: 'pirate',
    name: 'pirate uplink',
    summary: 'punchier dirt, shorter tails, more flutter, slightly dirtier front-end.',
    guidance: 'for illicit club transmitters and rougher live music stations.',
    values: { decay: 35, wobble: 57, dirt: 34, void: 38, static: 9 },
  },
  {
    id: 'void',
    name: 'void bloom',
    summary: 'reverb-forward, unstable, fog-heavy, almost dissolving into the room.',
    guidance: 'use when you want the room to swallow the source.',
    values: { decay: 71, wobble: 44, dirt: 14, void: 88, static: 11 },
  },
];

const state = {
  powered: false,
  stations: [],
  stationSource: 'booting',
  usingFallback: false,
  dialValue: 0.43,
  stationIndex: 0,
  isLoadingStations: true,
  activePreset: 'manual',
  loadToken: 0,
  tuneTimer: null,
  driftPhase: Math.random() * Math.PI * 2,
  animationStart: performance.now(),
  recoveries: 0,
  lastFault: 'none',
  currentRuntime: 'receiver sleeping',
  eventLog: [],
  cooldowns: new Map(),
  analyserHistory: [],
  audio: {
    ctx: null,
    currentEl: null,
    currentMode: 'silent',
    sourceNode: null,
    analyser: null,
    meterData: null,
    timeData: null,
    runtimeWatchers: [],
    chain: {},
  },
};

const dom = {
  statusChip: document.getElementById('statusChip'),
  statusText: document.getElementById('statusText'),
  sourceBadge: document.getElementById('sourceBadge'),
  pathBadge: document.getElementById('pathBadge'),
  carrierBadge: document.getElementById('carrierBadge'),
  recoveryBadge: document.getElementById('recoveryBadge'),
  powerBtn: document.getElementById('powerBtn'),
  scanBtn: document.getElementById('scanBtn'),
  recoverBtn: document.getElementById('recoverBtn'),
  guidanceLine: document.getElementById('guidanceLine'),
  activePresetName: document.getElementById('activePresetName'),
  presetSummary: document.getElementById('presetSummary'),
  presetList: document.getElementById('presetList'),
  telemetryMode: document.getElementById('telemetryMode'),
  telemetryPath: document.getElementById('telemetryPath'),
  telemetryStation: document.getElementById('telemetryStation'),
  fallbackMode: document.getElementById('fallbackMode'),
  runtimeStatus: document.getElementById('runtimeStatus'),
  faultLine: document.getElementById('faultLine'),
  hostBadge: document.getElementById('hostBadge'),
  eventLog: document.getElementById('eventLog'),
  stationName: document.getElementById('stationName'),
  stationMeta: document.getElementById('stationMeta'),
  frequencyReadout: document.getElementById('frequencyReadout'),
  lockState: document.getElementById('lockState'),
  signalQuality: document.getElementById('signalQuality'),
  bandmapCount: document.getElementById('bandmapCount'),
  routeSource: document.getElementById('routeSource'),
  routeRecovery: document.getElementById('routeRecovery'),
  meterDetail: document.getElementById('meterDetail'),
  routeOutput: document.getElementById('routeOutput'),
  routeProxy: document.getElementById('routeProxy'),
  routeCanvas: document.getElementById('routeCanvas'),
  dialCanvas: document.getElementById('dialCanvas'),
  scopeCanvas: document.getElementById('scopeCanvas'),
  waterfallCanvas: document.getElementById('waterfallCanvas'),
  routeSourceReadout: document.getElementById('routeSourceReadout'),
  bandmapList: document.getElementById('bandmapList'),
  workflowSteps: {
    power: document.getElementById('stepPower'),
    preset: document.getElementById('stepPreset'),
    tune: document.getElementById('stepTune'),
    shape: document.getElementById('stepShape'),
  },
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
  fxViz: {
    decay: document.getElementById('viz-decay'),
    wobble: document.getElementById('viz-wobble'),
    dirt: document.getElementById('viz-dirt'),
    void: document.getElementById('viz-void'),
    static: document.getElementById('viz-static'),
  },
};

const ctxs = {
  dial: dom.dialCanvas.getContext('2d'),
  scope: dom.scopeCanvas.getContext('2d'),
  waterfall: dom.waterfallCanvas.getContext('2d'),
  route: dom.routeCanvas.getContext('2d'),
  fx: Object.fromEntries(Object.entries(dom.fxViz).map(([key, canvas]) => [key, canvas.getContext('2d')])),
};

const bounds = {
  dial: { width: 920, height: 520, dpr: 1 },
  scope: { width: 920, height: 220, dpr: 1 },
  waterfall: { width: 920, height: 220, dpr: 1 },
  route: { width: 920, height: 180, dpr: 1 },
  fx: Object.fromEntries(Object.keys(dom.fxViz).map((key) => [key, { width: 320, height: 112, dpr: 1 }])),
};

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

function presetById(id) {
  return PRESETS.find((preset) => preset.id === id) || PRESETS[0];
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
    .slice(0, 3)
    .join(' / ');
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

function pushEvent(message, level = 'info') {
  const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  state.eventLog.unshift({ stamp, message, level });
  state.eventLog = state.eventLog.slice(0, 10);
  renderEventLog();
}

function renderEventLog() {
  dom.eventLog.innerHTML = '';
  if (!state.eventLog.length) {
    const empty = document.createElement('div');
    empty.className = 'event-entry';
    empty.innerHTML = '<span>00:00:00</span><strong>boot tape empty</strong>';
    dom.eventLog.appendChild(empty);
    return;
  }

  state.eventLog.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'event-entry';
    item.innerHTML = `<span>${entry.stamp} · ${entry.level}</span><strong>${entry.message}</strong>`;
    dom.eventLog.appendChild(item);
  });
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
  dom.statusChip.dataset.mode = mode;
  dom.carrierBadge.textContent = mode;
}

function qualityLabel(level) {
  if (level > 0.72) return 'hot';
  if (level > 0.48) return 'locked';
  if (level > 0.22) return 'drifting';
  return 'quiet';
}

function updateWorkflow() {
  const preset = presetById(state.activePreset);
  dom.workflowSteps.power.classList.toggle('active', state.powered);
  dom.workflowSteps.preset.classList.toggle('active', state.activePreset !== 'manual');
  dom.workflowSteps.tune.classList.toggle('active', state.powered && state.audio.currentMode !== 'silent');
  dom.workflowSteps.shape.classList.toggle('active', state.powered && state.audio.currentMode !== 'silent' && preset.id !== 'manual');
}

function updateGuidance() {
  const preset = presetById(state.activePreset);
  if (state.isLoadingStations) {
    dom.guidanceLine.textContent = 'cache loading. once armed, either scan for a carrier or punch a preset first.';
    return;
  }

  if (!state.powered) {
    dom.guidanceLine.textContent = 'receiver is cold. power it on, then lock a carrier before shaping ghosts.';
    return;
  }

  if (state.audio.currentMode === 'silent') {
    dom.guidanceLine.textContent = 'chain is armed. tune the dial, hit scan, or click a carrier from the field.';
    return;
  }

  dom.guidanceLine.textContent = preset.guidance;
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
  dom.hostBadge.textContent = host;
  dom.routeSource.textContent = station ? station.name : 'live station';
  dom.routeSourceReadout.textContent = station ? `field around ${station.name}` : 'nearby frequencies';
  dom.routeProxy.textContent = state.audio.currentMode === 'processed' ? 'proxy locked' : state.audio.currentMode === 'raw' ? 'direct fallback' : 'awaiting lock';
  dom.routeOutput.textContent = state.audio.currentMode === 'processed' ? 'fx chain live' : state.audio.currentMode === 'raw' ? 'raw output' : 'silent bus';
  dom.routeRecovery.textContent = state.recoveries ? `${state.recoveries} recoveries` : 'ready';
  dom.signalQuality.textContent = qualityLabel(state.lastComputedLevel || 0);
  updateWorkflow();
  updateGuidance();
}

function setStationDisplay(station, note = '') {
  if (!station) {
    dom.stationName.textContent = '— dead air —';
    dom.stationMeta.textContent = note || 'waiting for carrier';
    return;
  }

  dom.stationName.textContent = station.name;
  const parts = [normalizeCountry(station.country), station.codec, station.bitrate ? `${station.bitrate} kbps` : ''];
  const tags = niceTags(station.tags);
  if (tags) parts.push(tags);
  if (note) parts.push(note);
  dom.stationMeta.textContent = parts.filter(Boolean).join(' · ');
}

function resizeCanvas(canvas, ctx, target) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  target.width = Math.max(1, Math.round(rect.width));
  target.height = Math.max(1, Math.round(rect.height));
  target.dpr = dpr;
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function applyPreset(id, { silent = false } = {}) {
  const preset = presetById(id);
  state.activePreset = preset.id;
  dom.activePresetName.textContent = preset.name;
  dom.presetSummary.textContent = preset.summary;

  if (preset.values) {
    for (const [name, value] of Object.entries(preset.values)) {
      dom.sliders[name].value = String(value);
    }
    updateSliderLabels();
    applyFx();
  }

  renderPresetList();
  updateGuidance();
  updateWorkflow();
  if (!silent) pushEvent(`scene loaded → ${preset.name}`, 'preset');
}

function renderPresetList() {
  dom.presetList.innerHTML = '';
  PRESETS.forEach((preset) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `preset-btn${preset.id === state.activePreset ? ' active' : ''}`;
    button.innerHTML = `<strong>${preset.name}</strong><small>${preset.summary}</small>`;
    button.addEventListener('click', () => applyPreset(preset.id));
    dom.presetList.appendChild(button);
  });
}

function renderBandmap() {
  dom.bandmapList.innerHTML = '';
  dom.bandmapCount.textContent = `${state.stations.length} loaded`;

  const count = Math.min(12, state.stations.length);
  if (!count) return;
  const start = clamp(state.stationIndex - 4, 0, Math.max(0, state.stations.length - count));
  const subset = state.stations.slice(start, start + count);

  subset.forEach((station, offset) => {
    const index = start + offset;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `bandmap-item${index === state.stationIndex ? ' active' : ''}`;
    const mhz = (87.5 + (index / Math.max(1, state.stations.length - 1)) * 20.5).toFixed(1);
    const cooling = isStationCoolingDown(station);
    button.innerHTML = `
      <div class="bandmap-head">
        <strong>${station.name}</strong>
        <span>${mhz} mhz</span>
      </div>
      <div class="bandmap-meta">${[normalizeCountry(station.country), station.codec, station.bitrate ? `${station.bitrate} kbps` : '', niceTags(station.tags)].filter(Boolean).join(' · ')}</div>
      <div class="bandmap-note">${cooling ? 'cooldown / unstable carrier' : index === state.stationIndex ? 'selected carrier' : 'click to retune'}</div>
    `;
    button.addEventListener('click', () => {
      state.stationIndex = index;
      state.dialValue = index / Math.max(1, state.stations.length - 1);
      updateFrequencyReadout();
      setStationDisplay(station, state.powered ? 'retuning…' : 'queued frequency');
      renderBandmap();
      syncTelemetry();
      pushEvent(`carrier selected → ${station.name}`, 'field');
      if (state.powered) queueTune(true, 'field-select');
    });
    dom.bandmapList.appendChild(button);
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
    syncTelemetry();
    if (state.powered && shouldTune) queueTune(false, 'manual-dial');
  }
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

function buildImpulseResponse(ctx, duration = 2.4, decay = 2) {
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
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
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
  chain.dry.gain.value = 0.72;

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
  chain.analyser.fftSize = 512;
  chain.analyser.smoothingTimeConstant = 0.86;

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
  state.audio.timeData = new Uint8Array(chain.analyser.fftSize);

  applyFx();
  setNoiseProfile('idle');
  await ctx.resume();
  pushEvent('audio chain initialized', 'audio');
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
}

function applyFx() {
  const { ctx, chain } = state.audio;
  if (ctx && chain.master) {
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

  drawAllFxViz(performance.now());
}

function clearRuntimeWatchers() {
  for (const teardown of state.audio.runtimeWatchers) teardown();
  state.audio.runtimeWatchers = [];
}

function disconnectCurrentSource() {
  clearRuntimeWatchers();
  if (state.audio.sourceNode) {
    try { state.audio.sourceNode.disconnect(); } catch {}
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
      pushEvent(`proxy lock acquired → ${station.name}`, 'lock');
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
  pushEvent(`direct fallback active → ${station.name}`, 'fallback');
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
  pushEvent(`retune requested → ${station.name} (${reason})`, 'tune');

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
  setStatus('carrier dropped. hopping around the graveyard…', 'error');
  setRuntime('searching next viable station');
  setNoiseProfile('error');
  pushEvent(`recovery hop → ${station.name} (${reason})`, 'recover');

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
  setStatus('carrier chain armed. bring up the ghosts.', 'live');
  setRuntime('warming signal chain');
  pushEvent('receiver armed', 'power');
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
  pushEvent('receiver powered down', 'power');
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
  pushEvent(`blind scan landed on → ${currentStation()?.name || 'unknown'}`, 'scan');
  syncTelemetry();
  if (state.powered) queueTune(true, 'scan');
}

async function fetchStations() {
  setStatus('scanning radio-browser mirrors…', 'idle');
  setRuntime('building station cache');
  pushEvent('scanning station mirrors', 'boot');
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
    pushEvent(`station cache ready → ${state.stations.length} carriers`, 'boot');
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
    pushEvent('radio-browser failed. fallback station pack armed.', 'error');
    renderBandmap();
    syncTelemetry();
  }
}

function sampleAudio(now) {
  if (state.audio.analyser && state.audio.meterData && state.audio.timeData && state.powered) {
    state.audio.analyser.getByteFrequencyData(state.audio.meterData);
    state.audio.analyser.getByteTimeDomainData(state.audio.timeData);
    let sum = 0;
    for (const value of state.audio.meterData) sum += value;
    const level = sum / (state.audio.meterData.length * 255);
    state.lastComputedLevel = level;
    state.analyserHistory.push([...state.audio.meterData]);
    if (state.analyserHistory.length > bounds.waterfall.height) state.analyserHistory.shift();
    dom.meterDetail.textContent = `${state.audio.currentMode} / ${Math.round(level * 100)}% field energy`;
  } else {
    const idle = 0.03 + 0.02 * (0.5 + 0.5 * Math.sin((now - state.animationStart) * 0.0008));
    state.lastComputedLevel = idle;
    dom.meterDetail.textContent = 'no analyser yet';
  }
}

function drawDial(now) {
  const ctx = ctxs.dial;
  const { width, height } = bounds.dial;
  ctx.clearRect(0, 0, width, height);

  const cx = width * 0.5;
  const cy = height * 0.73;
  const radius = Math.min(width * 0.41, height * 0.6);
  const t = (now - state.animationStart) / 1000;
  const glow = state.powered ? 0.55 + 0.45 * Math.sin(t * 2.1) : 0.12;
  const stationDensity = Math.max(24, Math.min(64, state.stations.length || 48));

  const bg = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius * 1.15);
  bg.addColorStop(0, 'rgba(80, 164, 255, 0.18)');
  bg.addColorStop(0.35, 'rgba(60, 95, 140, 0.10)');
  bg.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(170, 198, 245, 0.08)';
  for (let i = 0; i < 11; i += 1) {
    const y = 34 + i * ((height - 68) / 10);
    ctx.beginPath();
    ctx.moveTo(24, y);
    ctx.lineTo(width - 24, y);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI, 0, false);
  ctx.strokeStyle = 'rgba(188, 208, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius - 44, Math.PI, 0, false);
  ctx.strokeStyle = 'rgba(129, 154, 205, 0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();

  for (let i = 0; i <= stationDensity; i += 1) {
    const angle = Math.PI + (i / stationDensity) * Math.PI;
    const major = i % 5 === 0;
    const inner = radius - (major ? 46 : 22);
    const outer = radius + (major ? 9 : 4);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.strokeStyle = major ? 'rgba(220, 234, 255, 0.66)' : 'rgba(145, 164, 209, 0.22)';
    ctx.lineWidth = major ? 1.5 : 0.8;
    ctx.stroke();
  }

  const left = 87.5;
  const step = 20.5 / 5;
  ctx.fillStyle = 'rgba(200, 214, 245, 0.82)';
  ctx.font = '12px IBM Plex Mono';
  ctx.textAlign = 'center';
  for (let i = 0; i <= 5; i += 1) {
    const angle = Math.PI + (i / 5) * Math.PI;
    ctx.fillText(`${(left + step * i).toFixed(1)}`, cx + Math.cos(angle) * (radius - 66), cy + Math.sin(angle) * (radius - 66) + 4);
  }

  const idleDrift = !state.powered ? Math.sin(t * 0.3 + state.driftPhase) * 0.0015 : 0;
  const needleAngle = Math.PI + (state.dialValue + idleDrift) * Math.PI;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(needleAngle) * (radius - 20), cy + Math.sin(needleAngle) * (radius - 20));
  ctx.strokeStyle = `rgba(109, 197, 255, ${0.24 + glow * 0.4})`;
  ctx.lineWidth = 12;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(needleAngle) * (radius - 22), cy + Math.sin(needleAngle) * (radius - 22));
  ctx.strokeStyle = state.powered ? '#ecf4ff' : 'rgba(145, 164, 209, 0.42)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fillStyle = state.powered ? '#eff6ff' : 'rgba(145, 164, 209, 0.5)';
  ctx.fill();

  const station = currentStation();
  if (station) {
    ctx.fillStyle = 'rgba(218, 232, 255, 0.84)';
    ctx.font = '600 13px IBM Plex Mono';
    ctx.fillText(station.name.slice(0, 44), cx, cy + 48);
  }
}

function drawScope(now) {
  const ctx = ctxs.scope;
  const { width, height } = bounds.scope;
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(4, 6, 8, 0.96)';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(160, 188, 232, 0.08)';
  for (let i = 0; i < 8; i += 1) {
    const y = 18 + i * ((height - 36) / 7);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const mid = height * 0.5;
  ctx.strokeStyle = 'rgba(211, 227, 255, 0.16)';
  ctx.beginPath();
  ctx.moveTo(0, mid);
  ctx.lineTo(width, mid);
  ctx.stroke();

  ctx.beginPath();
  if (state.audio.timeData && state.powered) {
    const data = state.audio.timeData;
    for (let i = 0; i < data.length; i += 1) {
      const x = (i / (data.length - 1)) * width;
      const y = (data[i] / 255) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  } else {
    for (let i = 0; i < 180; i += 1) {
      const x = (i / 179) * width;
      const y = mid + Math.sin(i * 0.19 + now * 0.004) * 12 + Math.sin(i * 0.05 + now * 0.001) * 6;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  }
  ctx.strokeStyle = 'rgba(111, 208, 255, 0.9)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawWaterfall() {
  const ctx = ctxs.waterfall;
  const { width, height } = bounds.waterfall;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(4, 6, 8, 0.98)';
  ctx.fillRect(0, 0, width, height);

  const history = state.analyserHistory;
  if (!history.length) {
    ctx.fillStyle = 'rgba(145, 164, 209, 0.35)';
    ctx.font = '12px IBM Plex Mono';
    ctx.fillText('waterfall waiting for carrier', 16, 24);
    return;
  }

  const rows = Math.min(height, history.length);
  const bins = history[history.length - 1].length;
  for (let row = 0; row < rows; row += 1) {
    const data = history[history.length - 1 - row];
    for (let i = 0; i < bins; i += 1) {
      const x = (i / bins) * width;
      const w = Math.ceil(width / bins) + 1;
      const v = data[i] / 255;
      const hue = 205 - v * 48;
      const light = 6 + v * 63;
      ctx.fillStyle = `hsla(${hue}, 95%, ${light}%, ${0.18 + v * 0.82})`;
      ctx.fillRect(x, row, w, 1.15);
    }
  }
}

function drawRoute(now) {
  const ctx = ctxs.route;
  const { width, height } = bounds.route;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(4, 6, 8, 0.97)';
  ctx.fillRect(0, 0, width, height);

  const nodes = [
    { x: width * 0.14, y: height * 0.5, label: 'src' },
    { x: width * 0.38, y: height * 0.35, label: 'proxy' },
    { x: width * 0.38, y: height * 0.68, label: 'raw' },
    { x: width * 0.64, y: height * 0.5, label: 'fx' },
    { x: width * 0.86, y: height * 0.5, label: 'out' },
  ];
  const pulse = state.powered ? 0.5 + 0.5 * Math.sin(now * 0.004) : 0.14;

  ctx.strokeStyle = 'rgba(126, 155, 208, 0.18)';
  ctx.lineWidth = 2;
  [[0,1],[0,2],[1,3],[2,4],[3,4]].forEach(([a,b]) => {
    ctx.beginPath();
    ctx.moveTo(nodes[a].x, nodes[a].y);
    ctx.lineTo(nodes[b].x, nodes[b].y);
    ctx.stroke();
  });

  if (state.powered) {
    const sourcePath = state.audio.currentMode === 'raw' ? [0,2,4] : [0,1,3,4];
    ctx.strokeStyle = `rgba(110, 205, 255, ${0.38 + pulse * 0.42})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(nodes[sourcePath[0]].x, nodes[sourcePath[0]].y);
    for (let i = 1; i < sourcePath.length; i += 1) ctx.lineTo(nodes[sourcePath[i]].x, nodes[sourcePath[i]].y);
    ctx.stroke();
  }

  ctx.font = '11px IBM Plex Mono';
  ctx.textAlign = 'center';
  nodes.forEach((node, index) => {
    ctx.beginPath();
    ctx.arc(node.x, node.y, index === 4 ? 10 : 8, 0, Math.PI * 2);
    ctx.fillStyle = index === 4 ? `rgba(158, 236, 255, ${0.2 + pulse * 0.55})` : 'rgba(170, 196, 236, 0.34)';
    ctx.fill();
    ctx.fillStyle = 'rgba(214, 229, 255, 0.78)';
    ctx.fillText(node.label, node.x, node.y - 16);
  });
}

function drawFxViz(name, now) {
  const ctx = ctxs.fx[name];
  const { width, height } = bounds.fx[name];
  const amount = sliderValue(name);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(5, 7, 10, 0.98)';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(152, 177, 223, 0.08)';
  for (let i = 0; i < 5; i += 1) {
    const y = 14 + i * ((height - 28) / 4);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 110; i += 1) {
    const x = (i / 109) * width;
    let y = height * 0.5;
    if (name === 'decay') y += Math.sin(i * 0.23 + now * 0.001) * 16 * (1 - i / 110) * (0.4 + amount);
    if (name === 'wobble') y += Math.sin(i * (0.12 + amount * 0.22) + now * 0.004) * (8 + amount * 24);
    if (name === 'dirt') y += Math.sign(Math.sin(i * 0.2 + now * 0.002)) * (2 + amount * 18) + Math.sin(i * 0.58) * 4;
    if (name === 'void') y += Math.sin(i * 0.09 + now * 0.0015) * 10 + (i / 109) * amount * 30 - amount * 15;
    if (name === 'static') y += (Math.sin(i * 0.65 + now * 0.012) + Math.cos(i * 0.43 + now * 0.009)) * amount * 10;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = 'rgba(113, 206, 255, 0.88)';
  ctx.stroke();
}

function drawAllFxViz(now) {
  Object.keys(dom.fxViz).forEach((name) => drawFxViz(name, now));
}

function animate(now) {
  sampleAudio(now);
  drawDial(now);
  drawScope(now);
  drawWaterfall();
  drawRoute(now);
  drawAllFxViz(now);
  syncTelemetry();
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
      pushEvent('power-up failed', 'error');
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
      if (state.activePreset !== 'manual') {
        state.activePreset = 'manual';
        dom.activePresetName.textContent = 'manual';
        dom.presetSummary.textContent = 'manual override. you are now steering the damage yourself.';
        renderPresetList();
      }
      applyFx();
    });
  }

  const onResize = () => {
    resizeCanvas(dom.dialCanvas, ctxs.dial, bounds.dial);
    resizeCanvas(dom.scopeCanvas, ctxs.scope, bounds.scope);
    resizeCanvas(dom.waterfallCanvas, ctxs.waterfall, bounds.waterfall);
    resizeCanvas(dom.routeCanvas, ctxs.route, bounds.route);
    Object.entries(dom.fxViz).forEach(([name, canvas]) => resizeCanvas(canvas, ctxs.fx[name], bounds.fx[name]));
  };

  window.addEventListener('resize', onResize);
  onResize();
}

async function init() {
  updateSliderLabels();
  updateFrequencyReadout();
  renderEventLog();
  renderPresetList();
  applyPreset('manual', { silent: true });
  syncTelemetry();
  bindEvents();
  await fetchStations();
  requestAnimationFrame(animate);
}

init().catch((error) => {
  console.error(error);
  setStatus('initialization failed. something is cursed.', 'error');
  setRuntime('boot sequence failed');
  pushEvent('initialization failed', 'error');
});
