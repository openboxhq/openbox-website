import type { FilmTag } from "../scripts/film";

export interface Pillar {
  id: string;
  name: string;
  title: string;
  /** One line for the product menu. */
  line: string;
  /** The fuller claim on the home page. */
  detail: string;
  specs: string[];
  /** Basename of the film loop in public/media. */
  media: string;
  /** Findings drawn on the front plate over the film. */
  tags: FilmTag[];
}

/** The three products Openbox sells on one capture network; shared by the nav menu and the home page. */
export const PILLARS: Pillar[] = [
  {
    id: "progress",
    name: "Progress",
    title: "Know what changed since yesterday.",
    line: "A dated record of every day on site, checked against your schedule.",
    detail: "Every drone flight, site walk and camera feed adds a dated version of the site. Compare any two days, bay by bay, against your schedule.",
    specs: ["Drone surveys and site walks", "Compare any two days", "Checked against the schedule"],
    media: "progress",
    tags: [
      { x: 0.62, y: 0.2, text: "STEEL FRAME · GRID C–F" },
      { x: 0.5, y: 0.48, text: "+3 BAYS SINCE MONDAY" },
      { x: 0.12, y: 0.74, text: "SLAB · ZONE 2 NOT STARTED", tone: "alert" },
    ],
  },
  {
    id: "security",
    name: "Security",
    title: "Own the night.",
    line: "After-hours alerts, reviewed by a person before they reach you.",
    detail: "The cameras that record progress by day watch the fence by night. A person reviews each alert before it reaches you.",
    specs: ["People and vehicles after hours", "Reviewed by a person", "Clip saved to the record"],
    media: "security",
    tags: [
      { x: 0.34, y: 0.5, text: "VEHICLE · AFTER HOURS 02:14", tone: "alert" },
      { x: 0.56, y: 0.26, text: "PERIMETER · SECURE" },
      { x: 0.1, y: 0.8, text: "REVIEWED BY A PERSON" },
    ],
  },
  {
    id: "safety",
    name: "Safety",
    title: "Catch risk between walks.",
    line: "PPE, exclusion zones and open edges, flagged with the clip.",
    detail: "Hard hats, hi-vis, exclusion zones and open edges, checked all day and flagged with the clip and the place.",
    specs: ["Hard hats and hi-vis", "Exclusion zones and open edges", "Flagged with clip and place"],
    media: "safety",
    tags: [
      { x: 0.3, y: 0.18, text: "HARD HAT · OK" },
      { x: 0.62, y: 0.42, text: "HI-VIS · OK" },
      { x: 0.08, y: 0.76, text: "2 PEOPLE · ZONE B" },
    ],
  },
];

export interface Vertical {
  name: string;
  line: string;
}

export const VERTICALS: Vertical[] = [
  { name: "Commercial", line: "Towers, offices, hospitals and campuses." },
  { name: "Industrial", line: "Plants, warehouses and logistics hubs." },
  { name: "Infrastructure", line: "Bridges, roads, rail and utilities." },
];
