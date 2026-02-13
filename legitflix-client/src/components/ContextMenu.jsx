import React, { useEffect, useRef } from 'react';
import './ContextMenu.css';

const ContextMenu = ({ x, y, options, onClose }) => {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };

        const handleScroll = () => {
            onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true); // Capture scroll on any element
        window.addEventListener('resize', onClose);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', onClose);
        };
    }, [onClose]);

    // Adjust position if out of bounds (basic)
    const style = {
        top: y,
        left: x,
    };

    // Simple bound check to prevent going off-screen (bottom/right)
    if (menuRef.current) {
        const rect = menuRef.current.getBoundingClientRect();
        if (x + rect.width > window.innerWidth) {
            style.left = x - rect.width;
        }
        if (y + rect.height > window.innerHeight) {
            style.top = y - rect.height;
        }
    }

    return (
        <div className="lf-context-menu" style={style} ref={menuRef}>
            {options.map((option, index) => {
                if (option.type === 'separator') {
                    return <div key={index} className="lf-context-menu__separator" />;
                }

                return (
                    <div
                        key={index}
                        className={`lf-context-menu__item ${option.danger ? 'is-danger' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            option.action();
                            onClose();
                        }}
                    >
                        {option.icon && <span className="material-icons lf-context-menu__icon">{option.icon}</span>}
                        <span className="lf-context-menu__label">{option.label}</span>
                    </div>
                );
            })}
        </div>
    );
};

export default ContextMenu;
