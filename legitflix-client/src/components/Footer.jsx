import React from 'react';
import { useTheme, getDefaultLogo } from '../context/ThemeContext';
import './Footer.css';

const Footer = () => {
    const { config } = useTheme();
    return (
        <div className="legitflix-footer">
            <div className="footer-content">
                <div className="footer-logo">
                    <img className="footer-logo-img" src={getDefaultLogo(config.accentColor)} alt={config.appName} />
                </div>
                <div className="footer-divider"></div>
                <div className="footer-author">
                    Created by <strong>gorillasuti</strong>
                </div>
            </div>
        </div>
    );
};

export default Footer;
