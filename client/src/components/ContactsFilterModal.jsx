import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const ContactsFilterModal = ({ open, onClose, searchCriteria, onShowContactDetail, contactDetailOpen = false }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchField, setSearchField] = useState('');

  useEffect(() => {
    if (!open || !searchCriteria) return;
    
    setLoading(true);
    setError('');
    
    // Analyze which field to search
    const analyzeSearchField = (searchTerm) => {
      const term = searchTerm.toLowerCase();
      
      // Business sector keywords
      const businessSectorKeywords = [
        'financial', 'finance', 'banking', 'insurance', 'real estate', 'healthcare', 'medical', 'dental',
        'legal', 'law', 'technology', 'tech', 'software', 'consulting', 'retail', 'restaurant', 'food',
        'automotive', 'auto', 'construction', 'manufacturing', 'education', 'school', 'university',
        'government', 'nonprofit', 'charity', 'marketing', 'advertising', 'media', 'entertainment', 'investor'
      ];
      
      // Location keywords
      const locationKeywords = [
        'pittsburgh', 'mt. lebanon', 'bethel park', 'bridgeville', 'south hills', 'north hills',
        'east end', 'west end', 'downtown', 'oakland', 'shadyside', 'squirrel hill', 'lawrenceville',
        'strip district', 'south side', 'north side', 'east liberty', 'bloomfield', 'garfield'
      ];
      
      // Check if it's a business sector
      if (businessSectorKeywords.some(keyword => term.includes(keyword))) {
        return 'businessSector';
      }
      
      // Check if it's a location
      if (locationKeywords.some(keyword => term.includes(keyword))) {
        return 'address';
      }
      
      // Default to company search (most common for business names)
      return 'company';
    };

    const field = analyzeSearchField(searchCriteria);
    setSearchField(field);

    const fetchContacts = async () => {
      try {
        const contactsRef = collection(db, 'contacts');
        const snapshot = await getDocs(contactsRef);
        const allContacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Filter contacts based on the search criteria
        const searchTerm = searchCriteria.toLowerCase();
        const filteredContacts = allContacts.filter(contact => {
          const fieldValue = (contact[field] || '').toLowerCase();
          return fieldValue.includes(searchTerm);
        });
        
        setContacts(filteredContacts);
      } catch (err) {
        setError('Failed to load contacts: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [open, searchCriteria]);

  if (!open) return null;

  return (
    <div style={{
      ...styles.overlay, 
      pointerEvents: open && !contactDetailOpen ? 'auto' : 'none'
    }}>
      <div style={{
        ...styles.centeredModal,
        transform: open ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.95)',
        opacity: open ? 1 : 0,
        boxShadow: '0 0 32px 0 rgba(30,30,60,0.18)',
        transition: 'transform 0.35s cubic-bezier(.4,1.2,.4,1), opacity 0.35s cubic-bezier(.4,1.2,.4,1)',
      }}>
        <button style={styles.closeButton} onClick={onClose} aria-label="Close">×</button>
        <h2 style={styles.title}>
          Contacts with "{searchCriteria}"
        </h2>
        <div style={styles.searchInfo}>
          Searching in: <strong>{searchField === 'businessSector' ? 'Business Sector' : 
                                  searchField === 'address' ? 'Address' : 'Company'}</strong>
        </div>
        
        {loading ? (
          <div style={styles.loading}>Searching contacts...</div>
        ) : error ? (
          <div style={styles.error}>{error}</div>
        ) : contacts.length === 0 ? (
          <div style={styles.empty}>
            No contacts found matching "{searchCriteria}" in {searchField === 'businessSector' ? 'business sector' : 
                                                              searchField === 'address' ? 'address' : 'company'}.
          </div>
        ) : (
          <div style={styles.resultsInfo}>
            Found {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </div>
        )}
        
        {contacts.length > 0 && (
          <ul style={styles.contactsList}>
            {contacts.map(contact => (
              <li key={contact.id} style={styles.contactItem}>
                <button
                  style={styles.contactButton}
                  onClick={() => {
                    if (onShowContactDetail) onShowContactDetail(contact);
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#000'}
                  onMouseLeave={(e) => e.target.style.background = '#222'}
                >
                  <div style={styles.contactName}>
                    {contact.firstName || ''} {contact.lastName || ''}
                  </div>
                  {contact.company && (
                    <div style={styles.contactCompany}>{contact.company}</div>
                  )}
                  {contact.businessSector && (
                    <div style={styles.contactSector}>{contact.businessSector}</div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(30,30,40,0.18)',
    zIndex: 3000,
    display: 'block',
    transition: 'background 0.3s',
  },
  centeredModal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '500px',
    maxWidth: '95vw',
    maxHeight: '80vh',
    background: '#f8f6f1',
    borderRadius: '18px',
    padding: '38px 32px 28px 32px',
    overflowY: 'auto',
    fontFamily: 'Georgia, serif',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  },
  closeButton: {
    position: 'absolute',
    top: '14px',
    right: '20px',
    background: '#222',
    border: 'none',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    fontSize: '1.7rem',
    color: '#fff',
    cursor: 'pointer',
    zIndex: 10,
    transition: 'background 0.2s',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
  },
  title: {
    fontSize: '1.45rem',
    fontWeight: 700,
    margin: '0 0 8px 0',
    color: '#23233a',
    letterSpacing: '0.01em',
    textAlign: 'left',
  },
  searchInfo: {
    fontSize: '0.95rem',
    color: '#666',
    marginBottom: '16px',
    fontStyle: 'italic',
  },
  resultsInfo: {
    fontSize: '1rem',
    color: '#444',
    marginBottom: '16px',
    fontWeight: 500,
  },
  loading: {
    color: '#888',
    fontStyle: 'italic',
    fontSize: '1rem',
    marginBottom: '6px',
  },
  error: {
    color: '#d32f2f',
    background: '#ffebee',
    borderRadius: '8px',
    padding: '12px',
    margin: '20px 0',
    fontSize: '1rem',
  },
  empty: {
    color: '#888',
    fontStyle: 'italic',
    fontSize: '1rem',
    marginBottom: '6px',
    textAlign: 'center',
    padding: '20px',
  },
  contactsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  contactItem: {
    marginBottom: '4px',
  },
  contactButton: {
    width: '100%',
    background: '#222',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 16px',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
    transition: 'background 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  contactName: {
    fontSize: '1.1rem',
    fontWeight: 600,
  },
  contactCompany: {
    fontSize: '0.9rem',
    opacity: 0.9,
  },
  contactSector: {
    fontSize: '0.85rem',
    opacity: 0.8,
    fontStyle: 'italic',
  },
};

export default ContactsFilterModal; 