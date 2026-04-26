# haunted radio

tuning the dead frequencies without the broken public-proxy clown show.

## what changed

- proper first-party `/api/proxy` stream proxy for Vercel and local dev
- separate `/api/stations` endpoint with mirror failover + fallback station pack
- rebuilt UI into a cleaner three-panel receiver instead of muddy single-file spaghetti
- fixed the old retune race bug where the generation counter invalidated itself and stacked loads like a dumbass
- mobile-safe layout, keyboard controls, visible status states, and an actual signal meter
- simpler audio path: bandpass drift, wow/flutter delay, saturation, convolution tail, controllable static floor

## run locally

```bash
npm install
npm run dev
# open http://localhost:3027
```

## deploy

```bash
vercel --prod --token "$VERCEL_TOKEN" --yes
```

that gives you a public Vercel deployment with the proxy enabled. github pages is the wrong tool here because the whole point is live stream processing through web audio, and that means CORS has to be handled server-side.
