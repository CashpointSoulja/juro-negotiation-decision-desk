# Walkthrough video

- **File:** `public/video/walkthrough.mp4` (1366x934, H.264 and AAC, about 86 seconds). Subtitles are burned in. A separate track is in `video/walkthrough.vtt`.
- **Footage:** the production build (`npm run build`, served by `vite preview`) in Chromium at a 1366x854 desktop viewport. Every interaction is a real click, select or keystroke in the running app, with a drawn pointer so you can see where each click lands. No slides, zooms or mock-ups.
- **Voice:** an offline text-to-speech voice (Piper `en_GB-alba-medium`, an open-source model). No voice cloning, no face.
- **Sync:** each narration segment starts at the moment its actions begin in the recording. `record.mjs` writes those offsets, and `build.py` uses them to place the audio and subtitles.

## Rebuild
```bash
npm run build && npm run preview &                     # serves dist on :4173
Xvfb :99 -screen 0 1366x1000x24 &                      # virtual display
# generate video/out/<segment>.wav and durations.json from segments.json (any TTS)
DISPLAY=:99 node video/record.mjs                      # drives the UI, captures with ffmpeg x11grab
python3 video/build.py                                 # mixes the voice, adds subtitles, writes public/video/walkthrough.mp4
```

## Script
| Starts | Segment | Narration (subtitle text) |
|---|---|---|
| 0.8s | seed | This is the Negotiation Decision Desk, an independent concept built on synthetic data. A reviewer picks a contract and one of three fictional playbooks. Here is Larkspur's markup, checked against Fernbrook's playbook. |
| 13.7s | checks | Our standard clause sits on the left, their wording on the right. The rules highlight the exact term they read, cite the playbook rule and its version, show the acceptable deviation and the approver, and list every step. |
| 27.5s | success | Every Larkspur clause is within playbook, so auto-accept is available. One click, and the audit trail records the decision and the rule it relied on. |
| 37.2s | switch | Now the heavier Brightwater markup. A 2x liability cap is an acceptable deviation for Fernbrook. Switch to Alder Health, and the same wording escalates. |
| 47.2s | blocked | Alder's indemnity rules conflict. One says never uncapped, the data addendum allows it. So the desk abstains. Auto-accept is off, an override needs a written reason, and the reviewer rejects and counters. |
| 61.5s | edit | Back on Fernbrook, editing the cap to 1x the fees re-runs the rules. Deviation becomes within, and the edit is logged. |
| 69.8s | export | Export the review memo, with citations and the audit trail. Then the evals: 8 labelled fixtures, 0 false negatives against 3 in the baseline, 1 known false positive, and a passing release gate. |
