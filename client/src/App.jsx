import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import ChatBox from './components/ChatBox';
import Contacts from './pages/Contacts';
import Listings from './pages/Listings';
import ShowListsModal from './components/ShowListsModal';
import ContactModal from './components/ContactModal';

const HomePage = () => {
  const navigate = useNavigate();
  const [showListsModal, setShowListsModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showContactDetail, setShowContactDetail] = useState(false);

  const handleShowContactDetail = (contact) => {
    setSelectedContact(contact);
    setShowContactDetail(true);
  };

  return (
    <div style={styles.app}>
      <div style={styles.container}>
        {/* AI Assistant Label */}
        <h1 style={styles.title}>How Can I Help</h1>
        
        {/* Chat Box */}
        <div style={styles.chatContainer}>
          <ChatBox onShowLists={() => setShowListsModal(true)} />
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
  button:hover {
    background-color: rgba(0, 0, 0, 0.9) !important;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
    border-color: rgba(255, 255, 255, 0.4);
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