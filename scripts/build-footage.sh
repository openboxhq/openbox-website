#!/usr/bin/env bash
# Builds the site's film loops from the Pexels source clips (see public/media/CREDITS.md).
# Each clip gives a film loop and a matching half-size edge map with the same frame count.
# Usage: scripts/build-footage.sh <dir holding the source .mp4 files>
set -euo pipefail

SRC="${1:?source directory}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/media"
FADE=0.8
FPS=24

# Trims a segment and cross-fades its tail into its head so the loop has no visible cut.
loop_graph() {
  local len=$1 w=$2 h=$3 pre=$4
  local offset
  offset=$(echo "$len - 2 * $FADE" | bc)
  echo "[0:v]fps=$FPS,scale=$w:$h:flags=lanczos,${pre}split[h0][b0];
    [h0]trim=0:$FADE,setpts=PTS-STARTPTS,fps=$FPS[head];
    [b0]trim=$FADE:$len,setpts=PTS-STARTPTS,fps=$FPS[body];
    [body][head]xfade=transition=fade:duration=$FADE:offset=$offset"
}

# name source start length width height crf prefilter
film() {
  local name=$1 src=$2 start=$3 len=$4 w=$5 h=$6 crf=$7 pre=$8
  ffmpeg -v error -y -ss "$start" -t "$len" -i "$SRC/$src" \
    -filter_complex "$(loop_graph "$len" "$w" "$h" "$pre"),format=yuv420p[out]" \
    -map "[out]" -an -c:v libx264 -preset slow -crf "$crf" -movflags +faststart "$OUT/$name.mp4"
  ffmpeg -v error -y -i "$OUT/$name.mp4" -frames:v 1 -q:v 5 "$OUT/$name.jpg"
}

# name source start length width height low high
edges() {
  local name=$1 src=$2 start=$3 len=$4 w=$5 h=$6 low=$7 high=$8
  ffmpeg -v error -y -ss "$start" -t "$len" -i "$SRC/$src" \
    -filter_complex "$(loop_graph "$len" "$w" "$h" ""),format=gray,gblur=sigma=1.1,edgedetect=low=$low:high=$high,format=yuv420p[out]" \
    -map "[out]" -an -c:v libx264 -preset slow -crf 34 -movflags +faststart "$OUT/$name-edge.mp4"
}

film  hero     4404097.mp4  0 10  1920 1080 26 ""
film  hero-sm  4404097.mp4  0 10  960  540  27 ""
edges hero     4404097.mp4  0 10  960  540  0.10 0.26
film  progress 33893697.mp4 0 8   1280 720  26 ""
edges progress 33893697.mp4 0 8   640  360  0.08 0.22
film  security 39644096.mp4 9 7   1280 720  26 "gblur=sigma=1.5,"
edges security 39644096.mp4 9 7   640  360  0.05 0.15
film  safety   13569683.mp4 0 5.5 1280 720  26 ""
edges safety   13569683.mp4 0 5.5 640  360  0.06 0.18
ls -la "$OUT"
