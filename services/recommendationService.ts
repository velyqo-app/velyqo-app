export interface Recommendation {
  title: string;
  time: string;
  impact: string;
}

/**
 * Keys must match the goal strings written by app/onboarding/purpose.tsx.
 *
 * They previously read "career growth" / "higher salary" / "change career",
 * none of which onboarding ever produces, so every user silently fell through
 * to the default.
 */
const recommendations: Record<string, Recommendation> = {
  "advance my career": {
    title: "Write down three wins from the last month",
    time: "20 mins",
    impact: "★★★★☆",
  },

  "change careers": {
    title: "List the skills that transfer to your target role",
    time: "30 mins",
    impact: "★★★★★",
  },

  "explore careers": {
    title: "Research two roles that interest you",
    time: "25 mins",
    impact: "★★★★☆",
  },

  "increase my income": {
    title: "Check the going rate for your role and prepare your case",
    time: "30 mins",
    impact: "★★★★★",
  },

  "plan my future": {
    title: "Set one goal for the next six months",
    time: "20 mins",
    impact: "★★★★☆",
  },
};

export function getRecommendation(goal: string): Recommendation {
  return (
    recommendations[goal.trim().toLowerCase()] ?? {
      title: "Review your career roadmap",
      time: "15 mins",
      impact: "★★★☆☆",
    }
  );
}
