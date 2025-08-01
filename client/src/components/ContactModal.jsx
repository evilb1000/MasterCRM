import React, { useState, useEffect } from 'react';
import { firebase } from '../firebase';

const SECTOR_OPTIONS = [
  '',
  'Retail',
  'Industrial',
  'Investor',
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Real Estate',
  'Manufacturing',
  'Consulting',
  'Other',
];

const ContactModal = ({ open, onClose, contact, mode = 'view', onSave }) => {
  const [editContact, setEditContact] = useState(contact || {});
  const [contactActivities, setContactActivities] = useState([]);
  const [contactActivitiesLoading, setContactActivitiesLoading] = useState(false);

  useEffect(() => {
    setEditContact(contact || {});
  }, [contact]);

  useEffect(() => {
    // Fetch activities for the contact when modal opens in view mode
    const fetchContactActivities = async () => {
      if (!open || !contact || mode !== 'view') {
        setContactActivities([]);
        return;
      }
      
      setContactActivitiesLoading(true);
      try {
        console.log('Fetching activities for contact:', contact.id);
        
        // Query activities by contactId
        const querySnapshot = await firebase.firestore()
          .collection("activities")
          .where("contactId", "==", contact.id)
          .orderBy("timestamp", "desc")
          .get();
        
        console.log('Contact activities found:', querySnapshot.docs.length);
        
        const activitiesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setContactActivities(activitiesData);
      } catch (err) {
        console.error('Error fetching contact activities:', err);
        setContactActivities([]);
      } finally {
        setContactActivitiesLoading(false);
      }
    };
    
    fetchContactActivities();
  }, [open, contact, mode]);

  if (!open) return null;

  const handleChange = (field, value) => {
    setEditContact(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (onSave) onSave(editContact);
  };

  // Create styles based on current mode
  const getStyles = (currentMode) => ({
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.25)',
      zIndex: 5000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'auto',
    },
    modal: {
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '18px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      padding: currentMode === 'edit' ? '20px 30px 16px 30px' : '36px 48px 32px 48px',
      minWidth: '500px',
      maxWidth: currentMode === 'edit' ? '900px' : '700px',
      width: currentMode === 'edit' ? '95vw' : '90vw',
      minHeight: '200px',
      maxHeight: currentMode === 'edit' ? '75vh' : '95vh',
      position: 'relative',
      fontFamily: 'Georgia, serif',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    closeButton: {
      position: 'absolute',
      top: 18,
      right: 22,
      fontSize: 28,
      background: 'none',
      border: 'none',
      color: '#222',
      cursor: 'pointer',
      zIndex: 2,
    },
    title: {
      fontSize: currentMode === 'edit' ? '1.5rem' : '2rem',
      fontWeight: 600,
      marginBottom: currentMode === 'edit' ? 12 : 18,
      color: '#222',
      textAlign: 'center',
    },
    content: {
      display: 'flex',
      flexDirection: 'column',
      gap: currentMode === 'edit' ? 12 : 18,
      marginBottom: currentMode === 'edit' ? 12 : 18,
      flex: 1,
    },
    actions: {
      display: 'flex',
      justifyContent: 'center',
      gap: 18,
      marginTop: 10,
    },
    saveButton: {
      background: '#222',
      color: '#fff',
      border: 'none',
      borderRadius: 8,
      padding: '10px 28px',
      fontSize: '1rem',
      fontFamily: 'Georgia, serif',
      cursor: 'pointer',
      fontWeight: 500,
      transition: 'background 0.2s',
    },
    cancelButton: {
      background: 'rgba(0,0,0,0.08)',
      color: '#222',
      border: 'none',
      borderRadius: 8,
      padding: '10px 28px',
      fontSize: '1rem',
      fontFamily: 'Georgia, serif',
      cursor: 'pointer',
      fontWeight: 500,
      transition: 'background 0.2s',
    },
    activitiesSection: {
      marginTop: 10,
      maxHeight: '200px',
      overflowY: 'auto',
    },
    activitiesTitle: {
      fontSize: '1.2rem',
      fontWeight: 600,
      marginBottom: 8,
      color: '#222',
    },
    activitiesLoading: {
      color: '#222',
      fontSize: '1rem',
      fontFamily: 'Georgia, serif',
      textAlign: 'center',
    },
    activitiesEmpty: {
      color: '#222',
      fontSize: '1rem',
      fontFamily: 'Georgia, serif',
      textAlign: 'center',
    },
    activitiesList: {
      listStyleType: 'none',
      padding: 0,
    },
    activityItem: {
      marginBottom: 6,
      padding: '4px 0',
    },
    activityType: {
      fontWeight: 500,
      color: '#222',
      fontSize: '0.9rem',
    },
    activityNotes: {
      color: '#444',
      fontSize: '0.85rem',
      fontFamily: 'Georgia, serif',
      wordBreak: 'break-word',
    },
    activityTimestamp: {
      color: '#666',
      fontSize: '0.75rem',
      fontFamily: 'Georgia, serif',
    },
    notesTextarea: {
      height: currentMode === 'edit' ? '60px' : '300px',
      resize: 'vertical',
      minHeight: currentMode === 'edit' ? '50px' : '200px',
      maxHeight: currentMode === 'edit' ? '80px' : '600px',
      width: '100%',
      fontSize: '1.1rem',
      overflowY: 'auto',
    },
    notesDisplay: {
      flex: 1,
      maxHeight: currentMode === 'edit' ? '400px' : '200px',
      overflowY: 'auto',
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: 6,
      fontSize: '1rem',
      fontFamily: 'Georgia, serif',
      background: 'rgba(255,255,255,0.7)',
      color: '#222',
      wordBreak: 'break-word',
      lineHeight: '1.4',
    },
  });

  const styles = getStyles(mode);

  return (
    open && (
      <div style={styles.overlay}>
        <div
          style={{
            ...styles.modal,
            ...(mode === 'edit' ? {
              maxWidth: '1000px',
              width: '98vw',
              minHeight: '300px',
              padding: '20px 30px 16px 30px',
            } : {})
          }}
        >
          <button style={styles.closeButton} onClick={onClose}>&times;</button>
          <h2 style={styles.title}>
            {mode === 'edit' ? 'Edit Contact' : 'Contact Details'}
          </h2>
          <div style={styles.content}>
            {/* Address */}
            <ModalField
              label="Address"
              value={editContact.address || ''}
              mode={mode}
              onChange={v => handleChange('address', v)}
            />
            {/* Business Sector */}
            <div style={fieldStyles.fieldRow}>
              <label style={fieldStyles.label}>Business Sector:</label>
              {mode === 'edit' ? (
                <select
                  style={fieldStyles.input}
                  value={editContact.businessSector || ''}
                  onChange={e => handleChange('businessSector', e.target.value)}
                >
                  {SECTOR_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt || 'Select sector...'}</option>
                  ))}
                </select>
              ) : (
                <span style={fieldStyles.value}>{editContact.businessSector || ''}</span>
              )}
            </div>
            {/* Company */}
            <ModalField
              label="Company"
              value={editContact.company || ''}
              mode={mode}
              onChange={v => handleChange('company', v)}
            />
            {/* Email */}
            <ModalField
              label="Email"
              value={editContact.email || ''}
              mode={mode}
              onChange={v => handleChange('email', v)}
            />
            {/* First Name */}
            <ModalField
              label="First Name"
              value={editContact.firstName || ''}
              mode={mode}
              onChange={v => handleChange('firstName', v)}
            />
            {/* Last Name */}
            <ModalField
              label="Last Name"
              value={editContact.lastName || ''}
              mode={mode}
              onChange={v => handleChange('lastName', v)}
            />
            {/* LinkedIn */}
            <ModalField
              label="LinkedIn"
              value={editContact.linkedin || ''}
              mode={mode}
              onChange={v => handleChange('linkedin', v)}
            />
            {/* Phone */}
            <ModalField
              label="Phone"
              value={editContact.phone || ''}
              mode={mode}
              onChange={v => handleChange('phone', v)}
            />
            {/* Notes - Enhanced with scrollable area */}
            <div style={fieldStyles.fieldRow}>
              <label style={fieldStyles.label}>Notes:</label>
              {mode === 'edit' ? (
                <textarea
                  style={{
                    ...fieldStyles.input,
                    ...styles.notesTextarea,
                    height: mode === 'edit' ? '60px' : '500px',
                    minHeight: mode === 'edit' ? '50px' : '400px',
                    maxHeight: mode === 'edit' ? '80px' : '1000px',
                    fontSize: '1.2rem',
                    ...(mode === 'edit' ? { width: '100%' } : {})
                  }}
                  value={editContact.notes || ''}
                  onChange={e => handleChange('notes', e.target.value)}
                  placeholder="Enter notes about this contact..."
                />
              ) : (
                <div style={styles.notesDisplay}>
                  {(editContact.notes || '').split('\n').map((line, idx) => (
                    <React.Fragment key={idx}>
                      {line}
                      <br />
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
            {/* Activities - only show in view mode */}
            {mode === 'view' && (
              <div style={styles.activitiesSection}>
                <div style={styles.activitiesTitle}>Activities</div>
                {contactActivitiesLoading ? (
                  <div style={styles.activitiesLoading}>Loading activities...</div>
                ) : contactActivities.length === 0 ? (
                  <div style={styles.activitiesEmpty}>No activities for this contact.</div>
                ) : (
                  <ul style={styles.activitiesList}>
                    {contactActivities.map(activity => (
                      <li key={activity.id} style={styles.activityItem}>
                        <div style={styles.activityType}>{activity.type || 'Activity'}</div>
                        <div style={styles.activityNotes}>{activity.notes || 'No notes'}</div>
                        <div style={styles.activityTimestamp}>
                          {activity.timestamp?.toDate?.() ? 
                            activity.timestamp.toDate().toLocaleDateString() : 
                            'Unknown date'
                          }
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          {mode === 'edit' && (
            <div style={styles.actions}>
              <button style={styles.saveButton} onClick={handleSave}>Save</button>
              <button style={styles.cancelButton} onClick={onClose}>Cancel</button>
            </div>
          )}
        </div>
      </div>
    )
  );
};

const ModalField = ({ label, value, mode, onChange, textarea }) => (
  <div style={fieldStyles.fieldRow}>
    <label style={fieldStyles.label}>{label}:</label>
    {mode === 'edit' ? (
      textarea ? (
        <textarea
          style={fieldStyles.textarea}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      ) : (
        <input
          style={fieldStyles.input}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )
    ) : (
      <span style={fieldStyles.value}>{value}</span>
    )}
  </div>
);

const fieldStyles = {
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  label: {
    minWidth: 110,
    fontWeight: 500,
    color: '#444',
    fontSize: '1rem',
  },
  value: {
    color: '#222',
    fontSize: '1rem',
    fontFamily: 'Georgia, serif',
    wordBreak: 'break-word',
  },
  input: {
    flex: 1,
    padding: '7px 12px',
    border: '1px solid #ddd',
    borderRadius: 6,
    fontSize: '1rem',
    fontFamily: 'Georgia, serif',
    background: 'rgba(255,255,255,0.7)',
    color: '#222',
    outline: 'none',
    transition: 'border 0.2s',
  },
  textarea: {
    flex: 1,
    padding: '7px 12px',
    border: '1px solid #ddd',
    borderRadius: 6,
    fontSize: '1rem',
    fontFamily: 'Georgia, serif',
    background: 'rgba(255,255,255,0.7)',
    color: '#222',
    outline: 'none',
    transition: 'border 0.2s',
    resize: 'vertical',
    minHeight: '50px',
    maxHeight: '80px',
    overflowY: 'auto',
  },
};

export default ContactModal; 