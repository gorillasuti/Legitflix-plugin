
import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    // Default Configuration
    const [config, setConfig] = useState({
        heroMediaTypes: 'Movie,Series',
        heroLimit: 20,
        enableJellyseerr: true,
        jellyseerrUrl: 'https://request.legitflix.eu',
        // Visual Customization
        logoType: 'text', // 'text' | 'image'
        logoUrl: '',
        appName: 'LegitFlix',
        enableBackdrops: true,
        accentColor: '#ff7e00',
        showNavbarCategories: true,
        showLibraryTitles: true,
    });

    useEffect(() => {
        // Load from local storage on mount
        const localConfig = localStorage.getItem('LegitFlix_Config');
        if (localConfig) {
            try {
                const parsed = JSON.parse(localConfig);
                setConfig(prev => ({ ...prev, ...parsed }));
                if (parsed.accentColor) applyAccentColor(parsed.accentColor);
            } catch (e) {
                console.error("Failed to parse local config", e);
            }
        } else {
            applyAccentColor(config.accentColor);
        }
    }, []);

    const applyAccentColor = (color) => {
        document.documentElement.style.setProperty('--clr-accent', color);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        document.documentElement.style.setProperty('--clr-accent-glow', `rgba(${r}, ${g}, ${b}, 0.5)`);
    };

    const updateConfig = (newConfig) => {
        setConfig(prev => {
            const updated = { ...prev, ...newConfig };
            localStorage.setItem('LegitFlix_Config', JSON.stringify(updated));
            if (newConfig.accentColor) applyAccentColor(newConfig.accentColor);
            return updated;
        });
    };

    return (
        <ThemeContext.Provider value={{ config, updateConfig }}>
            {children}
        </ThemeContext.Provider>
    );
};
