// Reusable confirmation dialog for destructive actions
import React, { useRef, useEffect } from 'react';
import './ConfirmDialog.css';

const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const ConfirmDialog = ({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, variant = 'danger' }) => {
    const boxRef = useRef(null);
    const previousActiveRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        previousActiveRef.current = document.activeElement;
        const box = boxRef.current;
        if (box) {
            const focusable = box.querySelectorAll(focusableSelector);
            const first = focusable[0];
            if (first) first.focus();
        }
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
                return;
            }
            if (e.key !== 'Tab' || !boxRef.current) return;
            const focusable = [...boxRef.current.querySelectorAll(focusableSelector)];
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            if (previousActiveRef.current && typeof previousActiveRef.current.focus === 'function') {
                previousActiveRef.current.focus();
            }
        };
    }, [open, onCancel]);

    if (!open) return null;
    return (
        <div className="confirm-dialog-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
            <div ref={boxRef} className="confirm-dialog-box" onClick={(e) => e.stopPropagation()}>
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
