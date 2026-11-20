#!/usr/bin/env bash
# Builds the site's film loops and stills from the Pexels source clips (see public/media/CREDITS.md).
# Each clip is cropped or filtered so that no third-party logo, sign or vehicle marking stays readable.
# Usage: scripts/build-footage.sh <dir holding the source .mp4 files>
set -euo pipefail

SRC="${1:?source directory}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/media"
FADE=1
FPS=24

# Crops that keep 16:9 and cut third-party marks out of frame.
# Hero: drops the right and top edges, where the crane cab plates and a painted wall sign sit.
HERO_CROP="crop=iw*0.76:ih*0.76:0:ih*0.12,"
# Progress: drops the motorway along the top edge, where a lorry trailer carries a logo.
PROGRESS_CROP="crop=iw*0.94:ih*0.94:iw*0.03:ih*0.06,"
# Security: a daytime drone clip graded to a monochrome night-camera look. The small median filter
# removes the lettering on the machines, which the wide framing already leaves a few pixels tall.
NIGHT_GRADE="format=gray,median=radius=1,eq=gamma=0.74:contrast=1.22:brightness=-0.1,curves=all='0/0 0.25/0.12 0.6/0.42 0.85/0.74 1/0.94',vignette=angle=PI/4,noise=alls=5:allf=t,"

# Builds the in-between frames when a clip is slowed past its own frame rate, so it stays smooth.
SMOOTH="minterpolate=fps=$FPS:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1"

# name source start seconds slowdown width height crf crop prefilter [rate filter]
# Trims a segment, optionally slows it, and cross-fades its tail into its head so the loop has no visible cut.
film() {
  local name=$1 src=$2 start=$3 seconds=$4 slow=$5 w=$6 h=$7 crf=$8 crop=$9 pre=${10} rate=${11:-fps=$FPS}
  local len offset
  len=$(echo "$seconds * $slow" | bc)
  offset=$(echo "$len - 2 * $FADE" | bc)
  ffmpeg -v error -y -ss "$start" -t "$seconds" -i "$SRC/$src" -filter_complex "
    [0:v]setpts=$slow*PTS,${crop}scale=$w:$h:flags=lanczos,${rate},${pre}split[h0][b0];
    [h0]trim=0:$FADE,setpts=PTS-STARTPTS,fps=$FPS[head];
    [b0]trim=$FADE:$len,setpts=PTS-STARTPTS,fps=$FPS[body];
    [body][head]xfade=transition=fade:duration=$FADE:offset=$offset,format=yuv420p[out]" \
    -map "[out]" -an -c:v libx264 -preset slow -crf "$crf" -movflags +faststart "$OUT/$name.mp4"
  ffmpeg -v error -y -i "$OUT/$name.mp4" -frames:v 1 -q:v 5 "$OUT/$name.jpg"
}

# name source second crop postfilter
# Exports one sharp frame from the 4K source for the page heroes, which show a still across the full width.
still() {
  local name=$1 src=$2 at=$3 crop=$4 post=$5
  ffmpeg -v error -y -ss "$at" -i "$SRC/$src" -frames:v 1 -vf "${crop}scale=2880:1620:flags=lanczos${post}" -c:v libwebp -quality 82 "$OUT/$name-wide.webp"
}

film hero     4404097.mp4  0   12  1   1920 1080 25 "$HERO_CROP" ""
film hero-sm  4404097.mp4  0   12  1   960  540  26 "$HERO_CROP" ""
film progress 33893697.mp4 0   15  1   1280 720  24 "$PROGRESS_CROP" ""
# Seconds 4 to 7.5 only: earlier the machines fill the frame and their lettering is readable,
# later the view opens onto houses and parked cars. Slowed three times, with in-between frames built.
film security 29568504.mp4 4   3.5 3   1280 720  24 "" "$NIGHT_GRADE" "$SMOOTH"
# The walk uses the seconds where both workers face away, slowed from 60 to 24 frames a second.
film safety   13569683.mp4 1.2 3.6 2.5 1280 720  24 "" ""
still hero     4404097.mp4  6 "$HERO_CROP" ""
# The delogo patch covers two small site cabins that carry a hire company's mark.
still progress 33893697.mp4 2 "$PROGRESS_CROP" ",delogo=x=685:y=1288:w=107:h=47"
ls -la "$OUT"
