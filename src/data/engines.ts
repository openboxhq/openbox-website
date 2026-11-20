export interface Capability {
  name: string;
  detail: string;
}

export interface Engine {
  id: "progress" | "safety" | "security";
  label: string;
  title: string;
  lede: string;
  capabilities: Capability[];
}

/** The three products Openbox runs on the Dragonfruit AI platform, in detail. */
export const ENGINES: Engine[] = [
  {
    id: "progress",
    label: "Progress",
    title: "The site as built, every day.",
    lede: "Every capture lands on your drawings and your schedule, so the record of what is built is never a week old.",
    capabilities: [
      { name: "One timeline", detail: "Drones, site walks, site cameras and phone video, placed by date and location." },
      { name: "2D plan view", detail: "Every capture pinned to your floor plans. Step back to any day." },
      { name: "3D model", detail: "The building in 3D from plans and drone captures. BIM optional, in early access." },
      { name: "Milestones", detail: "Status by zone and trade. Detected by AI, verified by a reviewer." },
      { name: "Schedule", detail: "Import P6 or Microsoft Project. Verified milestones record actual dates." },
      { name: "Site search", detail: "Ask what happened in plain language and get the clip." },
    ],
  },
  {
    id: "safety",
    label: "Safety",
    title: "People safe, all day.",
    lede: "Every walk and every camera is checked for PPE and for people where they should not be. Each flag comes with the clip and the place on the plan.",
    capabilities: [
      { name: "PPE", detail: "Hard hats, hi-vis and harnesses." },
      { name: "Hazards", detail: "Falls, open edges, fire and smoke." },
      { name: "Exclusion zones", detail: "People inside crane swing and heavy-equipment zones." },
      { name: "Crew and equipment", detail: "Headcount by shift. Equipment use and idle time." },
    ],
  },
  {
    id: "security",
    label: "Security",
    title: "The site secure, every night.",
    lede: "The cameras that record progress by day watch the site after hours. A person reviews each alert before it reaches you.",
    capabilities: [
      { name: "After-hours alerts", detail: "Intrusion, theft and loitering, reviewed by a person before you are alerted." },
      { name: "Gate and deliveries", detail: "Plate reading at the gate. Deliveries matched to the schedule." },
      { name: "Live view and evidence", detail: "Every camera, time-lapse and search. Clips for claims and reports." },
    ],
  },
];

export type Coverage = "full" | "partial" | "none";

export interface CompareRow {
  capability: string;
  walkTools: Coverage;
  cameraVendors: Coverage;
  openbox: Coverage;
}

/** Typical coverage by product category, not by named vendor. */
export const COMPARE: CompareRow[] = [
  { capability: "Site walk capture", walkTools: "full", cameraVendors: "none", openbox: "full" },
  { capability: "Drone capture", walkTools: "partial", cameraVendors: "none", openbox: "full" },
  { capability: "Fixed site cameras", walkTools: "none", cameraVendors: "full", openbox: "full" },
  { capability: "2D plan view with history", walkTools: "full", cameraVendors: "none", openbox: "full" },
  { capability: "3D model without BIM", walkTools: "partial", cameraVendors: "none", openbox: "partial" },
  { capability: "Progress between walks", walkTools: "none", cameraVendors: "none", openbox: "full" },
  { capability: "Milestones verified by a person", walkTools: "partial", cameraVendors: "none", openbox: "full" },
  { capability: "Safety and PPE flags", walkTools: "none", cameraVendors: "partial", openbox: "full" },
  { capability: "After-hours security alerts", walkTools: "none", cameraVendors: "full", openbox: "full" },
  { capability: "One timeline for all of it", walkTools: "none", cameraVendors: "none", openbox: "full" },
];
