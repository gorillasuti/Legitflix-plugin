
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
    });

    useEffect(() => {
        // Load from local storage on mount
        const localConfig = localStorage.getItem('LegitFlix_Config');
        if (localConfig) {
            try {
                const parsed = JSON.parse(localConfig);
                setConfig(prev => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error("Failed to parse local config", e);
            }
        }
    }, []);

    const updateConfig = (newConfig) => {
        setConfig(prev => {
            const updated = { ...prev, ...newConfig };
            localStorage.setItem('LegitFlix_Config', JSON.stringify(updated));
            return updated;
        });
    };

    return (
        <ThemeContext.Provider value={{ config, updateConfig }}>
            {children}
        </ThemeContext.Provider>
    );
};
