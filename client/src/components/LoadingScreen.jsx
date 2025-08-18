import React from 'react';

const LoadingScreen = () => (
	<div style={styles.container}>
		<div style={styles.loadingCard}>
			<div style={styles.spinner}></div>
			<h2 style={styles.title}>Loading...</h2>
			<p style={styles.subtitle}>Please wait while we verify your access</p>
		</div>
	</div>
);

const styles = {
	container: { minHeight: '100vh', backgroundColor: '#f8f6f1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Georgia, serif' },
	loadingCard: { backgroundColor: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', padding: 40, maxWidth: 350, width: '100%', textAlign: 'center' },
	spinner: { width: 60, height: 60, border: '4px solid rgba(0,0,0,0.1)', borderTop: '4px solid #2c2c2c', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' },
	title: { fontSize: '1.8rem', fontWeight: 300, color: '#2c2c2c', margin: '0 0 12px 0' },
	subtitle: { fontSize: '1rem', color: '#666', margin: 0, fontWeight: 300 }
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}`;
document.head.appendChild(styleSheet);

export default LoadingScreen;
