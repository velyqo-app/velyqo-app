import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";

import {
  DarkColors,
  DarkShadows,
  LightColors,
  LightShadows,
  ThemeColors,
  ThemeShadows,
} from "../constants/theme";

/** What the user picked in Profile. "system" follows the device setting. */
export type ThemePreference = "light" | "dark" | "system";

/** The palette actually on screen once "system" is resolved. */
export type ColorScheme = "light" | "dark";

/** Light is the product default until the user explicitly chooses otherwise. */
const DEFAULT_PREFERENCE: ThemePreference = "light";

/** Device-local only — never synced to the backend. */
const STORAGE_KEY = "velyqo.themePreference";

interface ThemeContextType {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  scheme: ColorScheme;
  colors: ThemeColors;
  shadows: ThemeShadows;
}

const PALETTES: Record<ColorScheme, { colors: ThemeColors; shadows: ThemeShadows }> = {
  light: { colors: LightColors, shadows: LightShadows },
  dark: { colors: DarkColors, shadows: DarkShadows },
};

const ThemeContext = createContext<ThemeContextType>({
  preference: DEFAULT_PREFERENCE,
  setPreference: () => {},
  scheme: "light",
  ...PALETTES.light,
});

function isPreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const deviceScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(DEFAULT_PREFERENCE);

  // Children are held back until the saved choice is read, so a Dark user
  // never sees a Light first frame. The read is a single local key, and the
  // native splash stays up until app/index.tsx hides it, so this wait is
  // never visible.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (active && isPreference(stored)) {
          setPreferenceState(stored);
        }
      })
      .catch(() => {
        // Unreadable storage just means the default applies.
      })
      .finally(() => {
        if (active) {
          setLoaded(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // Still applied for this session; only persistence is lost.
    });
  }, []);

  const scheme: ColorScheme =
    preference === "system" ? (deviceScheme === "dark" ? "dark" : "light") : preference;

  const value = useMemo(
    () => ({ preference, setPreference, scheme, ...PALETTES[scheme] }),
    [preference, setPreference, scheme],
  );

  if (!loaded) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useThemeColors() {
  return useContext(ThemeContext).colors;
}

type StyleFactory<T> = (colors: ThemeColors, shadows: ThemeShadows) => T;

// One StyleSheet per (factory, scheme), shared by every instance of a
// component, so switching themes never rebuilds styles per render.
const styleCache = new WeakMap<StyleFactory<unknown>, Partial<Record<ColorScheme, unknown>>>();

/**
 * Returns `factory`'s styles for the active theme. Pass a module-level
 * factory (`const createStyles = (Colors) => StyleSheet.create({...})`),
 * never an inline function, so the cache can do its job.
 */
export function useThemedStyles<T>(factory: StyleFactory<T>): T {
  const { scheme, colors, shadows } = useContext(ThemeContext);

  let entry = styleCache.get(factory as StyleFactory<unknown>);
  if (!entry) {
    entry = {};
    styleCache.set(factory as StyleFactory<unknown>, entry);
  }

  if (!(scheme in entry)) {
    entry[scheme] = factory(colors, shadows);
  }

  return entry[scheme] as T;
}
