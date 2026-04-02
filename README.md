# Haunted Radio

tuning the dead frequencies.

a web-based haunted radio that pulls live internet radio streams from around the world and processes them through analog-degradation effects in real time. every session is unique. the sources are alive.

## what it does

- streams real radio stations (200+ from radio-browser.info)
- processes audio through Web Audio API chain:
  - bandpass filter with LFO drift (tuning instability)
  - delay with wow/flutter modulation (tape degradation)
  - feedback loops (ghostly trails)
  - waveshaper saturation (analog warmth/dirt)
  - convolution reverb (the void)
  - generated static noise (between stations)
- vintage dial UI with canvas rendering
- all processing happens in the browser, in real time
- no two sessions are the same

## controls

- **scroll** over the dial to tune between stations
- **drag** the dial to sweep frequencies
- **arrow keys** for fine tuning
- **spacebar** to power on/off
- **sliders** to adjust processing:
  - decay — delay feedback (how long ghosts linger)
  - wobble — tape pitch instability
  - dirt — saturation/overdrive
  - void — reverb depth
  - static — noise floor

## run it

```bash
cd haunted-radio
npm install
node server.js
```

open http://localhost:3000

## requirements

- node 18+
- a browser that supports Web Audio API (all modern ones do)
- internet connection (for station list and streams)
