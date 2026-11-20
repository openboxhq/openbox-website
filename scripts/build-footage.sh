#!/usr/bin/env bash
# Builds the site's film loops from the Pexels source clips (see public/media/CREDITS.md).
# Usage: scripts/build-footage.sh <dir holding the source .mp4 files>
set -euo pipefail

SRC="${1:?source directory}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/media"
FADE=1
FPS=24

# name source start seconds slowdown width height crf prefilter
# Trims a segment, optionally slows it, and cross-fades its tail into its head so the loop has no visible cut.
film() {
  local name=$1 src=$2 start=$3 seconds=$4 slow=$5 w=$6 h=$7 crf=$8 pre=$9
  local len offset
  len=$(echo "$seconds * $slow" | bc)
  offset=$(echo "$len - 2 * $FADE" | bc)
  ffmpeg -v error -y -ss "$start" -t "$seconds" -i "$SRC/$src" -filter_complex "
    [0:v]setpts=$slow*PTS,fps=$FPS,scale=$w:$h:flags=lanczos,${pre}split[h0][b0];
    [h0]trim=0:$FADE,setpts=PTS-STARTPTS,fps=$FPS[head];
    [b0]trim=$FADE:$len,setpts=PTS-STARTPTS,fps=$FPS[body];
    [body][head]xfade=transition=fade:duration=$FADE:offset=$offset,format=yuv420p[out]" \
    -map "[out]" -an -c:v libx264 -preset slow -crf "$crf" -movflags +faststart "$OUT/$name.mp4"
  ffmpeg -v error -y -i "$OUT/$name.mp4" -frames:v 1 -q:v 5 "$OUT/$name.jpg"
}

film hero     4404097.mp4  0 12  1 1920 1080 25 ""
film hero-sm  4404097.mp4  0 12  1 960  540  26 ""
film progress 33893697.mp4 0 15  1 1280 720  24 ""
film security 39644096.mp4 4 16  1 1280 720  24 "gblur=sigma=1.5,"
film safety   13569683.mp4 0 5.6 2 1280 720  24 ""
ls -la "$OUT"
