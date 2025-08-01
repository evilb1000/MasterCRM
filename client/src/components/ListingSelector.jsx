import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ENDPOINTS } from '../config';

const ListingSelector = ({ open, onClose, onSelect, loading }) => {
  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      fetchListings();
    }
  }, [open]);

  const fetchListings = async () => {
    setLoadingListings(true);
    setError('');
    
    try {
      const response = await axios.get(ENDPOINTS.GET_LISTINGS);
      
      if (response.data.success) {
        console.log('Fetched listings:', response.data.listings);
        setListings(response.data.listings);
      } else {
        setError('Failed to load listings');
      }
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Failed to load listings. Please try again.');
    } finally {
      setLoadingListings(false);
    }
  };

  const handleSelectListing = (listing) => {
    onSelect(listing);
    onClose();
  };

  if (!open) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Select a Listing</h2>
        <p style={styles.subtitle}>Choose which listing to connect your contact list to:</p>
        
        {loadingListings && (
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <span>Loading listings...</span>
          </div>
        )}
        
        {error && (
          <div style={styles.error}>{error}</div>
        )}
        
        {!loadingListings && !error && (
          <div style={styles.listingsContainer}>
            {listings.length === 0 ? (
              <div style={styles.noListings}>
                No listings found. Please create a listing first.
              </div>
            ) : (
              listings.map((listing) => (
                <div
                  key={listing.id}
                  style={styles.listingItem}
                  onClick={() => handleSelectListing(listing)}
                >
                  <div style={styles.listingName}>
                    {(() => {
                      console.log('Listing data:', listing);
                      if (listing.name && listing.name.trim()) {
                        return listing.name;
                      } else if (listing.address && listing.address.trim()) {
                        return listing.address;
                      } else if (listing.streetAddress && listing.streetAddress.trim()) {
                        return listing.streetAddress;
                      } else if (listing.title && listing.title.trim()) {
                        return listing.title;
                      } else {
                        return `Listing ${listing.id.slice(-6)}`;
                      }
                    })()}
                  </div>
                  <div style={styles.listingDetails}>
                    {listing.address && listing.address !== (listing.name || listing.streetAddress) && (
                      <span style={styles.listingAddress}>{listing.address}</span>
                    )}
                    {listing.price && (
                      <span style={styles.listingPrice}>${listing.price}</span>
                    )}
                    {listing.bedrooms && listing.bathrooms && (
                      <span style={styles.listingDetails}>{listing.bedrooms} bed, {listing.bathrooms} bath</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        
        <div style={styles.actions}>
          <button 
            onClick={onClose} 
            style={styles.cancelButton} 
            disabled={loading}
          >
            Cancel
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
    zIndex: 2001,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '16px',
    padding: '32px',
    minWidth: '400px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    fontFamily: 'Georgia, serif',
    position: 'relative',
  },
  title: {
    fontSize: '1.7rem',
    marginBottom: '8px',
    fontWeight: 500,
    color: '#222',
  },
  subtitle: {
    fontSize: '1rem',
    marginBottom: '24px',
    color: '#666',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '40px',
    color: '#666',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid #f3f3f3',
    borderTop: '2px solid #333',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  error: {
    color: '#b71c1c',
    background: '#ffebee',
    borderRadius: '6px',
    padding: '12px',
    margin: '16px 0',
    fontSize: '1rem',
  },
  listingsContainer: {
    maxHeight: '400px',
    overflowY: 'auto',
    marginBottom: '24px',
  },
  noListings: {
    textAlign: 'center',
    color: '#888',
    fontStyle: 'italic',
    padding: '40px',
  },
  listingItem: {
    padding: '16px',
    border: '1px solid #eee',
    borderRadius: '8px',
    marginBottom: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: '#fff',
  },
  listingItemHover: {
    borderColor: '#333',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  listingName: {
    fontSize: '1.1rem',
    fontWeight: 500,
    color: '#222',
    marginBottom: '4px',
  },
  listingDetails: {
    display: 'flex',
    gap: '16px',
    fontSize: '0.9rem',
    color: '#666',
  },
  listingAddress: {
    flex: 1,
  },
  listingPrice: {
    fontWeight: 500,
    color: '#2e7d32',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
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
};

export default ListingSelector; 