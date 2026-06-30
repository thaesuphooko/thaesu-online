'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const GlobalThemeContext = createContext();

export function GlobalThemeProvider({ children }) {
  const [theme, setTheme] = useState({
    primary: '#C8A27A',
    secondary: '#4F46E5',
    background: '#FDFBF7',
    font: 'Pyidaungsu',
    mode: 'light',
  });

  useEffect(() => {
    // Load saved theme from localStorage or API
    fetch('/api/settings/public')
      .then(r => r.json())
      .then(settings => {
        if (settings.theme) {
          try {
            const saved = JSON.parse(settings.theme);
            setTheme(saved);
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Apply theme to CSS variables
    document.documentElement.style.setProperty('--color-primary', theme.primary);
    document.documentElement.style.setProperty('--color-secondary', theme.secondary);
    document.documentElement.style.setProperty('--color-background', theme.background);
    document.documentElement.style.fontFamily = theme.font;
    document.documentElement.classList.toggle('dark', theme.mode === 'dark');
  }, [theme]);

  return (
    <GlobalThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </GlobalThemeContext.Provider>
  );
}

export const useGlobalTheme = () => useContext(GlobalThemeContext);
