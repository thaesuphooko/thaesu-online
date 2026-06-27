'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light'); // light, dark, or time-based
  const [manualTheme, setManualTheme] = useState(null); // if set, override time-based

  const getThemeByHour = (hour) => {
    if (hour >= 5 && hour < 10) return 'dawn';
    if (hour >= 10 && hour < 17) return 'noon';
    return 'night';
  };

  useEffect(() => {
    const stored = localStorage.getItem('themePreference');
    if (stored === 'light' || stored === 'dark') {
      setManualTheme(stored);
    }
  }, []);

  useEffect(() => {
    if (manualTheme) {
      setTheme(manualTheme);
      return;
    }
    const updateTheme = () => {
      const hour = new Date().getHours();
      setTheme(getThemeByHour(hour));
    };
    updateTheme();
    const interval = setInterval(updateTheme, 60000);
    return () => clearInterval(interval);
  }, [manualTheme]);

  const toggleDarkLight = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setManualTheme(next);
    localStorage.setItem('themePreference', next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleDarkLight, manualTheme }}>
      <div className={theme}>{children}</div>
    </ThemeContext.Provider>
  );
}

export const useTrueTone = () => useContext(ThemeContext);
