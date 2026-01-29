import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check if user has a saved preference
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      return savedTheme;
    }

    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;

    // Remove previous theme classes
    root.classList.remove('light', 'dark');

    // Add current theme class
    root.classList.add(theme);

    // Update favicons for dark mode
    const updateFavicon = (href: string, sizes?: string) => {
      const links = document.querySelectorAll(`link[rel="icon"]${sizes ? `[sizes="${sizes}"]` : ':not([sizes])'}`);
      links.forEach(link => {
        (link as HTMLLinkElement).href = href;
      });
    };

    if (theme === 'dark') {
      // Use a simple dark favicon (you can create specific dark versions later)
      updateFavicon('/favicon.ico');
      updateFavicon('/favicon-32x32.png', '32x32');
      updateFavicon('/favicon-16x16.png', '16x16');
    } else {
      // Use light favicons
      updateFavicon('/favicon.ico');
      updateFavicon('/favicon-32x32.png', '32x32');
      updateFavicon('/favicon-16x16.png', '16x16');
    }

    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}