import type { DrawingKind } from "../scripts/story-drawings";
import type { FilmTag } from "../scripts/story";

export interface Pillar {
  id: string;
  name: string;
  title: string;
  /** One line for the product menu. */
  line: string;
  /** The fuller claim on the home page. */
  detail: string;
  specs: string[];
  /** How this product's footage is captured. */
  capture: string;
  /** Basename of the film loop in public/media. */
  media: string;
  /** Label on the footage layer. */
  source: string;
  /** Title block on the drawing layer. */
  sheet: string;
  drawing: DrawingKind;
  /** Findings on the insights layer. Tags over footage of real people stay neutral: no person is shown as at fault. */
  tags: FilmTag[];
  /** One status line per day, Monday to today. */
  readouts: string[];
}

/** The three products Openbox sells on one capture network; shared by the nav menu and the home page. */
export const PILLARS: Pillar[] = [
  {
    id: "progress",
    name: "Progress",
    title: "Know what changed since yesterday.",
    line: "A dated record of every day on site, checked against your schedule.",
    detail: "Every drone flight, site walk and camera feed is mapped to your drawings and saved as a dated version of the site. Compare any two days, bay by bay.",
    specs: ["Drone surveys and site walks", "Mapped to your drawings", "Compare any two days"],
    capture: "Drones",
    media: "progress",
    source: "DRONE 02",
    sheet: "S-201 · STEEL FRAMING PLAN",
    drawing: "progress",
    tags: [
      { x: 0.58, y: 0.2, text: "STEEL FRAME · GRID E–F" },
      { x: 0.44, y: 0.47, text: "+{bays} BAYS SINCE MONDAY" },
      { x: 0.06, y: 0.76, text: "SLAB · ZONE 2 NOT STARTED", tone: "alert" },
    ],
    readouts: [2, 3, 4, 5, 6, 7, 8].map((n) => `${n} of 24 bays complete`),
  },
  {
    id: "safety",
    name: "Safety",
    title: "Catch risk between walks.",
    line: "PPE, exclusion zones and open edges, flagged with the clip.",
    detail: "Hard hats, hi-vis, exclusion zones and open edges, checked on every walk and every camera, and flagged with the clip and the place on the plan.",
    specs: ["Hard hats and hi-vis", "Exclusion zones and open edges", "Flagged with clip and place"],
    capture: "Site walks",
    media: "safety",
    source: "SITE WALK 12",
    sheet: "A-110 · LOGISTICS PLAN",
    drawing: "safety",
    tags: [
      { x: 0.26, y: 0.2, text: "HARD HAT · OK" },
      { x: 0.6, y: 0.42, text: "HI-VIS · OK" },
      { x: 0.06, y: 0.82, text: "2 PEOPLE · OUTSIDE EXCLUSION ZONE" },
    ],
    readouts: [3, 2, 4, 2, 3, 3, 2].map((n) => `${n} people checked, no flags`),
  },
  {
    id: "security",
    name: "Security",
    title: "Own the night.",
    line: "After-hours alerts, reviewed by a person before they reach you.",
    detail: "The cameras that record progress by day watch the fence by night. Each alert is placed on the site plan and reviewed by a person before it reaches you.",
    specs: ["People and vehicles after hours", "Placed on the site plan", "Reviewed by a person"],
    capture: "Site cameras",
    media: "security",
    source: "SITE CAM 04",
    sheet: "C-101 · SITE AND PERIMETER PLAN",
    drawing: "security",
    tags: [
      { x: 0.3, y: 0.52, text: "VEHICLE AT GATE 2 · 02:14", tone: "alert", days: [3, 6] },
      { x: 0.5, y: 0.24, text: "PERIMETER · SECURE", days: [0, 1, 2, 4, 5] },
      { x: 0.06, y: 0.8, text: "REVIEWED BY A PERSON", days: [3, 6] },
    ],
    readouts: [0, 1, 2, 3, 4, 5, 6].map((d) => ([3, 6].includes(d) ? "1 after-hours alert, reviewed and sent" : "No after-hours activity")),
  },
];

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today"];

export interface Vertical {
  name: string;
  line: string;
}

export const VERTICALS: Vertical[] = [
  { name: "Commercial", line: "Towers, offices, hospitals and campuses." },
  { name: "Industrial", line: "Plants, warehouses and logistics hubs." },
  { name: "Infrastructure", line: "Bridges, roads, rail and utilities." },
];
