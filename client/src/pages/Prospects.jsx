import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const Prospects = () => {
  const navigate = useNavigate();
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSearch, setSelectedSearch] = useState(null);
  const [addressFilter, setAddressFilter] = useState('');
  const [websiteFilter, setWebsiteFilter] = useState('all'); // 'all', 'yes', 'no'
  const [showCreateContactModal, setShowCreateContactModal] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [selectedBusinessForTask, setSelectedBusinessForTask] = useState(null);

  useEffect(() => {
    fetchProspects();
  }, []);

  const fetchProspects = async () => {
    try {
      setLoading(true);
      const prospectsRef = collection(db, 'prospectSearches');
      const snapshot = await getDocs(prospectsRef);
      
      const prospectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by timestamp (newest first)
      prospectsData.sort((a, b) => {
        const aTime = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const bTime = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return bTime - aTime;
      });
      
      setProspects(prospectsData);
    } catch (err) {
      console.error('Error fetching prospects:', err);
      setError('Failed to load prospects');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getDaysUntilDeletion = (timestamp) => {
    if (!timestamp) return null;
    const createdDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const thirtyDaysLater = new Date(createdDate);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    
    const now = new Date();
    const timeDiff = thirtyDaysLater.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return daysRemaining;
  };

  const handleSearchClick = (search) => {
    setSelectedSearch(search);
  };

  const handleBackToList = () => {
    setSelectedSearch(null);
    setAddressFilter('');
    setWebsiteFilter('all');
  };

  const handleSaveAsContact = (business) => {
    setSelectedBusiness(business);
    setShowCreateContactModal(true);
  };

  const handleAddTask = (business) => {
    setSelectedBusinessForTask(business);
    setShowAddTaskModal(true);
  };

  const handleCreateContact = async (contactData) => {
    try {
      // Add contact to Firestore
      const contactRef = await addDoc(collection(db, 'contacts'), {
        ...contactData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Remove business from prospect search
      const updatedBusinesses = selectedSearch.businesses.filter(
        b => b.place_id !== selectedBusiness.place_id
      );

      // Update the prospect search document
      const prospectRef = doc(db, 'prospectSearches', selectedSearch.id);
      await updateDoc(prospectRef, {
        businesses: updatedBusinesses,
        businessesFound: updatedBusinesses.length,
        resultsCount: updatedBusinesses.length,
        updatedAt: serverTimestamp()
      });

      // Refresh the prospects data
      await fetchProspects();

      // Close modal and reset
      setShowCreateContactModal(false);
      setSelectedBusiness(null);

      alert('Contact created successfully!');
    } catch (error) {
      console.error('Error creating contact:', error);
      alert('Failed to create contact: ' + error.message);
    }
  };

  const getFilteredBusinesses = () => {
    if (!selectedSearch || !selectedSearch.businesses) return [];
    
    return selectedSearch.businesses.filter(business => {
      // Address filter
      if (addressFilter && !business.address?.toLowerCase().includes(addressFilter.toLowerCase())) {
        return false;
      }
      
      // Website filter
      if (websiteFilter === 'yes' && !business.website) {
        return false;
      }
      if (websiteFilter === 'no' && business.website) {
        return false;
      }
      
      return true;
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Prospects</h1>
      </div>
      
      {/* Fixed Home Button */}
      <button 
        onClick={() => navigate('/')} 
        style={styles.homeButton}
      >
        Home
      </button>

      {loading && (
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <span>Loading prospects...</span>
        </div>
      )}

      {error && (
        <div style={styles.error}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && !selectedSearch && (
        <div style={styles.content}>
          {prospects.length === 0 ? (
            <div style={styles.emptyState}>
              <h3>No Prospect Searches Yet</h3>
              <p>Use the AI chat to search for businesses and create prospects!</p>
              <p>Try: "Find financial services businesses in Mt. Lebanon"</p>
            </div>
          ) : (
            <div style={styles.searchesGrid}>
              {prospects.map((search) => (
                <div 
                  key={search.id} 
                  style={styles.searchCard}
                  className="searchCard"
                  onClick={() => handleSearchClick(search)}
                >
                  <div style={styles.searchHeader}>
                    <h3 style={styles.searchTitle}>
                      {search.businessCategory || 'Business Search'} around {search.location}
                    </h3>
                    <span style={styles.searchDate}>
                      {formatDate(search.timestamp)}
                    </span>
                  </div>
                  
                  <div style={styles.searchDetails}>
                    <p style={styles.searchDetailsP}>
                      <strong>Location:</strong> {search.location}
                    </p>
                    <p style={styles.searchDetailsP}>
                      <strong>Businesses Found:</strong> {search.businessesFound || search.resultsCount || 0}
                    </p>
                    {search.searchTerms && (
                      <p style={styles.searchDetailsP}>
                        <strong>Search Terms:</strong> {search.searchTerms.slice(0, 3).join(', ')}
                        {search.searchTerms.length > 3 && ` +${search.searchTerms.length - 3} more`}
                      </p>
                    )}
                  </div>
                  
                  <div style={styles.countdownContainer}>
                    {(() => {
                      const daysRemaining = getDaysUntilDeletion(search.timestamp);
                      if (daysRemaining !== null) {
                        if (daysRemaining <= 0) {
                          return <span style={styles.countdownExpired}>Expires today</span>;
                        } else if (daysRemaining === 1) {
                          return <span style={styles.countdownUrgent}>1 day til deletion</span>;
                        } else {
                          return <span style={styles.countdownNormal}>{daysRemaining} days til deletion</span>;
                        }
                      }
                      return null;
                    })()}
                  </div>
                  
                  <div style={styles.clickHint}>
                    Click to view businesses →
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && !error && selectedSearch && (
        <div style={styles.contentWithFilter}>
          <div style={styles.businessHeader}>
            <button 
              onClick={handleBackToList} 
              style={styles.backToListButton}
            >
              ← Back to Searches
            </button>
            <div style={styles.businessTitle}>
              <h2>{selectedSearch.businessCategory} in {selectedSearch.location}</h2>
              <span style={styles.businessSubtitle}>
                {formatDate(selectedSearch.timestamp)} • {selectedSearch.businessesFound || selectedSearch.resultsCount || 0} businesses found
              </span>
            </div>
          </div>

          {/* Filter Panel - only show when viewing business details */}
          <div style={styles.filterPanel}>
            <div style={styles.filterHeader}>
              <h3 style={styles.filterTitle}>Filters</h3>
              <button 
                onClick={() => {
                  setAddressFilter('');
                  setWebsiteFilter('all');
                }}
                style={styles.clearFiltersButton}
                disabled={!addressFilter && websiteFilter === 'all'}
              >
                Clear All
              </button>
            </div>
            <div style={styles.filterSection}>
              <label style={styles.filterLabel}>Address Contains</label>
              <input
                type="text"
                value={addressFilter}
                onChange={(e) => setAddressFilter(e.target.value)}
                placeholder="e.g., Mt. Lebanon, Greentree, 15228"
                style={styles.filterInput}
              />
            </div>
            <div style={styles.filterSection}>
              <label style={styles.filterLabel}>Website</label>
              <select
                value={websiteFilter}
                onChange={(e) => setWebsiteFilter(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="all">All businesses</option>
                <option value="yes">With website</option>
                <option value="no">Without website</option>
              </select>
            </div>
          </div>

          {(() => {
            const filteredBusinesses = getFilteredBusinesses();
            return filteredBusinesses.length > 0 ? (
              <div style={styles.businessesGrid}>
                {filteredBusinesses.map((business, index) => (
                <div key={business.place_id || index} style={styles.businessCard}>
                  <div style={styles.businessCardHeader}>
                    <h3 style={styles.businessName}>{business.name}</h3>
                    {business.rating && (
                      <span style={styles.businessRating}>⭐ {business.rating}</span>
                    )}
                  </div>
                  
                  <div style={styles.businessDetails}>
                    <p style={styles.businessAddress}>
                      📍 {business.address}
                    </p>
                    {business.phone && (
                      <p style={styles.businessPhone}>
                        📞 {business.phone}
                      </p>
                    )}
                    {business.website && (
                      <p style={styles.businessWebsite}>
                        🌐 <a 
                          href={business.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={styles.websiteLink}
                        >
                          Visit Website
                        </a>
                      </p>
                    )}
                    <p style={styles.businessSearchTerm}>
                      🔍 Found via: {business.search_term}
                    </p>
                  </div>
                  
                  <div style={styles.businessActions}>
                    <button 
                      onClick={() => handleSaveAsContact(business)}
                      style={styles.saveAsContactButton}
                    >
                      💼 Save as Contact
                    </button>
                    <button 
                      onClick={() => handleAddTask(business)}
                      style={styles.addTaskButton}
                    >
                      📋 Add Task
                    </button>
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <div style={styles.emptyState}>
                <h3>No Businesses Match Filter</h3>
                <p>Try adjusting your filter criteria or clear the filters.</p>
                {(addressFilter || websiteFilter !== 'all') && (
                  <button 
                    onClick={() => {
                      setAddressFilter('');
                      setWebsiteFilter('all');
                    }}
                    style={styles.clearFilterButton}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Create Contact Modal */}
      {showCreateContactModal && selectedBusiness && (
        <CreateContactModal
          business={selectedBusiness}
          onClose={() => {
            setShowCreateContactModal(false);
            setSelectedBusiness(null);
          }}
          onSave={handleCreateContact}
        />
      )}

      {/* Add Task Modal */}
      {showAddTaskModal && selectedBusinessForTask && (
        <AddTaskModal
          business={selectedBusinessForTask}
          onClose={() => {
            setShowAddTaskModal(false);
            setSelectedBusinessForTask(null);
          }}
        />
      )}

    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8f6f1',
    fontFamily: 'Georgia, serif',
    padding: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '30px',
    maxWidth: '1200px',
    margin: '0 auto 30px auto',
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
  title: {
    fontSize: '2.5rem',
    fontWeight: '300',
    color: '#2c2c2c',
    margin: 0,
    letterSpacing: '1px',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666',
    fontStyle: 'italic',
    fontSize: '18px',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '3px solid rgba(0, 0, 0, 0.1)',
    borderTop: '3px solid rgba(0, 0, 0, 0.8)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '12px',
  },
  error: {
    color: '#d32f2f',
    backgroundColor: 'rgba(255, 235, 238, 0.8)',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 205, 210, 0.6)',
    fontSize: '16px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  contentWithFilter: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(20px, 3vw, 30px)',
    minWidth: 0,
    marginLeft: 'clamp(280px, 22vw, 320px)', // Left margin for filter panel
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#666',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  },
  searchesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '20px',
  },
  searchCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  searchHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
    paddingBottom: '10px',
  },
  searchTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: '#2c2c2c',
  },
  searchDate: {
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic',
  },
  searchDetails: {
    marginBottom: '15px',
  },
  searchDetailsP: {
    margin: '8px 0',
    fontSize: '14px',
    color: '#2c2c2c',
  },
  countdownContainer: {
    marginBottom: '10px',
    textAlign: 'center',
  },
  countdownNormal: {
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic',
    padding: '6px 12px',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: '6px',
  },
  countdownUrgent: {
    fontSize: '14px',
    color: '#d32f2f',
    fontWeight: '600',
    padding: '6px 12px',
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    borderRadius: '6px',
  },
  countdownExpired: {
    fontSize: '14px',
    color: '#d32f2f',
    fontWeight: '600',
    padding: '6px 12px',
    backgroundColor: 'rgba(211, 47, 47, 0.15)',
    borderRadius: '6px',
  },
  clickHint: {
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: '8px',
  },
  businessHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '20px',
    marginBottom: '30px',
  },
  backToListButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '400',
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    fontFamily: 'Georgia, serif',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  },
  businessTitle: {
    flex: 1,
  },
  businessSubtitle: {
    fontSize: '16px',
    color: '#666',
    fontStyle: 'italic',
  },
  businessesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
  },
  businessCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  },
  businessCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
    paddingBottom: '10px',
  },
  businessName: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#2c2c2c',
    flex: 1,
  },
  businessRating: {
    fontSize: '14px',
    color: '#2c2c2c',
    fontWeight: '600',
  },
  businessDetails: {
    fontSize: '14px',
    color: '#2c2c2c',
  },
  businessAddress: {
    margin: '8px 0',
  },
  businessPhone: {
    margin: '8px 0',
  },
  businessWebsite: {
    margin: '8px 0',
  },
  websiteLink: {
    color: '#0066cc',
    textDecoration: 'none',
  },
  businessSearchTerm: {
    margin: '8px 0',
    fontSize: '12px',
    color: '#666',
    fontStyle: 'italic',
  },
  clearFilterButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '400',
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'all 0.3s ease',
    fontFamily: 'Georgia, serif',
    marginTop: '10px',
  },
  filterPanel: {
    position: 'fixed',
    top: 'clamp(120px, 15vh, 140px)',
    left: 'clamp(12px, 1.5vw, 20px)',
    width: 'clamp(220px, 18vw, 260px)',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    padding: 'clamp(16px, 2.5vw, 20px)',
    height: 'fit-content',
    zIndex: 100,
  },
  filterHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
  },
  filterTitle: {
    fontSize: '1.3rem',
    fontWeight: '400',
    color: '#2c2c2c',
    margin: '0',
    fontFamily: 'Georgia, serif',
  },
  clearFiltersButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '6px 12px',
    fontSize: '11px',
    fontWeight: '400',
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'all 0.3s ease',
    fontFamily: 'Georgia, serif',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    ':hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      transform: 'translateY(-1px)',
    },
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },
  filterSection: {
    marginBottom: '15px',
  },
  filterLabel: {
    display: 'block',
    fontSize: '0.9rem',
    color: '#666',
    fontWeight: '500',
    marginBottom: '5px',
    fontFamily: 'Georgia, serif',
  },
  filterInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#2c2c2c',
    fontSize: '0.9rem',
    fontFamily: 'Georgia, serif',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    outline: 'none',
    ':focus': {
      border: '1px solid rgba(0, 0, 0, 0.3)',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      boxShadow: '0 0 0 3px rgba(0, 0, 0, 0.1)',
    },
  },
  filterSelect: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#2c2c2c',
    fontSize: '0.9rem',
    fontFamily: 'Georgia, serif',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    outline: 'none',
    ':focus': {
      border: '1px solid rgba(0, 0, 0, 0.3)',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      boxShadow: '0 0 0 3px rgba(0, 0, 0, 0.1)',
    },
  },
  businessActions: {
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: '1px solid rgba(0, 0, 0, 0.1)',
  },
  saveAsContactButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '400',
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    fontFamily: 'Georgia, serif',
    width: '100%',
    marginBottom: '8px',
  },
  addTaskButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '400',
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    fontFamily: 'Georgia, serif',
    width: '100%',
  },
};

// Create Contact Modal Component
const CreateContactModal = ({ business, onClose, onSave }) => {
  const [contactData, setContactData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: business.name || '',
    address: business.address || '',
    phone: business.phone || '',
    linkedin: '',
    businessSector: '',
    notes: `Prospect from: ${business.search_term}\nWebsite: ${business.website || 'N/A'}`
  });

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

  const handleChange = (field, value) => {
    setContactData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!contactData.firstName || !contactData.lastName) {
      alert('First Name and Last Name are required');
      return;
    }
    onSave(contactData);
  };

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <button style={modalStyles.closeButton} onClick={onClose}>&times;</button>
        <h2 style={modalStyles.title}>Create Contact from Prospect</h2>
        
        <div style={modalStyles.content}>
          <div style={modalStyles.fieldRow}>
            <label style={modalStyles.label}>First Name *</label>
            <input
              type="text"
              value={contactData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              style={modalStyles.input}
              placeholder="Enter first name"
            />
          </div>

          <div style={modalStyles.fieldRow}>
            <label style={modalStyles.label}>Last Name *</label>
            <input
              type="text"
              value={contactData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              style={modalStyles.input}
              placeholder="Enter last name"
            />
          </div>

          <div style={modalStyles.fieldRow}>
            <label style={modalStyles.label}>Email</label>
            <input
              type="email"
              value={contactData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              style={modalStyles.input}
              placeholder="Enter email address"
            />
          </div>

          <div style={modalStyles.fieldRow}>
            <label style={modalStyles.label}>Company</label>
            <input
              type="text"
              value={contactData.company}
              onChange={(e) => handleChange('company', e.target.value)}
              style={modalStyles.input}
              placeholder="Company name"
            />
          </div>

          <div style={modalStyles.fieldRow}>
            <label style={modalStyles.label}>Address</label>
            <input
              type="text"
              value={contactData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              style={modalStyles.input}
              placeholder="Business address"
            />
          </div>

          <div style={modalStyles.fieldRow}>
            <label style={modalStyles.label}>Phone</label>
            <input
              type="text"
              value={contactData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              style={modalStyles.input}
              placeholder="Phone number"
            />
          </div>

          <div style={modalStyles.fieldRow}>
            <label style={modalStyles.label}>LinkedIn</label>
            <input
              type="text"
              value={contactData.linkedin}
              onChange={(e) => handleChange('linkedin', e.target.value)}
              style={modalStyles.input}
              placeholder="LinkedIn profile URL"
            />
          </div>

          <div style={modalStyles.fieldRow}>
            <label style={modalStyles.label}>Business Sector</label>
            <select
              value={contactData.businessSector}
              onChange={(e) => handleChange('businessSector', e.target.value)}
              style={modalStyles.input}
            >
              {SECTOR_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt || 'Select sector...'}</option>
              ))}
            </select>
          </div>

          <div style={modalStyles.fieldRow}>
            <label style={modalStyles.label}>Notes</label>
            <textarea
              value={contactData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              style={modalStyles.textarea}
              placeholder="Additional notes"
              rows={4}
            />
          </div>
        </div>

        <div style={modalStyles.actions}>
          <button style={modalStyles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button style={modalStyles.saveButton} onClick={handleSubmit}>
            Create Contact
          </button>
        </div>
      </div>
    </div>
  );
};

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  modal: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  },
  closeButton: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    padding: '4px',
    borderRadius: '4px',
    transition: 'all 0.2s ease',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '400',
    color: '#2c2c2c',
    margin: '0 0 20px 0',
    fontFamily: 'Georgia, serif',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  fieldRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.9rem',
    color: '#666',
    fontWeight: '500',
    fontFamily: 'Georgia, serif',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    fontSize: '1rem',
    fontFamily: 'Georgia, serif',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    transition: 'all 0.3s ease',
  },
  textarea: {
    padding: '10px 12px',
    border: '1px solid rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    fontSize: '1rem',
    fontFamily: 'Georgia, serif',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    resize: 'vertical',
    minHeight: '80px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(0, 0, 0, 0.1)',
  },
  cancelButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '400',
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    fontFamily: 'Georgia, serif',
  },
  saveButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '400',
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    fontFamily: 'Georgia, serif',
  },
};

// Add CSS for animations and hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  button:hover {
    background-color: rgba(0, 0, 0, 0.9) !important;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
  }
  
  button:active {
    transform: translateY(0);
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  }
  
  .searchCard:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
  
  .websiteLink:hover {
    text-decoration: underline;
  }
`;
document.head.appendChild(styleSheet);

const AddTaskModal = ({ business, onClose }) => {
  const [taskData, setTaskData] = useState({
    title: `Prospect ${business.name}`,
    description: `Website: ${business.website || 'N/A'}\nPhone: ${business.phone || 'N/A'}`,
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium',
    contactId: null,
    prospectId: selectedSearch?.id || null,
    prospectBusinessId: business.place_id || null
  });

  const handleSubmit = async () => {
    try {
      const taskDataToSave = {
        ...taskData,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'tasks'), taskDataToSave);
      alert('Task created successfully!');
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task: ' + error.message);
    }
  };

  const handleChange = (field, value) => {
    setTaskData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <button style={modalStyles.closeButton} onClick={onClose}>&times;</button>
        <h2 style={modalStyles.title}>Add Task for {business.name}</h2>
        
        <div style={modalStyles.content}>
          <div style={modalStyles.fieldRow}>
            <label style={modalStyles.label}>Task Title</label>
            <input
              type="text"
              value={taskData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              style={modalStyles.input}
            />
          </div>

          <div style={modalStyles.fieldRow}>
            <label style={modalStyles.label}>Description</label>
            <textarea
              value={taskData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              style={modalStyles.textarea}
              rows={4}
            />
          </div>

          <div style={modalStyles.fieldRow}>
            <label style={modalStyles.label}>Due Date</label>
            <input
              type="date"
              value={taskData.dueDate}
              onChange={(e) => handleChange('dueDate', e.target.value)}
              style={modalStyles.input}
            />
          </div>

          <div style={modalStyles.fieldRow}>
            <label style={modalStyles.label}>Priority</label>
            <select
              value={taskData.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
              style={modalStyles.input}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div style={modalStyles.actions}>
          <button
            onClick={onClose}
            style={modalStyles.cancelButton}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={modalStyles.saveButton}
          >
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
};

export default Prospects; 