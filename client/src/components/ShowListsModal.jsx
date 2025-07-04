import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const ShowListsModal = ({ open, onClose, onShowContactDetail, contactDetailOpen = false }) => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedList, setSelectedList] = useState(null);
  const [contactsInList, setContactsInList] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError('');
    getDocs(collection(db, 'contactLists'))
      .then(snapshot => {
        setLists(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      })
      .catch(err => setError('Failed to load lists: ' + err.message))
      .finally(() => setLoading(false));
  }, [open]);

  // Fetch contacts when a list is selected
  useEffect(() => {
    if (!selectedList) return;
    setContactsLoading(true);
    const fetchContacts = async () => {
      try {
        if (!selectedList.contactIds || selectedList.contactIds.length === 0) {
          setContactsInList([]);
          return;
        }
        // Firestore 'in' query supports max 10 elements, so chunk if needed
        const contactIds = selectedList.contactIds.slice(0, 10);
        const contactsRef = collection(db, 'contacts');
        const snapshot = await getDocs(contactsRef);
        const contacts = snapshot.docs
          .filter(doc => contactIds.includes(doc.id))
          .map(doc => ({ id: doc.id, ...doc.data() }));
        setContactsInList(contacts);
      } catch (err) {
        setContactsInList([]);
      } finally {
        setContactsLoading(false);
      }
    };
    fetchContacts();
  }, [selectedList]);

  if (!open) return null;

  return (
    <div style={{
      ...styles.overlay, 
      pointerEvents: open && !contactDetailOpen ? 'auto' : 'none'
    }}>
      <div style={{
        ...styles.sidebar,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        boxShadow: '0 0 32px 0 rgba(30,30,60,0.18)',
        transition: 'transform 0.35s cubic-bezier(.4,1.2,.4,1)',
      }}>
        <button style={styles.closeButton} onClick={onClose} aria-label="Close">×</button>
        <h2 style={styles.title}>Your Contact Lists</h2>
        {loading ? (
          <div style={styles.loading}>Loading lists...</div>
        ) : error ? (
          <div style={styles.error}>{error}</div>
        ) : lists.length === 0 ? (
          <div style={styles.empty}>No lists found.</div>
        ) : (
          <ul style={styles.list}>
            {lists.map(list => (
              <li key={list.id} style={styles.listItem}>
                <button
                  style={{...styles.actionButton, margin: 0, padding: '8px 0', background: 'none', color: '#1a237e', fontWeight: 600, fontSize: '1.1rem', textAlign: 'left'}}
                  onClick={() => { setSelectedList(list); setShowContactsModal(true); }}
                >
                  {list.name}
                </button>
                <div style={styles.listMeta}>
                  {list.contactIds ? `${list.contactIds.length} contacts` : '0 contacts'}
                  {list.createdAt && (
                    <span style={styles.listDate}>
                      {' | Created: '}
                      {list.createdAt.toDate ? list.createdAt.toDate().toLocaleDateString() : new Date(list.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Contacts Modal */}
      {showContactsModal && (
        <div style={{
          ...styles.contactsModalOverlay, 
          pointerEvents: !contactDetailOpen ? 'auto' : 'none'
        }} onClick={() => { setShowContactsModal(false); setSelectedList(null); }}>
          <div style={styles.contactsModal} onClick={e => e.stopPropagation()}>
            <button style={styles.closeButton} onClick={() => { setShowContactsModal(false); setSelectedList(null); }}>×</button>
            <h3 style={styles.title}>{selectedList?.name || 'Contacts'}</h3>
            {contactsLoading ? (
              <div style={styles.loading}>Loading contacts...</div>
            ) : contactsInList.length === 0 ? (
              <div style={styles.empty}>No contacts in this list.</div>
            ) : (
              <ul style={styles.contactsList}>
                {contactsInList.map(contact => (
                  <li key={contact.id} style={styles.contactListItem}>
                    <button
                      style={styles.actionButton}
                      onClick={() => {
                        if (onShowContactDetail) onShowContactDetail(contact);
                      }}
                    >
                      {contact.firstName || ''} {contact.lastName || ''} {contact.email ? `(${contact.email})` : ''}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
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
  sidebar: {
    position: 'fixed',
    top: 0,
    right: 0,
    height: '100vh',
    width: '370px',
    maxWidth: '95vw',
    background: '#f8f6f1',
    borderLeft: '1.5px solid rgba(40,40,60,0.08)',
    borderTopLeftRadius: '18px',
    borderBottomLeftRadius: '18px',
    padding: '38px 32px 28px 32px',
    overflowY: 'auto',
    fontFamily: 'Georgia, serif',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minHeight: '100vh',
    boxShadow: '-8px 0 32px rgba(0,0,0,0.10)',
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
    margin: '0 0 18px 0',
    color: '#23233a',
    letterSpacing: '0.01em',
    textAlign: 'left',
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
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  listItem: {
    fontSize: '1rem',
    color: '#2c2c2c',
    marginBottom: '12px',
    padding: '8px 0',
    borderBottom: '1px solid #eee',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  listName: {
    fontWeight: 500,
    color: '#1a237e',
    fontSize: '1.1rem',
    marginBottom: '2px',
  },
  listMeta: {
    color: '#666',
    fontSize: '0.95rem',
    marginTop: '2px',
  },
  listDate: {
    marginLeft: '8px',
    color: '#888',
    fontSize: '0.9rem',
  },
  actionButton: {
    background: '#222',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 22px',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
    marginTop: '10px',
    marginBottom: '10px',
    transition: 'background 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
    alignSelf: 'flex-start',
  },
  contactsModalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(30,30,40,0.18)',
    zIndex: 4000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactsModal: {
    background: '#f8f6f1',
    borderRadius: '18px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    padding: '36px 32px 28px 32px',
    minWidth: '350px',
    maxWidth: '95vw',
    minHeight: '100px',
    position: 'relative',
    fontFamily: 'Georgia, serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '10px',
  },
  contactsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  contactListItem: {
    marginBottom: '4px',
  },
};

export default ShowListsModal; 