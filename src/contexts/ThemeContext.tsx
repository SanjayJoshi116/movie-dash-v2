import React, { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';

interface ThemeContextValue {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ isDark: true, toggleTheme: () => {} });

// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its provider, same as MoviesContext
export const useTheme = () => useContext(ThemeContext);

// Storage can throw (blocked site data, some private modes) — the theme must still work for the
// session rather than crash the whole app at the provider.
function readSavedTheme(): 'dark' | 'light' | null {
  try {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || saved === 'light' ? saved : null;
  } catch {
    return null;
  }
}

function prefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return true;
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // A saved choice wins; first visit follows the OS light/dark preference.
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = readSavedTheme();
    return saved ? saved === 'dark' : prefersDark();
  });

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch { /* storage unavailable — preference just isn't remembered */ }
  }, [isDark]);

  const toggleTheme = useCallback(() => setIsDark(prev => !prev), []);
  const value = useMemo(() => ({ isDark, toggleTheme }), [isDark, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
