export interface Module {
  name: string;
  tagline: string;
  pitch: string;
}

/** Offerings without list prices: scope and price are agreed with the customer during a pilot. */
export const MODULES: Module[] = [
  {
    name: "Watch",
    tagline: "Jobsite monitoring",
    pitch: "Safety, logistics and security on the cameras you already have.",
  },
  {
    name: "Twin",
    tagline: "Digital twin and progress",
    pitch: "A verified record of what is built, on your plans and schedule.",
  },
];

export const PRICING_NOTES = [
  "Pilot on one live project",
  "Unlimited users",
  "No per-seat fees",
];
