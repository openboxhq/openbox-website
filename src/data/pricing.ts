export interface Plan {
  name: string;
  tagline: string;
  price: string;
  unit: string;
  pitch: string;
  features: string[];
  cta: string;
  interest: "watch" | "twin" | "both" | "portfolio";
  featured: boolean;
}

/** Proposed list prices for review before launch. */
export const PLANS: Plan[] = [
  {
    name: "Watch",
    tagline: "Jobsite monitoring",
    price: "$99",
    unit: "per site / month",
    pitch: "Safety, logistics and security on the cameras you already have.",
    features: [
      "PPE, exclusion zones, falls, fire and smoke",
      "Gate log with plate reading; deliveries and headcount",
      "After-hours intrusion and theft alerts",
      "Live view, time-lapse and evidence clips",
      "Up to 10 cameras per site",
    ],
    cta: "Start free",
    interest: "watch",
    featured: false,
  },
  {
    name: "Twin",
    tagline: "Digital twin and progress",
    price: "$990",
    unit: "per project / month",
    pitch: "A verified record of what is built, on your plans and schedule.",
    features: [
      "3D model and plan view of every capture",
      "Milestones verified by an Openbox reviewer",
      "Schedule link for P6 and Microsoft Project",
      "Unlimited walks, drone and phone uploads",
      "Issues, daily report drafts and site search",
    ],
    cta: "Start free",
    interest: "twin",
    featured: false,
  },
  {
    name: "Openbox",
    tagline: "Twin and Watch together",
    price: "$1,490",
    unit: "per project / month",
    pitch: "One camera network for progress and the whole site.",
    features: [
      "Everything in Twin",
      "Everything in Watch, up to 25 cameras",
      "Alerts reviewed by a person before you are notified",
      "Setup and zone mapping done by our team",
      "Save about 30% against buying both",
    ],
    cta: "Start free",
    interest: "both",
    featured: true,
  },
  {
    name: "Portfolio",
    tagline: "For 5+ projects",
    price: "Custom",
    unit: "volume pricing",
    pitch: "One view across every site you build.",
    features: [
      "Volume pricing across projects and cameras",
      "Portfolio dashboards for owners and executives",
      "SSO, API access and integrations",
      "Dedicated success manager and review SLAs",
    ],
    cta: "Talk to us",
    interest: "portfolio",
    featured: false,
  },
];

export const PRICING_NOTES = [
  "Free for 30 days on a live project",
  "Unlimited users on every plan",
  "No per-seat fees",
  "Monthly or annual billing",
];
