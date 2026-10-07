"""Assembles the walkthrough: screen recording + timed voiceover + subtitles -> MP4.
Run from repo root after `node video/record.mjs`: python3 video/build.py"""
import json, re, subprocess

segs = json.load(open('video/segments.json'))
durs = json.load(open('video/out/durations.json'))
rec = json.load(open('video/out/offsets.json'))
off, total = rec['offsets'], rec['total']

def ts(t, sep):
    h, r = divmod(t, 3600); m, s = divmod(r, 60)
    return f"{int(h):02}:{int(m):02}:{int(s):02}{sep}{int(round((s % 1) * 1000)):03}"

cues = []
for s in segs:
    start, dur = off[s['id']], durs[s['id']]
    parts, cur = [], ''
    for sent in re.split(r'(?<=[.:])\s+', s['sub']):
        if cur and len(cur) + len(sent) > 95: parts.append(cur); cur = sent
        else: cur = f"{cur} {sent}".strip()
    parts.append(cur)
    n = sum(len(p) for p in parts); t = start
    for p in parts:
        d = dur * len(p) / n
        cues.append((t, t + d, p)); t += d

with open('video/out/subs.srt', 'w') as f:
    for i, (a, b, txt) in enumerate(cues, 1): f.write(f"{i}\n{ts(a, ',')} --> {ts(b, ',')}\n{txt}\n\n")
with open('video/walkthrough.vtt', 'w') as f:
    f.write('WEBVTT\n\n')
    for a, b, txt in cues: f.write(f"{ts(a, '.')} --> {ts(b, '.')}\n{txt}\n\n")

inputs, filt = [], []
for i, s in enumerate(segs):
    inputs += ['-i', f"video/out/{s['id']}.wav"]
    ms = int(off[s['id']] * 1000)
    filt.append(f"[{i + 1}:a]adelay={ms}|{ms}[a{i}]")
filt.append(''.join(f'[a{i}]' for i in range(len(segs))) + f"amix=inputs={len(segs)}:normalize=0,apad[aout]")
style = "FontName=DejaVu Sans,FontSize=7,PrimaryColour=&H00FFFFFF,BorderStyle=1,Outline=0,Shadow=0,Alignment=2,MarginV=5,MarginL=20,MarginR=20"
filt.append(f"[0:v]pad=1366:934:0:0:color=0x111111,subtitles=video/out/subs.srt:force_style='{style}'[vout]")
subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', 'video/out/screen.mp4', *inputs,
                '-filter_complex', ';'.join(filt), '-map', '[vout]', '-map', '[aout]', '-t', f'{total:.2f}',
                '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p', '-r', '30',
                '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-map_metadata', '-1',
                '-metadata', 'title=Negotiation Decision Desk walkthrough', '-metadata', 'artist=Ayo Ahmed',
                'public/video/walkthrough.mp4'], check=True)
print('cues', len(cues), 'duration', round(total, 2))
