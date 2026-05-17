import { useState, useEffect } from 'react';
import ThemeContext from "./themeContext";

export function ThemeProvider({ children }) {
  // Vérifier si l'utilisateur a déjà une préférence stockée
  const storedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  const [darkMode, setDarkMode] = useState(() => {
    if (storedTheme === 'dark') return true;
    if (storedTheme === 'light') return false;
    return prefersDark;
  });

  // Sauvegarder la préférence quand elle change
  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    
    // Appliquer la classe sur le body
    if (darkMode) {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

