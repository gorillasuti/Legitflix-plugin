
import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

// Map preset accent colors → matching default logo
const ACCENT_LOGO_MAP = {
    '#ff7e00': 'https://raw.githubusercontent.com/gorillasuti/Legitflix-plugin/refs/heads/main/legitflix-client/public/default-logo-orange.png',
    '#00aaff': 'https://raw.githubusercontent.com/gorillasuti/Legitflix-plugin/refs/heads/main/legitflix-client/public/default-logo-blue.png',
    '#00ff7e': 'https://raw.githubusercontent.com/gorillasuti/Legitflix-plugin/refs/heads/main/legitflix-client/public/default-logo-green.png',
    '#ff3333': 'https://raw.githubusercontent.com/gorillasuti/Legitflix-plugin/refs/heads/main/legitflix-client/public/default-logo-red.png',
    '#aa00ff': 'https://raw.githubusercontent.com/gorillasuti/Legitflix-plugin/refs/heads/main/legitflix-client/public/default-logo-purple.png',
    '#ff00aa': 'https://raw.githubusercontent.com/gorillasuti/Legitflix-plugin/refs/heads/main/legitflix-client/public/default-logo-purple.png',  // Pink falls back to purple
};

export const getDefaultLogo = (accentColor) => {
    return ACCENT_LOGO_MAP[accentColor?.toLowerCase()] || '/default-logo-orange.png';
};

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
        showNavbarRequests: true,
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
