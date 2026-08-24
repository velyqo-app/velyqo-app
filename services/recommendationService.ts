export function getRecommendation(goal: string) {
  switch (goal.toLowerCase()) {
    case "career growth":
      return {
        title: "Complete CompTIA Security+",
        time: "30 mins",
        impact: "★★★★★",
      };

    case "higher salary":
      return {
        title: "Improve your LinkedIn profile",
        time: "20 mins",
        impact: "★★★★☆",
      };

    case "change career":
      return {
        title: "Finish Google Cybersecurity Certificate",
        time: "45 mins",
        impact: "★★★★★",
      };

    default:
      return {
        title: "Review your career roadmap",
        time: "15 mins",
        impact: "★★★☆☆",
      };
  }
}
