export const Colors = {
  background: "#0B1120",

  card: "#1E293B",

  /** A step lighter than `card` — reserved for the handful of surfaces that
   * should read as the most important thing on screen (Journey's current
   * milestone, the target-destination card), never used app-wide. */
  cardElevated: "#243147",

  primary: "#7C3AED",

  success: "#10B981",

  warning: "#F59E0B",

  danger: "#EF4444",

  text: "#FFFFFF",

  subtext: "#94A3B8",

  border: "#334155",

  /** A brighter, more visible edge for the same handful of emphasized
   * surfaces `cardElevated` is used on — never a substitute for `border`
   * elsewhere. */
  borderElevated: "#3D4F72",

  /** Low-opacity white, for the single restrained gloss/highlight sweep
   * premium surfaces get — never a full white fill, never used more than
   * once per screen region. */
  highlight: "rgba(255,255,255,0.06)",

  /** `primary` at low opacity, for the soft glow behind the current-position
   * marker only. */
  glow: "rgba(124,58,237,0.35)",
};

export const Spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
};

export const Font = {
  title: 28,
  heading: 22,
  body: 16,
  small: 14,
};

export const Shadows = {
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
};

export const FontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
} as const;
