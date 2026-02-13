
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
    return ACCENT_LOGO_MAP[accentColor?.toLowerCase()] || 'https://raw.githubusercontent.com/gorillasuti/Legitflix-plugin/refs/heads/main/legitflix-client/public/default-logo-orange.png';
};

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    // Default Configuration
    const [config, setConfig] = useState({
        heroMediaTypes: 'Movie,Series',
        promoMediaTypes: ['Movie', 'Series'],
        contentTypeFilters: { Movie: true, Series: true, MusicAlbum: false, Audio: false, MusicVideo: false },
        contentSortMode: 'latest', // 'latest' | 'random' | 'topRated'
        heroLimit: 20,
        enableJellyseerr: true,
        jellyseerrUrl: 'https://request.legitflix.eu',
        jellyseerrBackground: null,
        jellyseerrText: 'Request',
        // Visual Customization
        logoType: 'text', // 'text' | 'image'
        logoUrl: '',
        appName: 'LegitFlix',
        fastForwardTime: 10,
        rewindTime: 10,
        hideBackdrop: false,
        disableThemeSong: false,
        enableSnow: false,
        accentColor: '#ff7e00',
        showNavbarCategories: true,
        showNavbarRequests: true,
        showLibraryTitles: true,
        appBackground: null,
        // Player Settings
        playerSeekForward: 30,
        playerSeekBackward: 10,
        defaultAudioLanguage: 'auto',
        defaultSubtitleLanguage: 'auto',
        prioritizeAudioLanguage: false,
    });

    useEffect(() => {
        // Load from local storage on mount
        const localConfig = localStorage.getItem('LegitFlix_Config');
        if (localConfig) {
            try {
                const parsed = JSON.parse(localConfig);
                setConfig(prev => ({ ...prev, ...parsed }));
                if (parsed.accentColor) applyAccentColor(parsed.accentColor);
                if (parsed.faviconUrl) applyFavicon(parsed.faviconUrl);
                applySubtitleStyles(parsed.subtitleSize, parsed.subtitleColor, parsed.subtitleBackground);
            } catch (e) {
                console.error("Failed to parse local config", e);
            }
        } else {
            applyAccentColor(config.accentColor);
            applySubtitleStyles(config.subtitleSize, config.subtitleColor, config.subtitleBackground);
        }
    }, []);

    const applyAccentColor = (color) => {
        document.documentElement.style.setProperty('--clr-accent', color);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        document.documentElement.style.setProperty('--clr-accent-glow', `rgba(${r}, ${g}, ${b}, 0.5)`);
    };

    const applyFavicon = (url) => {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = url || '/favicon.png';
    };

    const applySubtitleStyles = (size, color, background) => {
        const root = document.documentElement;
        root.style.setProperty('--lf-sub-size', size || '100%');
        root.style.setProperty('--lf-sub-color', color || '#ffffff');

        // Background & Shadow logic
        let textShadow = '0px 1px 2px rgba(0,0,0,0.8)';
        let bgColor = 'transparent';

        if (background === 'drop-shadow') {
            textShadow = '0px 2px 4px rgba(0,0,0,0.9)';
        } else if (background === 'outline') {
            textShadow = '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';
        } else if (background === 'box') {
            bgColor = 'rgba(0,0,0,0.7)';
            textShadow = 'none';
        } else if (background === 'none') {
            textShadow = 'none';
        }

        root.style.setProperty('--lf-sub-shadow', textShadow);
        root.style.setProperty('--lf-sub-bg', bgColor);
    };

    const updateConfig = (newConfig) => {
        setConfig(prev => {
            const updated = { ...prev, ...newConfig };
            localStorage.setItem('LegitFlix_Config', JSON.stringify(updated));
            if (newConfig.accentColor) applyAccentColor(newConfig.accentColor);
            if (newConfig.faviconUrl !== undefined) applyFavicon(newConfig.faviconUrl);

            if (newConfig.subtitleSize !== undefined || newConfig.subtitleColor !== undefined || newConfig.subtitleBackground !== undefined) {
                applySubtitleStyles(updated.subtitleSize, updated.subtitleColor, updated.subtitleBackground);
            }

            return updated;
        });
    };

    return (
        <ThemeContext.Provider value={{ config, updateConfig }}>
            {children}
        </ThemeContext.Provider>
    );
};
