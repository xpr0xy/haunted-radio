# Haunted Radio

tuning the dead frequencies.

a web radio that pulls live streams from around the world and processes them through analog-degradation effects in real time. every session is unique.

## deploy (one command)

```bash
vercel login        # opens browser, sign in with github (free, no card)
vercel deploy       # gives you a live URL in ~30 seconds
```

that's it. you get a URL like `https://haunted-radio-xxx.vercel.app`

## or run locally

```bash
npm install
node api/local-server.js
# open http://localhost:3000
```

## what it does

- 200+ real radio stations from [radio-browser.info](https://www.radio-browser.info)
- real-time audio processing via Web Audio API:
  - bandpass filter with LFO drift
  - delay with wow/flutter (tape degradation)
  - feedback loops (ghostly trails)
  - waveshaper saturation
  - convolution reverb
  - generated static noise
- vintage dial UI
- every session is different (live sources)

## controls

- scroll / drag / arrow keys to tune the dial
- spacebar to power on/off
- sliders: decay, wobble, dirt, void, static

## how it works

radio streams don't have CORS headers, so browsers can't process them through the Web Audio API. the `api/proxy.js` serverless function adds CORS headers to any stream URL. deployed to Vercel's edge network — free tier handles 100k invocations/month.

## files

- `index.html` — the entire app (UI + audio engine)
- `api/proxy.js` — Vercel edge function, CORS proxy
- `api/local-server.js` — local Express server (same proxy, no deploy needed)
- `vercel.json` — routing config
