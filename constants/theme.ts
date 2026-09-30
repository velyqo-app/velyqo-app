/**
 * Colour tokens. Both palettes share one shape so every component styles
 * against the same token names; the active palette is chosen at runtime by
 * context/ThemeContext.tsx (Light by default, Dark, or follow the device).
 * Never import a palette directly into a component — use useThemeColors()
 * or useThemedStyles() so the colours follow the user's theme choice.
 */
export interface ThemeColors {
  background: string;

  card: string;

  /** A step apart from `card` — reserved for the handful of surfaces that
   * should read as the most important thing on screen (Journey's current
   * milestone, the target-destination card), never used app-wide. */
  cardElevated: string;

  primary: string;

  /** Text/icons drawn on top of a `primary` fill (buttons, chips, the
   * user's own chat bubble). */
  onPrimary: string;

  /** Inline text links. */
  link: string;

  success: string;

  warning: string;

  danger: string;

  text: string;

  subtext: string;

  border: string;

  /** A more visible edge for the same handful of emphasized surfaces
   * `cardElevated` is used on — never a substitute for `border` elsewhere. */
  borderElevated: string;

  /** The single restrained gloss/highlight sweep premium surfaces get —
   * never a full fill, never used more than once per screen region. */
  highlight: string;

  /** `primary` at low opacity, for the soft glow behind the current-position
   * marker only. */
  glow: string;

  /** Scrim behind modal sheets. */
  overlay: string;
}

/** The original VELYQO dark palette, unchanged. */
export const DarkColors: ThemeColors = {
  background: "#0B1120",
  card: "#1E293B",
  cardElevated: "#243147",
  primary: "#7C3AED",
  onPrimary: "#FFFFFF",
  link: "#A78BFA",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  text: "#FFFFFF",
  subtext: "#94A3B8",
  border: "#334155",
  borderElevated: "#3D4F72",
  highlight: "rgba(255,255,255,0.06)",
  glow: "rgba(124,58,237,0.35)",
  overlay: "rgba(0,0,0,0.6)",
};

/** Light palette: cool off-white canvas, white cards with hairline borders,
 * brand navy for text, VELYQO purple for brand/action. Status colours are
 * one step deeper than the dark palette's so they stay readable on white. */
export const LightColors: ThemeColors = {
  background: "#F6F7FB",
  card: "#FFFFFF",
  cardElevated: "#FCFBFF",
  primary: "#7C3AED",
  onPrimary: "#FFFFFF",
  link: "#6D28D9",
  success: "#047857",
  warning: "#B45309",
  danger: "#DC2626",
  text: "#0B1120",
  subtext: "#5B6478",
  border: "#E3E6EE",
  borderElevated: "#D9CCFB",
  highlight: "rgba(124,58,237,0.04)",
  glow: "rgba(124,58,237,0.22)",
  overlay: "rgba(11,17,32,0.45)",
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

export interface ThemeShadows {
  card: {
    shadowColor: string;
    shadowOpacity: number;
    shadowRadius: number;
    shadowOffset: { width: number; height: number };
    elevation: number;
  };
}

export const DarkShadows: ThemeShadows = {
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
};

/** Much softer than dark — on a white canvas a dark-tuned shadow reads as
 * a heavy grey smudge. */
export const LightShadows: ThemeShadows = {
  card: {
    shadowColor: "#0B1120",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
};

export const FontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
} as const;
