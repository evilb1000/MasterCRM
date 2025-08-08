import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import ChatBox from './components/ChatBox';
import Contacts from './pages/Contacts';
import Listings from './pages/Listings';
import Prospects from './pages/Prospects';
import Tasks from './pages/Tasks';
import ShowListsModal from './components/ShowListsModal';
import ContactModal from './components/ContactModal';
import ContactsFilterModal from './components/ContactsFilterModal';

const HomePage = () => {
  const navigate = useNavigate();
  const [showListsModal, setShowListsModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showContactDetail, setShowContactDetail] = useState(false);
  const [showContactsFilterModal, setShowContactsFilterModal] = useState(false);
  const [filterSearchCriteria, setFilterSearchCriteria] = useState('');

  const handleShowContactDetail = (contact) => {
    setSelectedContact(contact);
    setShowContactDetail(true);
  };

  const handleShowContact = async (contactName) => {
    try {
      // Search for contacts by name (first name, last name, or full name)
      const contactsRef = collection(db, 'contacts');
      const snapshot = await getDocs(contactsRef);
      
      const contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Find matching contact (case-insensitive search)
      const searchName = contactName.toLowerCase();
      const matchingContact = contacts.find(contact => {
        const firstName = (contact.firstName || '').toLowerCase();
        const lastName = (contact.lastName || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        
        return firstName.includes(searchName) || 
               lastName.includes(searchName) || 
               fullName.includes(searchName);
      });
      
      if (matchingContact) {
        setSelectedContact(matchingContact);
        setShowContactDetail(true);
      } else {
        // If no contact found, show an alert or handle gracefully
        alert(`Contact "${contactName}" not found.`);
      }
    } catch (error) {
      console.error('Error searching for contact:', error);
      alert('Error searching for contact. Please try again.');
    }
  };

  const handleShowContactsWith = (searchCriteria, searchField = null, filterCriteria = null) => {
    // Handle both old format (string) and new format (contacts array)
    if (typeof searchCriteria === 'string') {
      // Old format - just the search criteria string
      setFilterSearchCriteria(searchCriteria);
      setShowContactsFilterModal(true);
    } else if (Array.isArray(searchCriteria)) {
      // New format - contacts array from AI response
      setFilterSearchCriteria(filterCriteria || 'Unknown criteria');
      setShowContactsFilterModal(true);
    }
  };

  return (
    <div style={styles.app}>
      <div style={styles.container}>
        {/* AI Assistant Label */}
        <h1 style={styles.title}>How Can I Help</h1>
        
        {/* Chat Box */}
        <div style={styles.chatContainer}>
          <ChatBox 
            onShowLists={() => setShowListsModal(true)} 
            onShowContact={handleShowContact}
            onShowContactsWith={handleShowContactsWith}
            onShowContactDetail={handleShowContactDetail}
          />
        </div>
        
        {/* Navigation */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: 32 }}>
          <button
            style={{
              background: '#111',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '16px 32px',
              fontSize: 20,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              transition: 'background 0.2s',
            }}
            onClick={() => navigate('/contacts')}
          >
            Contacts
          </button>
          <button
            style={{
              background: '#111',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '16px 32px',
              fontSize: 20,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              transition: 'background 0.2s',
            }}
            onClick={() => navigate('/listings')}
          >
            Listings
          </button>
          <button
            style={{
              background: '#111',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '16px 32px',
              fontSize: 20,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              transition: 'background 0.2s',
            }}
            onClick={() => navigate('/prospects')}
          >
            Prospects
          </button>
          <button
            style={{
              background: '#111',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '16px 32px',
              fontSize: 20,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              transition: 'background 0.2s',
            }}
            onClick={() => navigate('/tasks')}
          >
            Tasks
          </button>
        </div>
      </div>
      
      {/* Show Lists Modal */}
      <ShowListsModal 
        open={showListsModal} 
        onClose={() => setShowListsModal(false)}
        onShowContactDetail={handleShowContactDetail}
        contactDetailOpen={showContactDetail}
      />
      
      {/* Contact Detail Modal */}
      {showContactDetail && selectedContact && (
        <ContactModal
          open={showContactDetail}
          onClose={() => {
            setShowContactDetail(false);
            setSelectedContact(null);
          }}
          contact={selectedContact}
          mode="view"
        />
      )}

      {/* Contacts Filter Modal */}
      <ContactsFilterModal
        open={showContactsFilterModal}
        onClose={() => setShowContactsFilterModal(false)}
        searchCriteria={filterSearchCriteria}
        onShowContactDetail={handleShowContactDetail}
        contactDetailOpen={showContactDetail}
      />
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/listings" element={<Listings />} />
        <Route path="/prospects" element={<Prospects />} />
        <Route path="/tasks" element={<Tasks />} />
      </Routes>
    </Router>
  );
};

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f8f6f1', // Soft creamy off-white
    fontFamily: 'Georgia, serif', // Soft, elegant font
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: '600px',
    width: '100%',
    position: 'relative',
    zIndex: 2,
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '300', // Light weight for soft appearance
    color: '#2c2c2c',
    marginBottom: '30px',
    textAlign: 'center',
    letterSpacing: '1px',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  chatContainer: {
    width: '100%',
    marginBottom: '30px',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    padding: '20px',
  },
  buttonContainer: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    width: '100%',
    maxWidth: '400px', // Match chat box width
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    padding: '20px',
  },
  button: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '15px 30px',
    fontSize: '1.1rem',
    fontWeight: '400',
    cursor: 'pointer',
    borderRadius: '12px',
    transition: 'all 0.3s ease',
    fontFamily: 'Georgia, serif',
    letterSpacing: '0.5px',
    minWidth: '120px',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  },
  linkButton: {
    textDecoration: 'none',
    display: 'inline-block',
  },
  nav: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    width: '100%',
    maxWidth: '400px', // Match chat box width
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    padding: '20px',
  },
};

// Add hover effects
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  button:hover:not(.activity-button):not(.contact-card-button) {
    background-color: rgba(0, 0, 0, 0.9) !important;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
    border-color: rgba(255, 255, 255, 0.4);
  }
  
  .activity-button:hover {
    background-color: #f8f9fa !important;
    transform: none !important;
    box-shadow: none !important;
    border-color: transparent !important;
  }
  
  .activity-button:focus {
    background-color: #f8f9fa !important;
    transform: none !important;
    box-shadow: none !important;
    border-color: transparent !important;
    outline: none !important;
  }
  
  button:active {
    transform: translateY(0);
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  }
  
  .chat-container {
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
  
  .button-container {
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
`;
document.head.appendChild(styleSheet);

export default App; 