import React, { useEffect, useState, useRef } from 'react';
import { Settings, Moon, Sun } from 'lucide-react';

const SettingsToggle = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const popupRef = useRef(null);

  useEffect(() => {
    // Default to dark since the app is originally designed in dark mode
    const isLight = localStorage.theme === 'light';
    if (isLight) {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }

    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDark(true);
    }
  };

  return (
    <div className="relative z-[100]" ref={popupRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-lg text-slate-800 dark:text-slate-200 hover:scale-105 transition-transform"
        title="Settings"
      >
        <Settings size={20} className={`transition-transform duration-500 ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-12 right-0 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-4 transition-all">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Settings</h3>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
              {isDark ? <Moon size={16} className="text-accent-400" /> : <Sun size={16} className="text-orange-500" />}
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </span>
            
            <button 
              onClick={toggleTheme}
              className={`w-12 h-6 rounded-full relative transition-colors duration-300 ease-in-out ${isDark ? 'bg-accent-500' : 'bg-slate-300'}`}
              aria-label="Toggle theme"
            >
              <div 
                className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ease-in-out shadow-md ${isDark ? 'translate-x-6' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsToggle;
