import React, { createContext, useContext, useState, useEffect } from 'react';

const THEME_STORAGE_KEY = 'pb_theme';

export const THEMES = [
  {
    id: 'default',
    name: 'Default',
    description: 'Modern Slate & Indigo Classic',
    preview: {
      bg: '#0c1017',
      card: '#171f30',
      elevated: '#1e293f',
      border: '#28334a',
      accent: '#6366f1',
      text: '#f8fafc',
      chart: ['#6366f1', '#38bdf8', '#10b981', '#f59e0b', '#ec4899']
    }
  },
  {
    id: 'dusty',
    name: 'Dusty',
    description: 'Architectural Stone & Brushed Bronze',
    preview: {
      bg: '#171615',
      card: '#272522',
      elevated: '#322f2b',
      border: '#3b3733',
      accent: '#c89b72',
      text: '#f7f3ee',
      chart: ['#c89b72', '#7ea2be', '#5ca67b', '#d9a05b', '#b48395']
    }
  },
  {
    id: 'sage',
    name: 'Sage',
    description: 'Nordic Botanical & Eucalyptus Slate',
    preview: {
      bg: '#0f1713',
      card: '#1b2922',
      elevated: '#23342b',
      border: '#2d4237',
      accent: '#4ea375',
      text: '#f0f7f3',
      chart: ['#4ea375', '#5c9eb8', '#d4a359', '#9382c4', '#e07a5f']
    }
  },
  {
    id: 'lavender',
    name: 'Lavender',
    description: 'Soft Amethyst & Twilight Slate',
    preview: {
      bg: '#13111c',
      card: '#221e32',
      elevated: '#2c2740',
      border: '#393252',
      accent: '#9e82d4',
      text: '#f6f3fb',
      chart: ['#9e82d4', '#6fa4df', '#5bb88a', '#dc9e5c', '#d96378']
    }
  },
  {
    id: 'teal',
    name: 'Teal',
    description: 'Deep Oceanic & Seafoam Petrol',
    preview: {
      bg: '#0a1618',
      card: '#142a2e',
      elevated: '#1b363b',
      border: '#23454b',
      accent: '#22a3ad',
      text: '#eefafb',
      chart: ['#22a3ad', '#38bdf8', '#34b38a', '#d9a04e', '#9a7ecc']
    }
  },
  {
    id: 'mocha',
    name: 'Mocha',
    description: 'Artisan Espresso & Roasted Caramel',
    preview: {
      bg: '#16120f',
      card: '#28211b',
      elevated: '#342b23',
      border: '#3e322a',
      accent: '#c28b57',
      text: '#faf4ee',
      chart: ['#c28b57', '#7b9ebc', '#62a673', '#d49b4f', '#b87b8f']
    }
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Obsidian Black & Sapphire Blue',
    preview: {
      bg: '#06080d',
      card: '#101522',
      elevated: '#171e30',
      border: '#222c42',
      accent: '#38bdf8',
      text: '#f8fafc',
      chart: ['#38bdf8', '#818cf8', '#10b981', '#f59e0b', '#f43f5e']
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
