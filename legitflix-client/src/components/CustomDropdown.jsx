import React, { useState, useRef, useEffect } from 'react';
import './CustomDropdown.css';

const CustomDropdown = ({ icon, value, options, onChange, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const selectedOption = options.find(opt => opt.value === value);

    const handleToggle = () => setIsOpen(!isOpen);

    const handleSelect = (optionValue) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`custom-dropdown ${isOpen ? 'open' : ''}`} ref={dropdownRef}>
            <div className="custom-dropdown-trigger" onClick={handleToggle}>
                {icon && <span className="material-icons dropdown-icon">{icon}</span>}
                <div className="dropdown-label-group">
                    {label && <span className="dropdown-label-tiny">{label}</span>}
                    <span className="dropdown-selected-text">{selectedOption ? selectedOption.label : 'Select...'}</span>
                </div>
                <span className="material-icons dropdown-arrow">expand_more</span>
            </div>

            {isOpen && (
                <div className="custom-dropdown-menu">
                    {options.map((option) => (
                        <div
                            key={option.value}
                            className={`custom-dropdown-item ${option.value === value ? 'selected' : ''}`}
                            onClick={() => handleSelect(option.value)}
                        >
                            {option.label}
                            {option.value === value && <span className="material-icons item-check">check</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomDropdown;
