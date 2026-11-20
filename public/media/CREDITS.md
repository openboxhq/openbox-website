# Third-party assets

Everything on the site that Openbox did not make itself. Last reviewed 2026-11-20.

## Footage

All clips come from Pexels and are used under the Pexels licence (https://www.pexels.com/license/)
and Terms of Service (https://www.pexels.com/terms-of-service/, version of 2026-10-20): free for
commercial use, edits allowed, no credit required. Downloaded on 2026-11-20; each clip page showed
"License: Free" on that date. The creators keep the copyright.
`scripts/build-footage.sh` rebuilds every file below from the sources.

| Files | Clip | Creator | Source |
|---|---|---|---|
| hero, hero-sm, hero-wide | Drone Shot of the Construction Site | K | https://www.pexels.com/video/drone-shot-of-the-construction-site-4404097/ |
| progress, progress-wide | Aerial View of Construction Site with Steel Frame | David Pickup | https://www.pexels.com/video/aerial-view-of-construction-site-with-steel-frame-33893697/ |
| security | Aerial View of Construction Site with Excavators | David Pickup | https://www.pexels.com/video/aerial-view-of-construction-site-with-excavators-29568504/ |
| safety | Workers Talking on Construction | Waleed Talat | https://www.pexels.com/video/workers-talking-on-construction-13569683/ |

Pexels does not warrant model or property releases, and its Terms bar commercial use of content that
shows trademarks, logos or brands. Each clip is therefore edited to keep those out:

- **hero:** cropped to 76% so the crane cab plates and a painted wall sign are out of frame.
- **progress:** cropped to 94% so a lorry trailer with a logo on the motorway is out of frame. In the
  wide still, two small site cabins with a hire company's mark are patched out.
- **security:** a daytime clip graded to a night-camera look. It uses only seconds 4 to 7.5, where the
  machines are small enough that their owner's lettering cannot be read, and before houses come into view.
- **safety:** uses only the seconds where both workers face away from the camera.

If anyone raises a claim about a clip, the Pexels Terms require that we stop using it at once:
remove its files from `public/media`, redeploy, and tell Pexels.

Rules for anything drawn over this footage:

- Do not imply that a person, company or site in the footage uses or endorses Openbox.
- Do not show a person in the footage as at fault. Tags over real people stay neutral, for example
  "Hard hat · OK". Example violations belong on drawn figures only.

## Fonts

All three are under the SIL Open Font License 1.1, which permits self-hosting on a commercial
website. The licence text for each is published in `/licenses/`.

| Font | Copyright | Files | Licence text |
|---|---|---|---|
| Instrument Serif | The Instrument Serif Project Authors | `@fontsource/instrument-serif` | licenses/instrument-serif-OFL.txt |
| Inter Tight | The Inter Project Authors | `@fontsource-variable/inter-tight` | licenses/inter-tight-OFL.txt |
| IBM Plex Mono | IBM Corp., reserved font name "Plex" | IBM's own Latin-1 files in `src/fonts/ibm-plex-mono` | licenses/ibm-plex-mono-OFL.txt |

IBM reserves the name "Plex", so a modified or re-subsetted copy may not carry it. The site ships
IBM's own files unchanged. Do not swap them for a re-subsetted build.

## Photos and logos

| Files | What | Basis for use |
|---|---|---|
| images/advisors/*.jpg | Portraits of the two advisors | Provided by the Openbox team |
| images/brand/dragonfruit-logo*.svg | Dragonfruit AI logo | Openbox is a Dragonfruit AI company |
| brand/*, favicon.* | Openbox mark | Made for Openbox |

## Software

Astro (MIT) builds the site. No third-party script, style or tracker loads in the browser.
