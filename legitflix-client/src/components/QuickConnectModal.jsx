import React, { useState } from 'react';
import { jellyfinService } from '../services/jellyfin';
import './QuickConnectModal.css';

const QuickConnectModal = ({ isOpen, onClose }) => {
    const [code, setCode] = useState('');
    const [status, setStatus] = useState(''); // '', 'loading', 'success', 'error'
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async () => {
        if (!code.trim()) return;
        setStatus('loading');
        setErrorMsg('');
        try {
            const res = await fetch(`${jellyfinService.api.basePath}/QuickConnect/Authorize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Emby-Authorization': jellyfinService.api.authHeader,
                },
                body: JSON.stringify({ Code: code.trim() }),
            });
            if (res.ok) {
                setStatus('success');
                setTimeout(() => {
                    setCode('');
                    setStatus('');
                    onClose();
                }, 1500);
            } else {
                const data = await res.json().catch(() => ({}));
                setStatus('error');
                setErrorMsg(data.Message || 'Invalid code. Please try again.');
            }
        } catch (err) {
            setStatus('error');
            setErrorMsg('Connection failed. Please try again.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="qc-overlay" onClick={onClose}>
            <div className="qc-modal" onClick={e => e.stopPropagation()}>
                <div className="qc-header">
                    <span className="material-icons qc-icon">qr_code</span>
                    <h2>Quick Connect</h2>
                    <button className="qc-close" onClick={onClose}>&times;</button>
                </div>
                <p className="qc-desc">
                    Enter the code displayed on your other device to link it to your account.
                </p>
                <input
                    className="qc-input"
                    type="text"
                    placeholder="Enter Quick Connect code"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                    autoFocus
                />
                {status === 'error' && <p className="qc-error">{errorMsg}</p>}
                {status === 'success' && <p className="qc-success">Connected successfully!</p>}
                <button
                    className="qc-submit"
                    onClick={handleSubmit}
                    disabled={status === 'loading' || !code.trim()}
                >
                    {status === 'loading' ? 'Connecting...' : 'Authorize'}
                </button>
            </div>
        </div>
    );
};

export default QuickConnectModal;
