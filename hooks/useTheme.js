'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('noon'); // default

  // Determine theme based on hour of day
  const getThemeByHour = (hour) => {
    if (hour >= 5 && hour < 10) return 'dawn';
    if (hour >= 10 && hour < 17) return 'noon';
    return 'night';
  };

  // Update theme on mount and every minute
  useEffect(() => {
    const updateTheme = () => {
      const hour = new Date().getHours();
      const newTheme = getThemeByHour(hour);
      setTheme(newTheme);
      // Save to localStorage for persistence
      localStorage.setItem('trueToneTheme', newTheme);
    };
    updateTheme();
    const interval = setInterval(updateTheme, 60000);
    return () => clearInterval(interval);
  }, []);

  // Persist user override if needed (future)
  const setManualTheme = (custom) => {
    setTheme(custom);
    localStorage.setItem('trueToneTheme', custom);
  };

  return (
    <ThemeContext.Provider value={{ theme, setManualTheme }}>
      <div className={theme}>{children}</div>
    </ThemeContext.Provider>
  );
}

export const useTrueTone = () => useContext(ThemeContext);
