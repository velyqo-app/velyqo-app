export type MetricTrend = "up" | "down" | "stable";

export type MetricLevel = "Low" | "Building" | "Strong" | "Excellent";

export interface MetricContributor {
  label: string;
  impact: number;
  description: string;
}

export interface CareerMetric {
  score: number;
  level: MetricLevel;
  trend: MetricTrend;
  contributors: MetricContributor[];
  nextAction: string;
}

export interface CareerMomentum extends CareerMetric {
  streak: number;
}

export interface CareerPotential extends CareerMetric {
  estimatedWeeksToGoal?: number;
}

export type CareerConfidence = CareerMetric;

export type CareerReadiness = CareerMetric;
