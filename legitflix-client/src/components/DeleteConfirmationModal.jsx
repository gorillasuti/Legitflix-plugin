import React from 'react';
import './DeleteConfirmationModal.css';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, itemName, itemType }) => {
    if (!isOpen) return null;

    return (
        <div className="delete-modal-overlay">
            <div className="delete-modal-backdrop" onClick={onClose}></div>
            <div className="delete-modal-content">
                <div className="delete-modal-header">
                    <span className="material-icons delete-warning-icon">warning</span>
                    <h2>Delete Media?</h2>
                </div>

                <div className="delete-modal-body">
                    <p>
                        Are you sure you want to delete <span className="delete-item-name">{itemName}</span>?
                    </p>
                    <div className="delete-warning-box">
                        <span className="material-icons warning-small">error_outline</span>
                        <p>
                            This action is <strong>PERMANENT</strong>.
                            The file will be removed from your server's disk storage and cannot be recovered.
                        </p>
                    </div>
                </div>

                <div className="delete-modal-actions">
                    <button className="btn-cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn-delete-confirm" onClick={onConfirm}>
                        <span className="material-icons">delete_forever</span>
                        Delete Forever
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;
