import React, { useState } from 'react';
import { createActivity } from '../services/activitiesService';
import ListingSelector from './ListingSelector';

const AddActivityModal = ({ open, onClose, contact, onActivityAdded }) => {
  const [activityType, setActivityType] = useState('call');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectToListing, setConnectToListing] = useState(true);
  const [selectedListing, setSelectedListing] = useState(null);
  const [listingSelectorOpen, setListingSelectorOpen] = useState(false);

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
        date: new Date().toISOString(),
        connectToListing: connectToListing,
        selectedListing: selectedListing
      };
      
      console.log('🔍 Activity creation debug:', {
        connectToListing,
        selectedListing,
        activityData
      });

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
    setConnectToListing(false);
    setSelectedListing(null);
    onClose();
  };

  const handleListingSelect = (listing) => {
    setSelectedListing(listing);
    setListingSelectorOpen(false);
  };

  const handleConnectToListingChange = (checked) => {
    setConnectToListing(checked);
    if (!checked) {
      setSelectedListing(null);
    }
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

            <div style={styles.listingSection}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={connectToListing}
                  onChange={(e) => handleConnectToListingChange(e.target.checked)}
                  style={styles.checkbox}
                />
                Connect this activity to a listing
              </label>
              
              {connectToListing && (
                <div style={styles.listingSelector}>
                  {selectedListing ? (
                    <div style={styles.selectedListing}>
                      <span style={styles.selectedListingName}>
                        {(() => {
                          if (selectedListing.name && selectedListing.name.trim()) {
                            return selectedListing.name;
                          } else if (selectedListing.address && selectedListing.address.trim()) {
                            return selectedListing.address;
                          } else if (selectedListing.streetAddress && selectedListing.streetAddress.trim()) {
                            return selectedListing.streetAddress;
                          } else if (selectedListing.title && selectedListing.title.trim()) {
                            return selectedListing.title;
                          } else {
                            return `Listing ${selectedListing.id.slice(-6)}`;
                          }
                        })()}
                      </span>
                      <button
                        type="button"
                        onClick={() => setListingSelectorOpen(true)}
                        style={styles.changeButton}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setListingSelectorOpen(true)}
                      style={styles.selectButton}
                    >
                      Select a Listing
                    </button>
                  )}
                </div>
              )}
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
                disabled={loading || !description.trim() || (connectToListing && !selectedListing)}
              >
                {loading ? 'Adding...' : 'Add Activity'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <ListingSelector
        open={listingSelectorOpen}
        onClose={() => setListingSelectorOpen(false)}
        onSelect={handleListingSelect}
        loading={loading}
      />
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
  listingSection: {
    padding: '16px',
    border: '1px solid #eee',
    borderRadius: '8px',
    background: '#fafafa',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    fontWeight: 500,
    color: '#222',
    cursor: 'pointer',
    fontSize: '14px',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  listingSelector: {
    marginTop: '8px',
  },
  selectedListing: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: '6px',
  },
  selectedListingName: {
    fontWeight: 500,
    color: '#222',
    fontSize: '14px',
  },
  changeButton: {
    background: 'rgba(0,0,0,0.1)',
    color: '#222',
    border: '1px solid #ccc',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  selectButton: {
    background: 'rgba(0,0,0,0.8)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    cursor: 'pointer',
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