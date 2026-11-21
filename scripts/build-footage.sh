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

# The site walk's speed ramp. Times are seconds from the start of the segment.
WALK_SLOW=2.5      # slow motion before the step: 60 fps source shown at 24
WALK_DEEP=7        # slow motion while the foot lands
WALK_END=3         # slow motion the clip eases back to
WALK_RAMP_IN=2.5   # the walk starts slowing here
WALK_DEEP_IN=2.9   # deepest slow motion from here, just before the foot lands at 3.0
WALK_DEEP_OUT=3.2  # and it starts easing back here
# How far the walk pushes in, from the start of the slow-down to the end of the clip, as a share of the frame.
PUSH=0.16

# name source start seconds width height crf
# The site walk: slow motion that slows much further as the left worker's foot lands, with a push-in
# over the same seconds. Nothing is held: in-between frames are built first (four per source frame),
# so the deepest slow motion still shows a new image on every frame.
walk() {
  local name=$1 src=$2 start=$3 seconds=$4 w=$5 h=$6 crf=$7
  local a=$WALK_RAMP_IN b=$WALK_DEEP_IN c=$WALK_DEEP_OUT d=$4
  local k1 k2 fa fb fc total offset zoom_from zoom_frames remap
  k1=$(echo "scale=6; ($WALK_DEEP - $WALK_SLOW) / ($b - $a)" | bc)
  k2=$(echo "scale=6; ($WALK_END - $WALK_DEEP) / ($d - $c)" | bc)
  fa=$(echo "scale=6; $WALK_SLOW * $a" | bc)
  fb=$(echo "scale=6; $fa + $WALK_SLOW * ($b - $a) + $k1 / 2 * ($b - $a) ^ 2" | bc)
  fc=$(echo "scale=6; $fb + $WALK_DEEP * ($c - $b)" | bc)
  total=$(echo "scale=3; ($fc + $WALK_DEEP * ($d - $c) + $k2 / 2 * ($d - $c) ^ 2) / 1" | bc)
  offset=$(echo "$total - 2 * $FADE" | bc)
  zoom_from=$(echo "$fa * $FPS / 1" | bc)
  zoom_frames=$(echo "($total - $fa) * $FPS / 1" | bc)
  remap="if(lt(T,$a),$WALK_SLOW*T,if(lt(T,$b),$fa+$WALK_SLOW*(T-$a)+$k1/2*pow(T-$a,2),if(lt(T,$c),$fb+$WALK_DEEP*(T-$b),$fc+$WALK_DEEP*(T-$c)+$k2/2*pow(T-$c,2))))"
  ffmpeg -v error -y -ss "$start" -t "$seconds" -i "$SRC/$src" -filter_complex "
    [0:v]scale=1600:900:flags=lanczos,minterpolate=fps=240000/1001:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,setpts='($remap)/TB',fps=$FPS,scale=3200:1800:flags=bicubic,zoompan=z='if(lt(on,$zoom_from),1,if(lt(on,$zoom_from+$zoom_frames),1+$PUSH*pow((on-$zoom_from)/$zoom_frames,2)*(3-2*(on-$zoom_from)/$zoom_frames),1+$PUSH))':x='(iw-iw/zoom)*0.5':y='(ih-ih/zoom)*0.82':d=1:s=${w}x${h}:fps=$FPS,split[h0][b0];
    [h0]trim=0:$FADE,setpts=PTS-STARTPTS,fps=$FPS[head];
    [b0]trim=$FADE:$total,setpts=PTS-STARTPTS,fps=$FPS[body];
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
# The hero shows the night clip across the full width, so it gets a full-HD version. At that size the
# machines' lettering is readable until second 8, when the nearest excavator leaves the frame.
# It plays at 1.25 times slower, which maps each 30 fps source frame to one 24 fps frame.
film security-hero 29568504.mp4 8 4.5 1.25 1920 1080 25 "" "$NIGHT_GRADE"
# The walk uses seconds 1.2 to 4.8 of the source, where both workers face away.
walk safety   13569683.mp4 1.2 3.6 1280 720 24
still hero     4404097.mp4  6 "$HERO_CROP" ""
# The delogo patch covers two small site cabins that carry a hire company's mark.
still progress 33893697.mp4 2 "$PROGRESS_CROP" ",delogo=x=685:y=1288:w=107:h=47"
ls -la "$OUT"
