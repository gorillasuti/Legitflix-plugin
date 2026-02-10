import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    // Default Configuration (matching legitflix-theme.js CONFIG)
    const [config, setConfig] = useState({
        heroMediaTypes: 'Movie,Series',
        heroLimit: 20,
        enableJellyseerr: true,
        jellyseerrUrl: 'https://request.legitflix.eu',
        // Visual Customization placeholders
        primaryColor: '#00a4dc',
        accentColor: '#E50914',
    });

    // TODO: In the future, fetch these from User Preferences or Plugin Configuration
    useEffect(() => {
        // Example: logic to load from localStorage or API could go here
        const localConfig = localStorage.getItem('LegitFlix_Config');
        if (localConfig) {
            try {
                setConfig(prev => ({ ...prev, ...JSON.parse(localConfig) }));
            } catch (e) {
                console.error("Failed to parse local config", e);
            }
        }
    }, []);

    return (
        <ThemeContext.Provider value={{ config, setConfig }}>
            {children}
        </ThemeContext.Provider>
    );
};
