import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginScreen = () => {
	const { signInWithGoogle, authState } = useAuth();
	const [isSigningIn, setIsSigningIn] = useState(false);
	const [error, setError] = useState('');
	const navigate = useNavigate();

	// If already signed in and approved, redirect away from /login
	useEffect(() => {
		console.log('LoginScreen: authState is', authState);
		if (authState === 'signedInApproved') {
			console.log('LoginScreen: user approved, redirecting to /');
			navigate('/', { replace: true });
		}
	}, [authState, navigate]);

	const handleGoogleSignIn = async () => {
		try {
			setIsSigningIn(true);
			setError('');
			await signInWithGoogle();
			// Navigation is handled by the authState effect above
		} catch (error) {
			console.error('Sign in error:', error);
			if (error.message.includes('popup')) {
				setError('Popup was blocked. Please allow popups for this site and try again.');
			} else if (error.message.includes('not authorized')) {
				setError('This email address is not authorized for this application.');
			} else {
				setError('Sign in failed. Please try again.');
			}
		} finally {
			setIsSigningIn(false);
		}
	};

	return (
		<div style={styles.container}>
			<div style={styles.loginCard}>
				<div style={styles.logo}>
					<h1 style={styles.title}>LOD CRM</h1>
					<p style={styles.subtitle}>Professional Contact Management</p>
				</div>
				<div style={styles.formContainer}>
					<button onClick={handleGoogleSignIn} disabled={isSigningIn} style={{ ...styles.googleButton, ...(isSigningIn && styles.googleButtonDisabled) }}>
						{isSigningIn ? (
							<div style={styles.loadingContainer}>
								<div style={styles.spinner}></div>
								<span>Signing in...</span>
							</div>
						) : (
							<>
								<svg style={styles.googleIcon} viewBox="0 0 24 24">
									<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
									<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
									<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
									<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
								</svg>
								Sign in with Google
							</>
						)}
					</button>
					{error && <div style={styles.errorMessage}>{error}</div>}
					<div style={styles.info}>
						<p style={styles.infoText}>Access restricted to authorized users only.</p>
					</div>
				</div>
			</div>
		</div>
	);
};

const styles = {
	container: { minHeight: '100vh', backgroundColor: '#f8f6f1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Georgia, serif' },
	loginCard: { backgroundColor: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center' },
	logo: { marginBottom: '40px' },
	title: { fontSize: '3rem', fontWeight: '300', color: '#2c2c2c', margin: '0 0 10px 0', letterSpacing: '2px', textShadow: '0 2px 4px rgba(0,0,0,0.1)' },
	subtitle: { fontSize: '1.1rem', color: '#666', margin: 0, fontWeight: '300' },
	formContainer: { display: 'flex', flexDirection: 'column', gap: '20px' },
	googleButton: { backgroundColor: '#fff', color: '#333', border: '2px solid #e0e0e0', borderRadius: '12px', padding: '16px 24px', fontSize: '1.1rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', transition: 'all 0.3s ease', fontFamily: 'Georgia, serif', minHeight: '56px' },
	googleButtonDisabled: { opacity: 0.7, cursor: 'not-allowed', transform: 'none' },
	googleIcon: { width: 24, height: 24 },
	loadingContainer: { display: 'flex', alignItems: 'center', gap: '12px' },
	spinner: { width: 20, height: 20, border: '2px solid #e0e0e0', borderTop: '2px solid #4285F4', borderRadius: '50%', animation: 'spin 1s linear infinite' },
	errorMessage: { backgroundColor: 'rgba(220, 53, 69, 0.1)', color: '#dc3545', padding: '12px 16px', borderRadius: 8, border: '1px solid rgba(220,53,69,0.2)', fontSize: '0.9rem' },
	info: { marginTop: 20, padding: 16, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 8 },
	infoText: { margin: 0, fontSize: '0.9rem', color: '#666', lineHeight: 1.4 }
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `@keyframes spin {0%{transform:rotate(0)}100%{transform:rotate(360deg)}}`;
document.head.appendChild(styleSheet);

export default LoginScreen;
