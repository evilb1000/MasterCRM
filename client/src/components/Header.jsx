import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
	const { currentUser, signOutUser } = useAuth();
	const [open, setOpen] = useState(false);
	if (!currentUser) return null;
	return (
		<header style={styles.header}>
			<div style={styles.container}>
				<h1 style={styles.title}>LOD CRM</h1>
				<div style={styles.user} onClick={() => setOpen(!open)}>
					<div style={styles.avatar}>{(currentUser.email || '?').slice(0,2).toUpperCase()}</div>
					<span style={styles.email}>{currentUser.email}</span>
					{open && (
						<div style={styles.menu}>
							<div style={styles.menuRow}>Signed in as<br/>{currentUser.email}</div>
							<button style={styles.signOut} onClick={signOutUser}>Sign Out</button>
						</div>
					)}
				</div>
			</div>
		</header>
	);
};

const styles = {
	header: { backgroundColor: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.3)', position: 'sticky', top: 0, zIndex: 1000 },
	container: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', maxWidth: 1200, margin: '0 auto' },
	title: { fontSize: '1.6rem', fontWeight: 300, color: '#2c2c2c', margin: 0 },
	user: { display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', position: 'relative' },
	avatar: { width: 28, height: 28, borderRadius: '50%', background: '#222', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 },
	email: { fontSize: 13, color: '#2c2c2c' },
	menu: { position: 'absolute', right: 0, top: '100%', marginTop: 8, background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: 12, minWidth: 240, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' },
	menuRow: { fontSize: 12, color: '#333', marginBottom: 10 },
	signOut: { width: '100%', background: '#dc3545', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }
};

export default Header;
