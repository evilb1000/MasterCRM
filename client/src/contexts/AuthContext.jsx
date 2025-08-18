import React, { createContext, useContext, useEffect, useState } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, GoogleAuthProvider } from '../firebase';

const AuthContext = createContext();

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
};

export const AuthProvider = ({ children }) => {
	const [currentUser, setCurrentUser] = useState(null);
	const [authState, setAuthState] = useState('signedOut'); // signedOut, signedInPendingCheck, signedInApproved, signedInRejected
	const [loading, setLoading] = useState(true);

	const isUserAuthorized = (email) => {
		console.log('Checking authorization for email:', email);
		const isAuthorized = email === 'benatwood1983@gmail.com' || email.endsWith('@michaelellares.com');
		console.log('Authorization result:', isAuthorized);
		return isAuthorized;
	};

	const signInWithGoogle = async () => {
		console.log('Starting Google sign-in...');
		if (!auth) {
			console.error('Auth not available for sign-in');
			throw new Error('Authentication not available. Please check your Firebase configuration.');
		}
		try {
			console.log('Setting auth state to pending...');
			setAuthState('signedInPendingCheck');
			const provider = new GoogleAuthProvider();
			console.log('Calling signInWithPopup...');
			const result = await signInWithPopup(auth, provider);
			console.log('Sign-in successful, user:', result.user.email);
			
			// Check authorization immediately
			if (isUserAuthorized(result.user.email)) {
				console.log('User authorized, setting approved state');
				setAuthState('signedInApproved');
				setCurrentUser(result.user);
			} else {
				console.log('User NOT authorized, signing out');
				// User not authorized - sign them out immediately
				await signOut(auth);
				setAuthState('signedInRejected');
				setCurrentUser(null);
				throw new Error('Email not authorized for this application');
			}
		} catch (error) {
			console.error('Sign in error:', error);
			setAuthState('signedOut');
			setCurrentUser(null);
			throw error;
		}
	};

	const signOutUser = async () => {
		if (!auth) {
			console.error('Auth not available for sign out');
			return;
		}
		try {
			await signOut(auth);
			setAuthState('signedOut');
			setCurrentUser(null);
		} catch (error) {
			console.error('Sign out error:', error);
		}
	};

	// Auth state listener
	useEffect(() => {
		console.log('Setting up auth state listener...');
		if (!auth) {
			console.error('Auth not available for state listener');
			setLoading(false);
			return;
		}

		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			console.log('Auth state changed:', user ? user.email : 'NO USER');
			if (user) {
				// User is signed in - check authorization
				if (isUserAuthorized(user.email)) {
					console.log('User authorized in state listener');
					setCurrentUser(user);
					console.log('Setting authState to signedInApproved');
					setAuthState('signedInApproved');
				} else {
					console.log('User NOT authorized in state listener, signing out');
					// User not authorized - sign them out
					await signOut(auth);
					setAuthState('signedInRejected');
					setCurrentUser(null);
				}
			} else {
				// User is signed out
				console.log('User signed out in state listener');
				setCurrentUser(null);
				setAuthState('signedOut');
			}
			setLoading(false);
		});

		return unsubscribe;
	}, []);

	// Debug effect to log auth state changes
	useEffect(() => {
		console.log('AuthContext: authState changed to:', authState);
	}, [authState]);

	// Debug effect to log current user changes
	useEffect(() => {
		console.log('AuthContext: currentUser changed to:', currentUser ? currentUser.email : 'NO USER');
	}, [currentUser]);

	const value = { currentUser, authState, loading, signInWithGoogle, signOutUser, isUserAuthorized };

	return (
		<AuthContext.Provider value={value}>
			{children}
		</AuthContext.Provider>
	);
};
