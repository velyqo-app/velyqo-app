import { CareerMetric } from "../../types/metrics";

export function calculateCareerConfidence(): CareerMetric {
  return {
    score: 0,
    level: "Low",
    trend: "stable",
    contributors: [],
    nextAction: "Complete your first career mission.",
  };
}
