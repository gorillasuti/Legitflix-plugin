import React from 'react';
import './Footer.css';

const Footer = () => {
    return (
        <div className="legitflix-footer">
            <div className="footer-content">
                <div className="footer-logo">
                    <img src={getDefaultLogo(config.accentColor)} alt={config.appName} />
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
