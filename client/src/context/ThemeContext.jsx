import React, { createContext, useContext, useState, useEffect } from 'react';

const THEME_STORAGE_KEY = 'pb_theme';

export const THEMES = [
  {
    id: 'default',
    name: 'Default',
    description: 'Neon Indigo & Violet',
    preview: {
      bg: '#0a0e1a',
      card: '#161e32',
      accent: '#6366f1',
      text: '#f8fafc'
    }
  },
  {
    id: 'dusty',
    name: 'Dusty',
    description: 'Muted Slate & Warm Bronze',
    preview: {
      bg: '#1c1a19',
      card: '#2d2926',
      accent: '#c79c7a',
      text: '#f5f0eb'
    }
  },
  {
    id: 'sage',
    name: 'Sage',
    description: 'Muted Eucalyptus & Neutral',
    preview: {
      bg: '#121915',
      card: '#1c2922',
      accent: '#52946e',
      text: '#f0f7f2'
    }
  },
  {
    id: 'lavender',
    name: 'Lavender',
    description: 'Soft Lilac & Muted Purple',
    preview: {
      bg: '#15131f',
      card: '#221e33',
      accent: '#9d85c7',
      text: '#f5f3fa'
    }
  },
  {
    id: 'teal',
    name: 'Teal',
    description: 'Deep Oceanic & Cyan',
    preview: {
      bg: '#0a181a',
      card: '#12292e',
      accent: '#2d9ca3',
      text: '#eef9fa'
    }
  },
  {
    id: 'mocha',
    name: 'Mocha',
    description: 'Warm Brown & Roasted Cream',
    preview: {
      bg: '#191410',
      card: '#29211b',
      accent: '#b8865b',
      text: '#faf5f0'
    }
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Obsidian Black & Ice Blue',
    preview: {
      bg: '#05070c',
      card: '#0f1422',
      accent: '#38bdf8',
      text: '#f8fafc'
    }
  }
];

const ThemeContext = createContext({
  theme: 'default',
  setTheme: () => {},
  themes: THEMES
});

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      return stored && THEMES.some((t) => t.id === stored) ? stored : 'default';
    } catch (e) {
      return 'default';
    }
  });

  const setTheme = (newTheme) => {
    if (!THEMES.some((t) => t.id === newTheme)) return;
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (e) {
      console.warn('Unable to write theme to localStorage:', e);
    }
  };

  useEffect(() => {
    if (theme === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
