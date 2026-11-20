# Third-party assets

Everything on the site that Openbox did not make itself. Last reviewed 2026-11-20.

## Footage

All clips come from Pexels and are used under the Pexels licence (https://www.pexels.com/license/):
free for commercial use, edits allowed, no credit required. Downloaded on 2026-11-20.
The creators keep the copyright. `scripts/build-footage.sh` rebuilds every file below from the sources.

| Files | Clip | Creator | Source |
|---|---|---|---|
| hero, hero-sm, hero-wide | Drone Shot of the Construction Site | K | https://www.pexels.com/video/drone-shot-of-the-construction-site-4404097/ |
| progress, progress-wide | Aerial View of Construction Site with Steel Frame | David Pickup | https://www.pexels.com/video/aerial-view-of-construction-site-with-steel-frame-33893697/ |
| security | Empty City Street at Night with Construction | Altaf Shah | https://www.pexels.com/video/city-street-at-night-with-construction-39644096/ |
| safety | Workers Talking on Construction | Waleed Talat | https://www.pexels.com/video/workers-talking-on-construction-13569683/ |

The Pexels licence does not cover the trademarks, property or people that appear in a clip, so each
clip is edited to keep them out:

- **hero:** cropped to 76% so the crane cab plates and a painted wall sign are out of frame.
- **progress:** cropped to 94% so a lorry trailer with a logo on the motorway is out of frame. In the
  wide still, two small site cabins with a hire company's mark are patched out.
- **security:** the hoarding banners and the passing van are filled to blank white panels.
- **safety:** uses only the seconds where both workers face away from the camera.

Rules for anything drawn over this footage:

- Do not imply that a person, company or site in the footage uses or endorses Openbox.
- Do not show a person in the footage as at fault. Tags over real people stay neutral, for example
  "Hard hat · OK". Example violations belong on drawn figures only.

## Fonts

Self-hosted through the `@fontsource` packages, all under the SIL Open Font License 1.1, which
permits use and redistribution on a commercial website. The licence text ships in each package.

| Font | Copyright |
|---|---|
| Instrument Serif | The Instrument Serif Project Authors |
| Inter Tight | The Inter Project Authors |
| IBM Plex Mono | IBM Corp. |

## Photos and logos

| Files | What | Basis for use |
|---|---|---|
| images/advisors/*.jpg | Portraits of the two advisors | Provided by the Openbox team |
| images/brand/dragonfruit-logo*.svg | Dragonfruit AI logo | Openbox is a Dragonfruit AI company |
| brand/*, favicon.* | Openbox mark | Made for Openbox |

## Software

Astro (MIT) builds the site. No third-party script, style or tracker loads in the browser.
