import React, { useEffect } from 'react';
import styles from './ShortcutsModal.module.css';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts = [
    { category: 'Editor', items: [
      { keys: `${modKey}+R`, description: 'Run code' },
      { keys: `${modKey}+Shift+R`, description: 'Reset to default code' },
      { keys: `${modKey}+S`, description: 'Save (auto-saves to localStorage)' },
      { keys: `${modKey}+F`, description: 'Find in code' },
      { keys: `${modKey}+/`, description: 'Toggle line comment' },
    ]},
    { category: 'Navigation', items: [
      { keys: `${modKey}+K`, description: 'Focus snippet search' },
      { keys: 'Esc', description: 'Close modals/drawers' },
    ]},
    { category: 'Actions', items: [
      { keys: `${modKey}+?`, description: 'Show this help' },
    ]},
  ];

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Keyboard Shortcuts</h2>
          <button className={styles.closeButton} onClick={onClose} title="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className={styles.content}>
          {shortcuts.map((section) => (
            <div key={section.category} className={styles.section}>
              <h3 className={styles.categoryTitle}>{section.category}</h3>
              <div className={styles.shortcutList}>
                {section.items.map((shortcut, idx) => (
                  <div key={idx} className={styles.shortcutRow}>
                    <kbd className={styles.keys}>{shortcut.keys}</kbd>
                    <span className={styles.description}>{shortcut.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default ShortcutsModal;
