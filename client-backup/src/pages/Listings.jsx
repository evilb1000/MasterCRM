import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db, firebase } from '../firebase';
import { Link } from 'react-router-dom';

const Listings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState({});
  const [contactLists, setContactLists] = useState([]);
  const [contactListsLoading, setContactListsLoading] = useState(false);
  const [contactPanelOpen, setContactPanelOpen] = useState(false);
  const [selectedContactList, setSelectedContactList] = useState(null);
  const [contactsInList, setContactsInList] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [contactActivities, setContactActivities] = useState([]);
  const [contactActivitiesLoading, setContactActivitiesLoading] = useState(false);


  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true);
        const listingsRef = collection(db, 'listings');
        const querySnapshot = await getDocs(listingsRef);
        const listingsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data
          };
        });
        setListings(listingsData);
        setError(null);
      } catch (err) {
        setError('Failed to load listings: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, []);

  useEffect(() => {
    // Fetch contact lists for the selected listing when modal opens in view mode
    const fetchContactLists = async () => {
      if (!modalOpen || !selectedListing || !selectedListing.contactListIds || editMode) {
        setContactLists([]);
        return;
      }
      if (!Array.isArray(selectedListing.contactListIds) || selectedListing.contactListIds.length === 0) {
        setContactLists([]);
        return;
      }
      setContactListsLoading(true);
      try {
        const contactListsRef = collection(db, 'contactLists');
        const q = query(contactListsRef, where('__name__', 'in', selectedListing.contactListIds.slice(0,10)));
        // Firestore 'in' query supports max 10 elements
        const querySnapshot = await getDocs(q);
        const lists = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setContactLists(lists);
      } catch (err) {
        setContactLists([]);
      } finally {
        setContactListsLoading(false);
      }
    };
    fetchContactLists();
  }, [modalOpen, selectedListing, editMode]);

  useEffect(() => {
    // Fetch activities for the selected listing when modal opens
    const fetchActivities = async () => {
      if (!modalOpen || !selectedListing || editMode) {
        setActivities([]);
        return;
      }
      
      setActivitiesLoading(true);
      try {
        console.log('Fetching activities for listing:', selectedListing.id);
        
        // Query for activities connected to this listing
        const querySnapshot = await firebase.firestore()
          .collection("activities")
          .where("listingId", "==", selectedListing.id)
          .orderBy("date", "desc")
          .get();
        
        console.log('Activities found:', querySnapshot.docs.length);
        
        const activitiesData = await Promise.all(querySnapshot.docs.map(async doc => {
          const data = doc.data();
          
          // Fetch contact name if contactId exists
          let contactName = 'Unknown Contact';
          if (data.contactId) {
            try {
              const contactDoc = await firebase.firestore()
                .collection('contacts')
                .doc(data.contactId)
                .get();
              
              if (contactDoc.exists) {
                const contactData = contactDoc.data();
                contactName = contactData.firstName && contactData.lastName 
                  ? `${contactData.firstName} ${contactData.lastName}`
                  : contactData.firstName || contactData.lastName || 'Unnamed Contact';
              }
            } catch (err) {
              console.error('Error fetching contact name:', err);
            }
          }
          
          return {
            id: doc.id,
            ...data,
            contactName
          };
        }));
        
        setActivities(activitiesData);
      } catch (err) {
        console.error('Error fetching activities:', err);
        setActivities([]);
      } finally {
        setActivitiesLoading(false);
      }
    };
    
    fetchActivities();
  }, [modalOpen, selectedListing, editMode]);

  useEffect(() => {
    // Fetch activities for the selected contact when contact modal opens
    const fetchContactActivities = async () => {
      if (!contactModalOpen || !selectedContact) {
        setContactActivities([]);
        return;
      }
      
      setContactActivitiesLoading(true);
      try {
        console.log('Fetching activities for contact:', selectedContact.id);
        
        // Query activities by contactId
        const querySnapshot = await firebase.firestore()
          .collection("activities")
          .where("contactId", "==", selectedContact.id)
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
  }, [contactModalOpen, selectedContact]);

  const openModal = (listing) => {
    setSelectedListing(listing);
    setEditMode(false);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setSelectedListing(null);
    setEditMode(false);
    setEditFields({});
  };

  const handleEdit = (listing, e) => {
    e.stopPropagation();
    setSelectedListing(listing);
    setEditFields({
      streetAddress: listing.streetAddress || '',
      city: listing.city || '',
      state: listing.state || '',
      zip: listing.zip || '',
      'SF available': listing['SF available'] || '',
      leaseorsale: listing.leaseorsale || '',
      'price per sf': listing['price per sf'] || '',
    });
    setEditMode(true);
    setModalOpen(true);
  };

  const handleFieldChange = (field, value) => {
    setEditFields(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!selectedListing) return;
    try {
      const docRef = collection(db, 'listings');
      // Use updateDoc for existing doc
      const { id } = selectedListing;
      const { streetAddress, city, state, zip, 'SF available': sfAvailable, leaseorsale, 'price per sf': pricePerSf } = editFields;
      await import('firebase/firestore').then(({ doc, updateDoc }) =>
        updateDoc(doc(db, 'listings', id), {
          streetAddress,
          city,
          state,
          zip,
          'SF available': sfAvailable,
          leaseorsale,
          'price per sf': pricePerSf,
        })
      );
      setListings(prev => prev.map(l => l.id === id ? { ...l, ...editFields } : l));
      closeModal();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  };

  const handleContactListClick = async (contactList) => {
    setSelectedContactList(contactList);
    setContactPanelOpen(true);
    setContactsLoading(true);
    try {
      const contactsRef = collection(db, 'contacts');
      const q = query(contactsRef, where('__name__', 'in', contactList.contactIds.slice(0,10)));
      const querySnapshot = await getDocs(q);
      const contacts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setContactsInList(contacts);
    } catch (err) {
      setContactsInList([]);
    } finally {
      setContactsLoading(false);
    }
  };

  const handleContactClick = (contact) => {
    setSelectedContact(contact);
    setContactModalOpen(true);
  };

  const closeContactPanel = () => {
    setContactPanelOpen(false);
    setSelectedContactList(null);
    setContactsInList([]);
  };

  const closeContactModal = () => {
    setContactModalOpen(false);
    setSelectedContact(null);
  };

  return (
    <div style={styles.page}>
      <Link to="/" style={styles.homeButton}>Home</Link>
      <div style={styles.header}>
        <h1 style={styles.title}>Listings</h1>
        <p style={styles.subtitle}>
          {loading ? 'Loading listings...' : `${listings.length} listing${listings.length === 1 ? '' : 's'} shown`}
        </p>
        {error && <div style={styles.error}>{error}</div>}
      </div>
      <div style={styles.listingsGrid}>
        {listings.map(listing => (
          <div
            key={listing.id}
            style={styles.listingCard}
            onClick={() => openModal(listing)}
            tabIndex={0}
            role="button"
            aria-pressed={false}
            onMouseEnter={e => e.currentTarget.style.boxShadow = styles.listingCardHover.boxShadow}
            onMouseLeave={e => e.currentTarget.style.boxShadow = styles.listingCard.boxShadow}
          >
            <button
              style={styles.editButton}
              onClick={e => handleEdit(listing, e)}
              tabIndex={-1}
              aria-label="Edit listing"
            >
              ✎
            </button>
            <div style={styles.listingField}><span style={styles.label}>Address:</span> {listing.streetAddress || 'N/A'}</div>
            <div style={styles.listingField}><span style={styles.label}>City:</span> {listing.city || 'N/A'}</div>
            <div style={styles.listingField}><span style={styles.label}>State:</span> {listing.state || 'N/A'}</div>
            <div style={styles.listingField}><span style={styles.label}>Zip:</span> {listing.zip || 'N/A'}</div>
            <div style={styles.listingField}><span style={styles.label}>SF Available:</span> {listing['SF available'] || 'N/A'}</div>
            <div style={styles.listingField}><span style={styles.label}>Lease or Sale:</span> {listing.leaseorsale || 'N/A'}</div>
            <div style={styles.listingField}><span style={styles.label}>Price per SF:</span> {listing['price per sf'] || 'N/A'}</div>
          </div>
        ))}
      </div>
      {modalOpen && selectedListing && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <button style={styles.closeButton} onClick={closeModal}>×</button>
            <h2 style={styles.modalTitle}>{editMode ? 'Edit Listing' : 'Listing Details'}</h2>
            {editMode ? (
              <>
                <div style={styles.modalField}>
                  <span style={styles.label}>Address:</span>
                  <input style={styles.input} value={editFields.streetAddress} onChange={e => handleFieldChange('streetAddress', e.target.value)} />
                </div>
                <div style={styles.modalField}>
                  <span style={styles.label}>City:</span>
                  <input style={styles.input} value={editFields.city} onChange={e => handleFieldChange('city', e.target.value)} />
                </div>
                <div style={styles.modalField}>
                  <span style={styles.label}>State:</span>
                  <input style={styles.input} value={editFields.state} onChange={e => handleFieldChange('state', e.target.value)} />
                </div>
                <div style={styles.modalField}>
                  <span style={styles.label}>Zip:</span>
                  <input style={styles.input} value={editFields.zip} onChange={e => handleFieldChange('zip', e.target.value)} />
                </div>
                <div style={styles.modalField}>
                  <span style={styles.label}>SF Available:</span>
                  <input style={styles.input} value={editFields['SF available']} onChange={e => handleFieldChange('SF available', e.target.value)} />
                </div>
                <div style={styles.modalField}>
                  <span style={styles.label}>Lease or Sale:</span>
                  <input style={styles.input} value={editFields.leaseorsale} onChange={e => handleFieldChange('leaseorsale', e.target.value)} />
                </div>
                <div style={styles.modalField}>
                  <span style={styles.label}>Price per SF:</span>
                  <input style={styles.input} value={editFields['price per sf']} onChange={e => handleFieldChange('price per sf', e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '16px', marginTop: '18px' }}>
                  <button style={styles.saveButton} onClick={handleSave}>Save</button>
                  <button style={styles.cancelButton} onClick={closeModal}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div style={styles.modalField}><span style={styles.label}>Address:</span> {selectedListing.streetAddress || 'N/A'}</div>
                <div style={styles.modalField}><span style={styles.label}>City:</span> {selectedListing.city || 'N/A'}</div>
                <div style={styles.modalField}><span style={styles.label}>State:</span> {selectedListing.state || 'N/A'}</div>
                <div style={styles.modalField}><span style={styles.label}>Zip:</span> {selectedListing.zip || 'N/A'}</div>
                <div style={styles.modalField}><span style={styles.label}>SF Available:</span> {selectedListing['SF available'] || 'N/A'}</div>
                <div style={styles.modalField}><span style={styles.label}>Lease or Sale:</span> {selectedListing.leaseorsale || 'N/A'}</div>
                <div style={styles.modalField}><span style={styles.label}>Price per SF:</span> {selectedListing['price per sf'] || 'N/A'}</div>
                <div style={styles.contactListsSection}>
                  <div style={styles.contactListsTitle}>Contact Lists</div>
                  {contactListsLoading ? (
                    <div style={styles.contactListsLoading}>Loading contact lists...</div>
                  ) : contactLists.length === 0 ? (
                    <div style={styles.contactListsEmpty}>No contact lists associated.</div>
                  ) : (
                    <ul style={styles.contactListsList}>
                      {contactLists.map(list => (
                        <li key={list.id} style={styles.contactListItem}>
                          <button
                            style={styles.contactListButton}
                            onClick={() => handleContactListClick(list)}
                          >
                            <span style={styles.contactListName}>{list.name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div style={styles.activitiesSection}>
                  <div style={styles.activitiesTitle}>Listing Activities</div>
                  {activitiesLoading ? (
                    <div style={styles.activitiesLoading}>Loading activities...</div>
                  ) : activities.length === 0 ? (
                    <div style={styles.activitiesEmpty}>No activities for this listing.</div>
                  ) : (
                    <ul style={styles.activitiesList}>
                      {activities.map(activity => (
                        <li key={activity.id} style={styles.activityItem}>
                          <button
                            className="activity-button"
                            style={styles.activityButton}
                            onClick={async () => {
                              if (!activity.contactId) return;
                              try {
                                const contactDoc = await getDocs(query(collection(db, 'contacts'), where('__name__', '==', activity.contactId)));
                                const contact = contactDoc.docs[0]?.data();
                                if (contact) {
                                  setSelectedContact({ id: activity.contactId, ...contact });
                                  setContactModalOpen(true);
                                }
                              } catch (err) {
                                alert('Failed to load contact info.');
                              }
                            }}
                          >
                            <div style={styles.activityContact}>
                              <strong>{activity.contactName || 'Unknown Contact'}</strong>
                            </div>
                            <div style={styles.activityNotes}>
                              <strong>{activity.type || 'Activity'}</strong>: {activity.description || 'No description'}
                            </div>
                            <div style={styles.activityTimestamp}>
                              {activity.date?.toDate?.() ? 
                                activity.date.toDate().toLocaleDateString() : 
                                activity.date ? new Date(activity.date).toLocaleDateString() :
                                'Unknown date'
                              }
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {contactPanelOpen && selectedContactList && (
        <div style={styles.contactPanelOverlay} onClick={closeContactPanel}>
          <div style={styles.contactPanel} onClick={e => e.stopPropagation()}>
            <button style={styles.closeContactPanelButton} onClick={closeContactPanel}>×</button>
            <h3 style={styles.contactPanelTitle}>{selectedContactList.name}</h3>
            {contactsLoading ? (
              <div style={styles.contactsLoading}>Loading contacts...</div>
            ) : contactsInList.length === 0 ? (
              <div style={styles.contactsEmpty}>No contacts in this list.</div>
            ) : (
              <div style={styles.contactsList}>
                {contactsInList.map(contact => (
                  <button
                    key={contact.id}
                    style={styles.contactButton}
                    onClick={() => handleContactClick(contact)}
                  >
                    <div style={styles.contactButtonName}>
                      {contact.firstName && contact.lastName 
                        ? `${contact.firstName} ${contact.lastName}`
                        : contact.firstName || contact.lastName || 'Unnamed Contact'
                      }
                    </div>
                    {contact.company && (
                      <div style={styles.contactButtonCompany}>{contact.company}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {contactModalOpen && selectedContact && (
        <div style={styles.contactModalOverlay} onClick={closeContactModal}>
          <div style={styles.contactModal} onClick={e => e.stopPropagation()}>
            <button style={styles.closeContactModalButton} onClick={closeContactModal}>×</button>
            <h3 style={styles.contactModalTitle}>Contact Details</h3>
            <div style={styles.contactModalField}>
              <span style={styles.label}>Name:</span> 
              {selectedContact.firstName && selectedContact.lastName 
                ? `${selectedContact.firstName} ${selectedContact.lastName}`
                : selectedContact.firstName || selectedContact.lastName || 'N/A'
              }
            </div>
            {selectedContact.company && (
              <div style={styles.contactModalField}>
                <span style={styles.label}>Company:</span> {selectedContact.company}
              </div>
            )}
            {selectedContact.email && (
              <div style={styles.contactModalField}>
                <span style={styles.label}>Email:</span> {selectedContact.email}
              </div>
            )}
            {selectedContact.phone && (
              <div style={styles.contactModalField}>
                <span style={styles.label}>Phone:</span> {selectedContact.phone}
              </div>
            )}
            {selectedContact.businessSector && (
              <div style={styles.contactModalField}>
                <span style={styles.label}>Sector:</span> {selectedContact.businessSector}
              </div>
            )}
            <div style={styles.contactActivitiesSection}>
              <div style={styles.contactActivitiesTitle}>Activities</div>
              {contactActivitiesLoading ? (
                <div style={styles.contactActivitiesLoading}>Loading activities...</div>
              ) : contactActivities.length === 0 ? (
                <div style={styles.contactActivitiesEmpty}>No activities for this contact.</div>
              ) : (
                <ul style={styles.contactActivitiesList}>
                  {contactActivities.map(activity => (
                    <li key={activity.id} style={styles.contactActivityItem}>
                      <div style={styles.contactActivityType}>{activity.type || 'Activity'}</div>
                      <div style={styles.contactActivityNotes}>{activity.notes || 'No notes'}</div>
                      <div style={styles.contactActivityTimestamp}>
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
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: '#faf8f3',
    fontFamily: 'Georgia, serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 0',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '400',
    color: '#2c2c2c',
    margin: '0 0 10px 0',
    letterSpacing: '1px',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  subtitle: {
    fontSize: '1.2rem',
    color: '#666',
    margin: 0,
    fontStyle: 'italic',
  },
  error: {
    color: '#d32f2f',
    background: '#ffebee',
    borderRadius: '8px',
    padding: '12px',
    margin: '20px 0',
    fontSize: '1rem',
  },
  listingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '32px',
    width: '100%',
    maxWidth: '1100px',
    margin: '0 auto',
  },
  listingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    padding: '25px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    position: 'relative',
    transition: 'box-shadow 0.3s cubic-bezier(.4,2,.3,1)',
    cursor: 'pointer',
  },
  listingCardHover: {
    boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
  },
  editButton: {
    position: 'absolute',
    top: '12px',
    right: '16px',
    background: 'rgba(0,0,0,0.08)',
    border: 'none',
    borderRadius: '6px',
    color: '#333',
    fontSize: '1.1rem',
    padding: '4px 10px',
    cursor: 'pointer',
    zIndex: 2,
    transition: 'background 0.2s',
  },
  listingField: {
    fontSize: '1rem',
    color: '#2c2c2c',
    marginBottom: '4px',
  },
  label: {
    fontWeight: '600',
    color: '#222',
    marginRight: '8px',
  },
  modalOverlay: {
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
    background: 'rgba(255,255,255,0.97)',
    borderRadius: '16px',
    padding: '36px 32px 28px 32px',
    minWidth: '350px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    fontFamily: 'Georgia, serif',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  closeButton: {
    position: 'absolute',
    top: '12px',
    right: '18px',
    background: 'none',
    border: 'none',
    fontSize: '2rem',
    color: '#222',
    cursor: 'pointer',
    zIndex: 10,
  },
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    margin: '0 0 18px 0',
    color: '#222',
  },
  modalField: {
    fontSize: '1.1rem',
    color: '#2c2c2c',
    marginBottom: '6px',
  },
  input: {
    fontSize: '1rem',
    padding: '7px 10px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    marginLeft: '8px',
    minWidth: '160px',
    outline: 'none',
    fontFamily: 'Georgia, serif',
    background: '#fff',
    color: '#222',
    marginBottom: '2px',
  },
  saveButton: {
    background: '#222',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 22px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  cancelButton: {
    background: 'rgba(0,0,0,0.08)',
    color: '#222',
    border: '1px solid #ccc',
    borderRadius: '6px',
    padding: '10px 22px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  homeButton: {
    position: 'fixed',
    top: '32px',
    left: '32px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#ffffff',
    textDecoration: 'none',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '12px 25px',
    fontSize: '16px',
    fontWeight: '400',
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    fontFamily: 'Georgia, serif',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    zIndex: 1000,
  },
  contactListsSection: {
    marginTop: '18px',
    paddingTop: '12px',
    borderTop: '1px solid #eee',
  },
  contactListsTitle: {
    fontWeight: 600,
    fontSize: '1.1rem',
    marginBottom: '8px',
    color: '#222',
  },
  contactListsLoading: {
    color: '#888',
    fontStyle: 'italic',
    fontSize: '1rem',
    marginBottom: '6px',
  },
  contactListsEmpty: {
    color: '#888',
    fontStyle: 'italic',
    fontSize: '1rem',
    marginBottom: '6px',
  },
  contactListsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  contactListItem: {
    fontSize: '1rem',
    color: '#2c2c2c',
    marginBottom: '4px',
    padding: '2px 0',
  },
  contactListName: {
    fontWeight: 500,
    color: '#1a237e',
  },
  contactListButton: {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  contactPanelOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0,0,0,0.25)',
    zIndex: 3000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  contactPanel: {
    background: 'rgba(255,255,255,0.97)',
    width: '400px',
    height: '100vh',
    padding: '36px 32px 28px 32px',
    boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
    fontFamily: 'Georgia, serif',
    position: 'relative',
    overflowY: 'auto',
  },
  closeContactPanelButton: {
    position: 'absolute',
    top: '12px',
    right: '18px',
    background: 'none',
    border: 'none',
    fontSize: '2rem',
    color: '#222',
    cursor: 'pointer',
    zIndex: 10,
  },
  contactPanelTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    margin: '0 0 18px 0',
    color: '#222',
  },
  contactsLoading: {
    color: '#888',
    fontStyle: 'italic',
    fontSize: '1rem',
  },
  contactsEmpty: {
    color: '#888',
    fontStyle: 'italic',
    fontSize: '1rem',
  },
  contactsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  contactButton: {
    background: 'rgba(0,0,0,0.05)',
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: '8px',
    padding: '12px 16px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
  },
  contactButtonName: {
    fontSize: '1rem',
    fontWeight: 500,
    color: '#222',
    marginBottom: '4px',
  },
  contactButtonCompany: {
    fontSize: '0.9rem',
    color: '#666',
    fontStyle: 'italic',
  },
  contactModalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0,0,0,0.25)',
    zIndex: 4000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactModal: {
    background: 'rgba(255,255,255,0.97)',
    borderRadius: '16px',
    padding: '36px 32px 28px 32px',
    minWidth: '350px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    fontFamily: 'Georgia, serif',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  closeContactModalButton: {
    position: 'absolute',
    top: '12px',
    right: '18px',
    background: 'none',
    border: 'none',
    fontSize: '2rem',
    color: '#222',
    cursor: 'pointer',
    zIndex: 10,
  },
  contactModalTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    margin: '0 0 18px 0',
    color: '#222',
  },
  contactModalField: {
    fontSize: '1.1rem',
    color: '#2c2c2c',
    marginBottom: '6px',
  },
  activitiesSection: {
    marginTop: '18px',
    paddingTop: '12px',
    borderTop: '1px solid #eee',
  },
  activitiesTitle: {
    fontWeight: 600,
    fontSize: '1.1rem',
    marginBottom: '8px',
    color: '#222',
  },
  activitiesLoading: {
    color: '#888',
    fontStyle: 'italic',
    fontSize: '1rem',
    marginBottom: '6px',
  },
  activitiesEmpty: {
    color: '#888',
    fontStyle: 'italic',
    fontSize: '1rem',
    marginBottom: '6px',
  },
  activitiesList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  activityItem: {
    fontSize: '1rem',
    color: '#2c2c2c',
    marginBottom: '4px',
    padding: '2px 0',
  },
  activityButton: {
    background: 'none',
    border: 'none',
    padding: '4px 8px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    borderRadius: '4px',
    outline: 'none',
    userSelect: 'none',
  },
  activityButtonHover: {
    backgroundColor: '#f8f9fa !important',
    transform: 'none !important',
    boxShadow: 'none !important',
    borderColor: 'transparent !important',
  },
  activityNotes: {
    fontWeight: 500,
    color: '#1a237e',
  },
  activityContact: {
    fontWeight: 600,
    color: '#333',
    fontSize: '1rem',
    marginBottom: '2px',
  },
  activityTimestamp: {
    fontSize: '0.9rem',
    color: '#666',
    fontStyle: 'italic',
  },
  contactActivitiesSection: {
    marginTop: '18px',
    paddingTop: '12px',
    borderTop: '1px solid #eee',
  },
  contactActivitiesTitle: {
    fontWeight: 600,
    fontSize: '1.1rem',
    marginBottom: '8px',
    color: '#222',
  },
  contactActivitiesLoading: {
    color: '#888',
    fontStyle: 'italic',
    fontSize: '1rem',
    marginBottom: '6px',
  },
  contactActivitiesEmpty: {
    color: '#888',
    fontStyle: 'italic',
    fontSize: '1rem',
    marginBottom: '6px',
  },
  contactActivitiesList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  contactActivityItem: {
    fontSize: '1rem',
    color: '#2c2c2c',
    marginBottom: '4px',
    padding: '2px 0',
  },
  contactActivityType: {
    fontWeight: 500,
    color: '#1a237e',
  },
  contactActivityNotes: {
    fontWeight: 500,
    color: '#1a237e',
  },
  contactActivityTimestamp: {
    fontSize: '0.9rem',
    color: '#666',
    fontStyle: 'italic',
  },
};

export default Listings; 