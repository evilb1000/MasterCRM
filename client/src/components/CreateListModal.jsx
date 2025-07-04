import React, { useState } from 'react';

const CreateListModal = ({ open, contacts, onClose, onSave, loading }) => {
  const [listName, setListName] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSave = () => {
    if (!listName.trim()) {
      setError('Please enter a list name.');
      return;
    }
    if (!contacts || contacts.length === 0) {
      setError('No contacts selected.');
      return;
    }
    setError('');
    onSave({ name: listName.trim(), contactIds: contacts.map(c => c.id) });
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Create a New List</h2>
        <label style={styles.label}>
          List Name:
          <input
            type="text"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            style={styles.input}
            disabled={loading}
            placeholder="Enter list name..."
          />
        </label>
        <div style={styles.contactsSection}>
          <div style={styles.contactsHeader}>Selected Contacts:</div>
          <div style={styles.contactsList}>
            {(!contacts || contacts.length === 0) ? (
              <div style={styles.noContacts}>No contacts selected.</div>
            ) : (
              contacts.map((contact) => (
                <div key={contact.id} style={styles.selectedContact}>
                  <span style={styles.contactName}>{contact.name}</span>
                  {contact.email && (
                    <span style={styles.contactEmail}>({contact.email})</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        {error && <div style={styles.error}>{error}</div>}
        <div style={styles.actions}>
          <button onClick={onClose} style={styles.cancelButton} disabled={loading}>
            Cancel
          </button>
          <button onClick={handleSave} style={styles.saveButton} disabled={loading}>
            {loading ? 'Saving...' : 'Save List'}
          </button>
        </div>
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
    background: 'rgba(0,0,0,0.25)',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '16px',
    padding: '32px',
    minWidth: '350px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    fontFamily: 'Georgia, serif',
    position: 'relative',
  },
  title: {
    fontSize: '1.7rem',
    marginBottom: '18px',
    fontWeight: 500,
    color: '#222',
  },
  label: {
    display: 'block',
    marginBottom: '18px',
    fontWeight: 400,
    color: '#333',
    fontSize: '1.1rem',
  },
  input: {
    display: 'block',
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    marginTop: '8px',
    fontSize: '1rem',
    fontFamily: 'Georgia, serif',
  },
  contactsSection: {
    marginBottom: '18px',
  },
  contactsHeader: {
    fontWeight: 500,
    marginBottom: '8px',
    color: '#222',
  },
  contactsList: {
    maxHeight: '200px',
    overflowY: 'auto',
    border: '1px solid #eee',
    borderRadius: '8px',
    background: '#fafafa',
    padding: '10px',
  },
  selectedContact: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
    fontSize: '1rem',
    color: '#222',
    background: '#fff',
    borderRadius: '8px',
    padding: '8px 12px',
    fontWeight: 500,
  },
  noContacts: {
    color: '#888',
    fontStyle: 'italic',
    padding: '8px',
  },
  contactName: {
    fontWeight: 500,
    marginRight: '4px',
  },
  contactEmail: {
    color: '#888',
    fontSize: '0.95em',
  },
  error: {
    color: '#b71c1c',
    background: '#ffebee',
    borderRadius: '6px',
    padding: '8px 12px',
    margin: '10px 0',
    fontSize: '1rem',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '18px',
  },
  cancelButton: {
    background: 'rgba(0,0,0,0.2)',
    color: '#222',
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '10px 22px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
  },
  saveButton: {
    background: 'rgba(0,0,0,0.8)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 22px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
  },
};

export default CreateListModal; 