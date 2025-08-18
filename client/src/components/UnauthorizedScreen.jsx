import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const UnauthorizedScreen = () => {
	const { signOutUser } = useAuth();
	return (
		<div style={styles.container}>
			<div style={styles.card}>
				<h1 style={styles.title}>Access Denied</h1>
				<p style={styles.message}>Your email address is not authorized to access this application.</p>
				<button onClick={signOutUser} style={styles.signOutButton}>Sign Out</button>
			</div>
		</div>
	);
};

const styles = {
	container: { minHeight: '100vh', backgroundColor: '#f8f6f1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Georgia, serif' },
	card: { backgroundColor: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', padding: 40, maxWidth: 450, width: '100%', textAlign: 'center' },
	title: { fontSize: '2.5rem', fontWeight: 300, color: '#dc3545', margin: '0 0 16px 0', letterSpacing: 1 },
	message: { fontSize: '1.2rem', color: '#333', margin: '0 0 24px 0' },
	signOutButton: { backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 28px', fontSize: '1.1rem', fontWeight: 500, cursor: 'pointer' }
};

export default UnauthorizedScreen;
