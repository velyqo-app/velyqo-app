export const Colors = {
  background: "#0B1120",

  card: "#1E293B",

  primary: "#7C3AED",

  success: "#10B981",

  warning: "#F59E0B",

  danger: "#EF4444",

  text: "#FFFFFF",

  subtext: "#94A3B8",

  border: "#334155",
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
