// Reusable confirmation dialog for destructive actions
import React from 'react';
import './ConfirmDialog.css';

const ConfirmDialog = ({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, variant = 'danger' }) => {
    if (!open) return null;
    return (
        <div className="confirm-dialog-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
            <div className="confirm-dialog-box" onClick={(e) => e.stopPropagation()}>
                <h3 id="confirm-dialog-title" className="confirm-dialog-title">{title}</h3>
                <p className="confirm-dialog-message">{message}</p>
                <div className="confirm-dialog-actions">
                    <button type="button" className="confirm-dialog-cancel" onClick={onCancel}>{cancelLabel}</button>
                    <button type="button" className={`confirm-dialog-confirm confirm-dialog-${variant}`} onClick={onConfirm}>{confirmLabel}</button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
