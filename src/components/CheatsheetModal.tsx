import React, { useEffect, useState } from 'react';
import styles from './CheatsheetModal.module.css';

interface CheatsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Define interfaces for our new data structure
interface CheatsheetItem {
  description: string;
  code: string;
}

interface CheatsheetCategory {
  category: string;
  items: CheatsheetItem[];
}

interface CheatsheetStructure {
  [topLevel: string]: CheatsheetCategory[];
}

const CheatsheetModal: React.FC<CheatsheetModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [cheatsheet, setCheatsheet] = useState<CheatsheetStructure | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && !cheatsheet) {
      setLoading(true);
      fetch('cheatsheet.json')
        .then(response => response.json())
        .then(data => {
          setCheatsheet(data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error loading cheatsheet:', error);
          setLoading(false);
        });
    }
  }, [isOpen, cheatsheet]);

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

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 2000); // Reset after 2 seconds
    });
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Three.js Cheatsheet</h2>
          <button className={styles.closeButton} onClick={onClose} title="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className={styles.content}>
          {loading ? (
            <p>Loading cheatsheet...</p>
          ) : !cheatsheet ? (
            <p>Error loading cheatsheet. Check the console.</p>
          ) : (
            Object.entries(cheatsheet).map(([topLevel, categories]) => (
              <div key={topLevel} className={styles.topLevelSection}>
                <h2 className={styles.topLevelTitle}>{topLevel}</h2>
                {categories.map((section) => (
                  <div key={section.category} className={styles.section}>
                    <h3 className={styles.categoryTitle}>{section.category}</h3>
                    <div className={styles.shortcutList}>
                      {section.items.map((item, idx) => (
                                          <div key={idx} className={styles.shortcutRow}>
                                            <div className={styles.codeContainer}>
                                              <button
                                                className={styles.copyButton}
                                                onClick={() => handleCopy(item.code)}
                                                title="Copy code"
                                              >
                                                <span className="material-symbols-outlined">
                                                  {copied === item.code ? 'done' : 'content_copy'}
                                                </span>
                                              </button>
                                              <code className={styles.code}><pre>{item.code}</pre></code>
                                            </div>
                                            <span className={styles.description}>{item.description}</span>
                                          </div>                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default CheatsheetModal;