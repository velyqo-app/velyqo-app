export interface Momentum {
  level: "Starting" | "Building" | "High" | "On Fire";
  emoji: string;
  message: string;
}

export function getMomentum(streak: number): Momentum {
  if (streak >= 7) {
    return {
      level: "On Fire",
      emoji: "🔥",
      message: "Outstanding consistency! Keep your streak alive.",
    };
  }

  if (streak >= 3) {
    return {
      level: "High",
      emoji: "🚀",
      message: "You're building excellent career momentum.",
    };
  }

  if (streak >= 1) {
    return {
      level: "Building",
      emoji: "🌱",
      message: "You're building momentum. Keep showing up.",
    };
  }

  return {
    level: "Starting",
    emoji: "✨",
    message: "Complete today's mission to begin your momentum.",
  };
}
