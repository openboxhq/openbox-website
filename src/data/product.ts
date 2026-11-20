export interface Pillar {
  id: string;
  name: string;
  title: string;
  line: string;
}

/** The three jobs Openbox does on one camera network; shared by the nav menu and the home page. */
export const PILLARS: Pillar[] = [
  { id: "progress", name: "Progress", title: "Know what was built today.", line: "A dated record of every day on site, checked against your schedule." },
  { id: "safety", name: "Safety", title: "Catch risk between walks.", line: "PPE, exclusion zones and open edges, flagged with the clip." },
  { id: "security", name: "Security", title: "Own the night.", line: "After-hours alerts, reviewed by a person before they reach you." },
];
