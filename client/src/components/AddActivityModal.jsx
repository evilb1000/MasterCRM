import React, { useState } from 'react';
import { createActivity } from '../services/activitiesService';

const AddActivityModal = ({ open, onClose, contact, onActivityAdded }) => {
  const [activityType, setActivityType] = useState('call');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const activityTypes = [
    { value: 'call', label: 'Phone Call' },
    { value: 'email', label: 'Email' },
    { value: 'text', label: 'Text Message' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'showing', label: 'Property Showing' },
    { value: 'follow_up', label: 'Follow Up' },
    { value: 'other', label: 'Other' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('Please enter a description for the activity');
      return;
    }

    setLoading(true);
    try {
      const activityData = {
        contactId: contact.id,
        type: activityType,
        description: description.trim(),
        date: new Date().toISOString()
      };

      const result = await createActivity(activityData);
      
      if (result.success) {
        onActivityAdded && onActivityAdded();
        handleClose();
      } else {
        alert('Failed to add activity: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding activity:', error);
      alert('Failed to add activity. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActivityType('call');
    setDescription('');
    setLoading(false);
    onClose();
  };

  if (!open || !contact) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Add Activity</h2>
          <button style={styles.closeButton} onClick={handleClose}>×</button>
        </div>
        
        <div style={styles.content}>
          <div style={styles.contactInfo}>
            <strong>Contact:</strong> {contact.firstName} {contact.lastName}
            {contact.company && <span style={styles.company}> • {contact.company}</span>}
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Activity Type *</label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                style={styles.select}
                required
              >
                {activityTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened..."
                style={styles.textarea}
                required
              />
            </div>



            <div style={styles.actions}>
              <button
                type="button"
                onClick={handleClose}
                style={styles.cancelButton}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={styles.submitButton}
                disabled={loading || !description.trim()}
              >
                {loading ? 'Adding...' : 'Add Activity'}
              </button>
            </div>
          </form>
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
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#faf8f3',
    borderRadius: 12,
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '2px solid #e0e0e0',
    paddingBottom: '12px',
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#222',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  contactInfo: {
    padding: '12px',
    backgroundColor: '#f0f0f0',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#333',
  },
  company: {
    color: '#666',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontWeight: 500,
    color: '#333',
    fontSize: '14px',
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
  },
  textarea: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    minHeight: '80px',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
  cancelButton: {
    padding: '8px 16px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px',
  },
  submitButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#2c5aa0',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  },
};

export default AddActivityModal; 