import React, { useState, useEffect } from 'react';
import styles from './SnippetDrawer.module.css';

interface SnippetItem {
  name: string;
  file: string;
}

interface SnippetCategory {
  name: string;
  items: SnippetItem[];
}

interface SnippetDrawerProps {
  onSnippetInsert: (code: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const SnippetDrawer: React.FC<SnippetDrawerProps> = ({ onSnippetInsert, isOpen, onClose }) => {
  const [categories, setCategories] = useState<SnippetCategory[]>([]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [loadingSnippet, setLoadingSnippet] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`${import.meta.env.BASE_URL}snippets/manifest.json`)
      .then(response => response.json())
      .then(data => {
        setCategories(data.categories);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading snippet manifest:', error);
        setLoading(false);
      });
  }, []);

  const handleToggleSection = (category) => {
    setOpenSections((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

      const handleSnippetClick = (snippetFile: string) => {

        setLoadingSnippet(snippetFile);

        fetch(`${import.meta.env.BASE_URL}snippets/${snippetFile}`)

          .then(response => response.text())

          .then(code => {

            if (code && onSnippetInsert) {

              onSnippetInsert(code);

            }

            setLoadingSnippet(null);

            onClose(); // Close drawer after inserting

          })

          .catch(error => {

            console.error(`Error loading snippet: ${snippetFile}`, error);

            setLoadingSnippet(null);

          });

      };

    

      // Filter categories and items based on search query

      const filteredCategories = categories.map(category => {

        const filteredItems = category.items.filter(item =>

          item.name.toLowerCase().includes(searchQuery.toLowerCase())

        );

        return { ...category, items: filteredItems };

      }).filter(category => category.items.length > 0);

    

      // Highlight matching text

      const highlightMatch = (text: string) => {

        if (!searchQuery) return text;

        const regex = new RegExp(`(${searchQuery})`, 'gi');

        const parts = text.split(regex);

        return parts.map((part, i) =>

          regex.test(part) ? <mark key={i} className={styles.highlight}>{part}</mark> : part

        );

      };

    

      return (

        <div className={`${styles.snippetDrawer} ${isOpen ? styles.open : ''}`}>

          <h3 className={styles.drawerTitle}>Snippets</h3>

          {loading ? (

            <div className={styles.loadingContainer}>

              <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span>

              <p>Loading snippets...</p>

            </div>

          ) : (

            <>

              <div className={styles.searchContainer}>

                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>search</span>

                <input

                  type="text"

                  className={styles.searchInput}

                  placeholder="Search snippets..."

                  value={searchQuery}

                  onChange={(e) => setSearchQuery(e.target.value)}

                />

                {searchQuery && (

                  <button

                    className={styles.clearButton}

                    onClick={() => setSearchQuery('')}

                    title="Clear search"

                  >

                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>

                  </button>

                )}

              </div>

              <div className={styles.accordionContainer}>

                {filteredCategories.map((category) => (

                <div key={category.name} className={styles.snippetSection}>

                  <button

                    className={styles.snippetSectionHeader}

                    onClick={() => handleToggleSection(category.name)}

                  >

                    {category.name}

                    <span className={styles.icon}>

                      {openSections[category.name] ? '▼' : '▶'}

                    </span>

                  </button>

                  <div

                    className={`${styles.collapsibleContent} ${openSections[category.name] ? styles.open : ''}`}>

                    {category.items.map((item) => (

                      <button

                        key={item.name}

                        className={styles.snippetButton}

                        onClick={() => handleSnippetClick(item.file)}

                        disabled={loadingSnippet === item.file}

                      >
                    {loadingSnippet === item.file ? (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                        {' '}Loading...
                      </>
                    ) : (
                      highlightMatch(item.name)
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
};

export default SnippetDrawer;