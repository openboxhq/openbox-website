export interface ProductModule {
  name: string;
  detail: string;
}

export interface Product {
  id: "twin" | "watch";
  name: string;
  category: string;
  summary: string;
  anchor: string;
  modules: ProductModule[];
}

export const PRODUCTS: Product[] = [
  {
    id: "twin",
    name: "Openbox Twin",
    category: "Digital twin and progress",
    summary: "A dated visual record of your site on your floor plans, with progress verified by a person.",
    anchor: "twin",
    modules: [
      { name: "Capture hub", detail: "Fixed IP cameras, 360° walk video, drone and phone video on one timeline" },
      { name: "Plan view", detail: "Every capture placed on the floor plan; step back to any earlier date" },
      { name: "3D model view", detail: "The building in 3D from plans and drone captures; BIM optional (early access)" },
      { name: "Milestone status", detail: "Status by zone and trade: detected by AI, verified by an Openbox reviewer" },
      { name: "Schedule link", detail: "Import P6 or Microsoft Project; verified milestones record actual dates" },
      { name: "Issues and daily reports", detail: "Issues pinned to the plan; draft daily reports for your superintendent to review" },
      { name: "Site search", detail: "Ask what happened in plain language and get the clip" },
    ],
  },
  {
    id: "watch",
    name: "Openbox Watch",
    category: "Jobsite monitoring",
    summary: "Safety, logistics and security on the same cameras, day and night.",
    anchor: "monitoring",
    modules: [
      { name: "Safety and PPE", detail: "Hard hats, hi-vis and harnesses; falls, open edges, fire and smoke" },
      { name: "Exclusion zones", detail: "People inside crane swing and heavy-equipment zones" },
      { name: "Gate and deliveries", detail: "Plate reading at the gate; deliveries matched to the schedule" },
      { name: "Crew and equipment", detail: "Headcount by shift; equipment utilization and idle time" },
      { name: "After-hours security", detail: "Intrusion, theft and loitering, reviewed by a person" },
      { name: "Live view and evidence", detail: "Every camera, time-lapse and search; clips for claims and reports" },
    ],
  },
];
