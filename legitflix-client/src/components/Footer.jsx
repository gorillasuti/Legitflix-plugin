import React from 'react';
import { useTheme, getDefaultLogo } from '../context/ThemeContext';
import './Footer.css';

const Footer = () => {
    const { config } = useTheme();
    return (
        <div className="legitflix-footer">
            <div className="footer-content">
                <div className="footer-logo">
                    <a href="https://github.com/gorillasuti/Legitflix-plugin" target="_blank" rel="noopener noreferrer" className="footer-link">
                        <img className="footer-logo-img" src={getDefaultLogo(config.accentColor)} alt={config.appName} />
                    </a>
                </div>
                <div className="footer-divider"></div>
                <div className="footer-author">
                    Created by <a href="https://github.com/gorillasuti/Legitflix-plugin" target="_blank" rel="noopener noreferrer" className="footer-link"><strong>gorillasuti</strong></a>
                </div>
            </div>
        </div>
    );
};

export default Footer;
