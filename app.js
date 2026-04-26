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
  dialValue: 0.43,
  stationIndex: 0,
  isLoadingStations: true,
  loadToken: 0,
  tuneTimer: null,
  driftPhase: Math.random() * Math.PI * 2,
  lastLevel: 0,
  animationStart: performance.now(),
  audio: {
    ctx: null,
    currentEl: null,
    currentMode: 'silent',
    sourceNode: null,
    analyser: null,
    meterData: null,
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
  telemetryMode: document.getElementById('telemetryMode'),
  telemetryPath: document.getElementById('telemetryPath'),
  telemetryStation: document.getElementById('telemetryStation'),
  powerBtn: document.getElementById('powerBtn'),
  scanBtn: document.getElementById('scanBtn'),
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

function setStatus(text, mode = 'idle') {
  dom.statusText.textContent = text;
  dom.statusChip.textContent = mode;
  dom.statusChip.classList.toggle('live', mode === 'live');
  dom.statusChip.classList.toggle('error', mode === 'error');
  syncTelemetry();
}

function syncTelemetry() {
  dom.telemetryMode.textContent = state.powered ? 'powered' : 'standby';
  dom.telemetryPath.textContent = state.audio.currentMode;
  dom.telemetryStation.textContent = `${state.stations.length ? state.stationIndex + 1 : 0} / ${state.stations.length}`;
}

function setStationDisplay(station, note = '') {
  if (!station) {
    dom.stationName.textContent = '— dead air —';
    dom.stationMeta.textContent = note || 'waiting for carrier';
    return;
  }

  dom.stationName.textContent = station.name;
  const bits = [station.country, station.codec, station.bitrate ? `${station.bitrate} kbps` : ''];
  if (station.tags) bits.push(station.tags.split(',').slice(0, 2).join(' / '));
  if (note) bits.push(note);
  dom.stationMeta.textContent = bits.filter(Boolean).join('  ·  ');
}

function sliderValue(name) {
  return Number(dom.sliders[name].value) / 100;
}

function updateSliderLabels() {
  for (const [name, input] of Object.entries(dom.sliders)) {
    dom.values[name].textContent = input.value;
  }
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

function updateFrequencyReadout() {
  const freq = 87.5 + state.dialValue * 20.5;
  dom.frequencyReadout.textContent = `${freq.toFixed(1)} MHz`;
}

function currentStation() {
  return state.stations[state.stationIndex] || null;
}

function stationIndexFromDial() {
  if (!state.stations.length) return 0;
  return Math.max(0, Math.min(state.stations.length - 1, Math.round(state.dialValue * (state.stations.length - 1))));
}

function setDialValue(next, { shouldTune = true } = {}) {
  state.dialValue = Math.max(0, Math.min(1, next));
  updateFrequencyReadout();

  const nextIndex = stationIndexFromDial();
  if (nextIndex !== state.stationIndex) {
    state.stationIndex = nextIndex;
    setStationDisplay(currentStation(), state.powered ? 'retuning…' : 'queued frequency');
    if (state.powered && shouldTune) queueTune();
  }
  syncTelemetry();
}

function queueTune(force = false) {
  if (!state.powered || !currentStation()) return;
  clearTimeout(state.tuneTimer);
  state.tuneTimer = setTimeout(() => {
    tuneToCurrentStation(force).catch((error) => {
      console.error(error);
      setStatus('stream loading blew up. try another station.', 'error');
    });
  }, force ? 0 : 140);
}

function makeCurve(amount) {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const k = 2 + amount * 320;
  for (let i = 0; i < samples; i += 1) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

function buildImpulseResponse(ctx, duration = 2.8, decay = 2.2) {
  const length = Math.floor(ctx.sampleRate * duration);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      const time = i / length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - time, decay);
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
  chain.highpass.frequency.value = 90;

  chain.bandpass = ctx.createBiquadFilter();
  chain.bandpass.type = 'bandpass';
  chain.bandpass.frequency.value = 920;
  chain.bandpass.Q.value = 2.4;

  chain.dry = ctx.createGain();
  chain.dry.gain.value = 0.52;

  chain.delay = ctx.createDelay(0.8);
  chain.delay.delayTime.value = 0.09;
  chain.delayFeedback = ctx.createGain();
  chain.delayFeedback.gain.value = 0.28;
  chain.delayWet = ctx.createGain();
  chain.delayWet.gain.value = 0.48;

  chain.shaper = ctx.createWaveShaper();
  chain.shaper.curve = makeCurve(0.32);
  chain.shaper.oversample = '4x';

  chain.post = ctx.createGain();
  chain.post.gain.value = 0.74;

  chain.convolver = ctx.createConvolver();
  chain.convolver.buffer = buildImpulseResponse(ctx);
  chain.reverbWet = ctx.createGain();
  chain.reverbWet.gain.value = 0.4;
  chain.reverbDry = ctx.createGain();
  chain.reverbDry.gain.value = 0.7;

  chain.master = ctx.createGain();
  chain.master.gain.value = 0;

  chain.staticGain = ctx.createGain();
  chain.staticGain.gain.value = 0.04;

  chain.analyser = ctx.createAnalyser();
  chain.analyser.fftSize = 128;

  chain.bpLfo = ctx.createOscillator();
  chain.bpLfo.type = 'sine';
  chain.bpLfo.frequency.value = 0.08;
  chain.bpLfoGain = ctx.createGain();
  chain.bpLfoGain.gain.value = 210;
  chain.bpLfo.connect(chain.bpLfoGain);
  chain.bpLfoGain.connect(chain.bandpass.frequency);

  chain.wowLfo = ctx.createOscillator();
  chain.wowLfo.type = 'sine';
  chain.wowLfo.frequency.value = 0.28;
  chain.wowLfoGain = ctx.createGain();
  chain.wowLfoGain.gain.value = 0.0034;
  chain.wowLfo.connect(chain.wowLfoGain);
  chain.wowLfoGain.connect(chain.delay.delayTime);

  chain.flutterLfo = ctx.createOscillator();
  chain.flutterLfo.type = 'triangle';
  chain.flutterLfo.frequency.value = 4.6;
  chain.flutterLfoGain = ctx.createGain();
  chain.flutterLfoGain.gain.value = 0.0008;
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
  await ctx.resume();
  return state.audio;
}

function applyFx() {
  const { ctx, chain } = state.audio;
  if (!ctx || !chain.master) return;
  const now = ctx.currentTime;
  const decay = sliderValue('decay');
  const wobble = sliderValue('wobble');
  const dirt = sliderValue('dirt');
  const voidAmount = sliderValue('void');
  const staticAmount = sliderValue('static');

  chain.delayFeedback.gain.setTargetAtTime(0.08 + decay * 0.56, now, 0.06);
  chain.delayWet.gain.setTargetAtTime(0.12 + decay * 0.55, now, 0.06);
  chain.dry.gain.setTargetAtTime(0.78 - decay * 0.24, now, 0.06);

  chain.wowLfoGain.gain.setTargetAtTime(0.0004 + wobble * 0.0062, now, 0.06);
  chain.flutterLfoGain.gain.setTargetAtTime(0.0002 + wobble * 0.0024, now, 0.06);
  chain.bpLfoGain.gain.setTargetAtTime(60 + wobble * 360, now, 0.06);
  chain.bandpass.Q.setTargetAtTime(1.9 + wobble * 2.4, now, 0.06);

  chain.shaper.curve = makeCurve(dirt);
  chain.post.gain.setTargetAtTime(0.62 + dirt * 0.28, now, 0.06);

  chain.reverbWet.gain.setTargetAtTime(voidAmount * 0.86, now, 0.06);
  chain.reverbDry.gain.setTargetAtTime(0.95 - voidAmount * 0.44, now, 0.06);

  chain.staticGain.gain.setTargetAtTime(0.012 + staticAmount * 0.2, now, 0.06);
}

function disconnectCurrentSource() {
  if (state.audio.sourceNode) {
    try {
      state.audio.sourceNode.disconnect();
    } catch {
      // ignore stale disconnects
    }
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

    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error', onError);
    audio.play().catch((error) => finish(reject, error));
  });
}

function makeAudioElement(url, useCors = true) {
  const audio = new Audio();
  audio.preload = 'none';
  audio.autoplay = false;
  if (useCors) audio.crossOrigin = 'anonymous';
  audio.src = url;
  return audio;
}

async function attachProcessedStream(audio) {
  const audioState = await ensureAudio();
  disconnectCurrentSource();
  audioState.sourceNode = audioState.ctx.createMediaElementSource(audio);
  audioState.sourceNode.connect(audioState.chain.input);
  state.audio.currentMode = 'processed';
}

async function loadViaProxy(station, token) {
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(station.url)}`;
  const audio = makeAudioElement(proxyUrl, true);
  await waitForAudioEvent(audio, 12000);
  if (token !== state.loadToken) {
    audio.pause();
    return false;
  }
  await attachProcessedStream(audio);
  state.audio.currentEl = audio;
  setStatus('broadcasting through proxy. effects active.', 'live');
  setStationDisplay(station, 'processed');
  syncTelemetry();
  return true;
}

async function loadDirect(station, token) {
  const audio = makeAudioElement(station.url, false);
  await waitForAudioEvent(audio, 12000);
  if (token !== state.loadToken) {
    audio.pause();
    return false;
  }
  state.audio.currentEl = audio;
  state.audio.currentMode = 'raw';
  setStatus('station is alive, but the source refused processing. raw feed only.', 'live');
  setStationDisplay(station, 'raw feed');
  syncTelemetry();
  return true;
}

async function tuneToCurrentStation(force = false) {
  const station = currentStation();
  if (!station) return;

  const token = force ? ++state.loadToken : state.loadToken + 1;
  if (!force) state.loadToken = token;

  stopCurrentStream({ bumpToken: false });
  setStatus('retuning carrier…', 'idle');
  setStationDisplay(station, 'retuning…');

  try {
    const processed = await loadViaProxy(station, token);
    if (processed) return;
  } catch (error) {
    console.warn('proxy path failed', error);
  }

  if (token !== state.loadToken) return;

  try {
    await loadDirect(station, token);
  } catch (error) {
    console.warn('direct path failed', error);
    if (token !== state.loadToken) return;
    setStatus('this station is dead. hit scan and move on.', 'error');
    setStationDisplay(station, 'unreachable');
  }
}

async function powerOn() {
  if (!state.stations.length) return;
  state.powered = true;
  dom.powerBtn.textContent = 'power off';
  dom.powerBtn.classList.add('live');
  syncTelemetry();
  await ensureAudio();
  state.audio.chain.master.gain.setTargetAtTime(0.85, state.audio.ctx.currentTime, 0.4);
  setStatus('carrier locked. bring up the ghosts.', 'live');
  queueTune(true);
}

function powerOff() {
  state.powered = false;
  dom.powerBtn.textContent = 'power on';
  dom.powerBtn.classList.remove('live');
  syncTelemetry();
  stopCurrentStream();
  if (state.audio.ctx) {
    state.audio.chain.master.gain.setTargetAtTime(0, state.audio.ctx.currentTime, 0.22);
  }
  setStatus('receiver sleeping.', 'idle');
  setStationDisplay(currentStation(), 'standby');
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
  const nextIndex = Math.floor(Math.random() * state.stations.length);
  state.stationIndex = nextIndex;
  state.dialValue = nextIndex / Math.max(1, state.stations.length - 1);
  updateFrequencyReadout();
  setStationDisplay(currentStation(), state.powered ? 'retuning…' : 'queued frequency');
  if (state.powered) queueTune(true);
  syncTelemetry();
}

async function fetchStations() {
  setStatus('scanning public radio-browser mirrors…', 'idle');
  try {
    const response = await fetch('/api/stations');
    if (!response.ok) throw new Error(`stations endpoint returned ${response.status}`);
    const payload = await response.json();
    state.stations = payload.stations?.length ? payload.stations : FALLBACK_STATIONS;
    state.isLoadingStations = false;
    state.stationIndex = stationIndexFromDial();
    syncTelemetry();
    setStationDisplay(currentStation(), `${state.stations.length} frequencies cached`);
    setStatus(`${state.stations.length} stations loaded from ${payload.source}. tune when ready.`, 'idle');
  } catch (error) {
    console.error(error);
    state.stations = FALLBACK_STATIONS;
    state.isLoadingStations = false;
    state.stationIndex = stationIndexFromDial();
    syncTelemetry();
    setStationDisplay(currentStation(), 'offline fallback set');
    setStatus('radio-browser choked. using local fallback stations instead.', 'error');
  }
}

function drawDial(now) {
  const { width, height } = dialBounds;
  dialCtx.clearRect(0, 0, width, height);

  const cx = width * 0.5;
  const cy = height * 0.76;
  const radius = Math.min(width * 0.42, height * 0.62);
  const t = (now - state.animationStart) / 1000;
  const livePulse = state.powered ? 0.55 + 0.45 * Math.sin(t * 2.2) : 0.18;
  const stationDensity = Math.max(24, Math.min(64, state.stations.length || 48));

  const bg = dialCtx.createRadialGradient(cx, cy, radius * 0.12, cx, cy, radius * 1.08);
  bg.addColorStop(0, 'rgba(255,216,145,0.06)');
  bg.addColorStop(1, 'rgba(255,216,145,0)');
  dialCtx.fillStyle = bg;
  dialCtx.fillRect(0, 0, width, height);

  dialCtx.beginPath();
  dialCtx.arc(cx, cy, radius, Math.PI, 0, false);
  dialCtx.strokeStyle = 'rgba(224, 190, 126, 0.22)';
  dialCtx.lineWidth = 2;
  dialCtx.stroke();

  for (let i = 0; i <= stationDensity; i += 1) {
    const angle = Math.PI + (i / stationDensity) * Math.PI;
    const major = i % 5 === 0;
    const inner = radius - (major ? 34 : 18);
    const outer = radius + (major ? 7 : 4);
    dialCtx.beginPath();
    dialCtx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    dialCtx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    dialCtx.strokeStyle = major ? 'rgba(238, 206, 140, 0.54)' : 'rgba(201, 168, 108, 0.2)';
    dialCtx.lineWidth = major ? 1.6 : 0.8;
    dialCtx.stroke();
  }

  const left = 87.5;
  const step = 20.5 / 5;
  dialCtx.fillStyle = 'rgba(215, 186, 131, 0.7)';
  dialCtx.font = '12px IBM Plex Mono';
  dialCtx.textAlign = 'center';
  for (let i = 0; i <= 5; i += 1) {
    const labelAngle = Math.PI + (i / 5) * Math.PI;
    dialCtx.fillText(`${(left + step * i).toFixed(1)}`, cx + Math.cos(labelAngle) * (radius - 54), cy + Math.sin(labelAngle) * (radius - 54) + 4);
  }

  const idleDrift = !state.powered ? Math.sin(t * 0.35 + state.driftPhase) * 0.0018 : 0;
  const needleAngle = Math.PI + (state.dialValue + idleDrift) * Math.PI;

  dialCtx.beginPath();
  dialCtx.moveTo(cx, cy);
  dialCtx.lineTo(cx + Math.cos(needleAngle) * (radius - 28), cy + Math.sin(needleAngle) * (radius - 28));
  dialCtx.strokeStyle = `rgba(242, 213, 156, ${0.25 + livePulse * 0.35})`;
  dialCtx.lineWidth = 8;
  dialCtx.stroke();

  dialCtx.beginPath();
  dialCtx.moveTo(cx, cy);
  dialCtx.lineTo(cx + Math.cos(needleAngle) * (radius - 28), cy + Math.sin(needleAngle) * (radius - 28));
  dialCtx.strokeStyle = state.powered ? '#f2d59c' : 'rgba(177, 149, 94, 0.4)';
  dialCtx.lineWidth = 2;
  dialCtx.stroke();

  dialCtx.beginPath();
  dialCtx.arc(cx, cy, 7, 0, Math.PI * 2);
  dialCtx.fillStyle = state.powered ? '#f7e4bb' : 'rgba(177, 149, 94, 0.55)';
  dialCtx.fill();

  const station = currentStation();
  if (station) {
    dialCtx.fillStyle = 'rgba(210, 179, 118, 0.72)';
    dialCtx.font = '13px IBM Plex Mono';
    dialCtx.fillText(station.name.slice(0, 34), cx, cy + 34);
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
    state.lastLevel += (level - state.lastLevel) * 0.18;
  } else {
    const t = (now - state.animationStart) / 1000;
    state.lastLevel = 0.05 + 0.03 * (0.5 + 0.5 * Math.sin(t * 0.8));
  }

  const bars = 44;
  const barGap = 4;
  const barWidth = (width - barGap * (bars - 1)) / bars;
  for (let i = 0; i < bars; i += 1) {
    const phase = (i / bars) * Math.PI * 3;
    const motion = 0.65 + 0.35 * Math.sin(now * 0.002 + phase);
    const magnitude = Math.max(0.08, state.lastLevel * motion);
    const barHeight = magnitude * (height * 0.84);
    const x = i * (barWidth + barGap);
    const y = mid - barHeight * 0.5;
    meterCtx.fillStyle = state.powered ? 'rgba(242, 213, 156, 0.88)' : 'rgba(177, 149, 94, 0.34)';
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
    });
  });

  dom.scanBtn.addEventListener('click', scanRandom);

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
});
