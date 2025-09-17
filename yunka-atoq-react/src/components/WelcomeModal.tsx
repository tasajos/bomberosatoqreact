// src/components/WelcomeModal.tsx
import React from "react";
import styles from './WelcomeModal.module.css';

interface WelcomeModalProps {
  message: string;
  onClose: () => void;
  showButton?: boolean;
  buttonText?: string;
  onButtonClick?: () => void;
}

export default function WelcomeModal({
  message,
  onClose,
  showButton = false,
  buttonText = "Cerrar",
  onButtonClick,
}: WelcomeModalProps) {
  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>&times;</button>
        <div className={styles.icon}>👋</div>
        <p className={styles.message}>{message}</p>
        {showButton && (
          <button onClick={onButtonClick || onClose} className={styles.actionButton}>
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
}