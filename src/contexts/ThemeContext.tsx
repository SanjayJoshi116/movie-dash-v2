import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';

interface ThemeContextValue {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ isDark: true, toggleTheme: () => {} });

// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its provider, same as MoviesContext
export const useTheme = () => useContext(ThemeContext);

// App-specific key: on a shared origin (e.g. localhost:3000) a bare 'theme' may belong to another
// app. The old 'theme' key is neither read nor removed — every value in it was written on mount
// (not chosen by the user), so it can't be told apart from a real choice.
const THEME_KEY = 'movieDash_theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

// Storage can throw (blocked site data, some private modes) — the theme must still work for the
// session rather than crash the whole app at the provider.
function readSavedTheme(): 'dark' | 'light' | null {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'dark' || saved === 'light' ? saved : null;
  } catch {
    return null;
  }
}

function prefersDark(): boolean {
  try {
    return window.matchMedia(DARK_QUERY).matches;
  } catch {
    return true;
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // A saved choice wins; until the user toggles, the theme follows the OS light/dark preference.
  const [choice, setChoice] = useState(readSavedTheme);
  const [osDark, setOsDark] = useState(prefersDark);
  const hasChoice = choice !== null;
  const isDark = hasChoice ? choice === 'dark' : osDark;

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // No choice yet: track live OS changes. setState from the subscription callback, not the effect body.
  useEffect(() => {
    if (hasChoice) return;
    let query: MediaQueryList;
    try {
      query = window.matchMedia(DARK_QUERY);
    } catch {
      return;
    }
    const onChange = (e: MediaQueryListEvent) => setOsDark(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [hasChoice]);

  // Only an explicit toggle is saved. Storage is written here, not inside a state updater
  // (StrictMode calls updaters twice).
  const toggleTheme = useCallback(() => {
    const next = isDark ? 'light' : 'dark';
    setChoice(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch { /* storage unavailable — preference just isn't remembered */ }
  }, [isDark]);
  const value = useMemo(() => ({ isDark, toggleTheme }), [isDark, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
