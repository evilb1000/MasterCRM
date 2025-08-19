import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { gmailService } from '../services/gmailService';

const EmailsList = ({ emails, onSelect }) => {
  if (!emails || emails.length === 0) {
    return <div style={styles.empty}>No emails loaded. Click the Emails button to fetch.</div>;
  }
  return (
    <ul style={styles.list}>
      {emails.map((email) => (
        <li key={email.id} style={styles.listItem}>
          <button
            style={styles.itemButton}
            onClick={() => onSelect(email.id)}
          >
            {`Date: ${email.displayTime || ''}, From: ${email.from || ''}, Subject: ${email.subject || '(No Subject)'}`}
          </button>
        </li>
      ))}
    </ul>
  );
};

const EmailDetail = ({ selected, loading, error, onReply, replyState, onReplyTextChange, onSendReply, onCancelReply }) => {
  if (loading) return <div style={styles.loading}>Loading email…</div>;
  if (error) return <div style={styles.error}>{error}</div>;
  if (!selected) return null;

  return (
    <div style={styles.detailContainer}>
      <div style={styles.detailHeader}>
        <div style={styles.detailSubject}>{selected.subject || '(No Subject)'}</div>
        <div style={styles.detailMeta}>
          <span>{selected.from || ''}</span>
          {selected.date && <span> • {selected.date}</span>}
        </div>
      </div>
      <pre style={styles.detailBody}>{selected.body || selected.snippet || ''}</pre>
      
      {/* Action Buttons Section */}
      <div style={styles.actionSection}>
        {!replyState.isReplying ? (
          <div style={styles.actionButtons}>
            <button 
              style={styles.replyButton} 
              onClick={() => onReply(selected)}
            >
              Reply
            </button>
          </div>
        ) : (
          <div style={styles.replyForm}>
            <textarea
              style={styles.replyTextarea}
              placeholder="Type your reply..."
              value={replyState.replyText}
              onChange={(e) => onReplyTextChange(e.target.value)}
              rows={4}
            />
            <div style={styles.replyActions}>
              <button 
                style={styles.sendButton}
                onClick={() => onSendReply(selected, replyState.replyText)}
                disabled={replyState.sending}
              >
                {replyState.sending ? 'Sending...' : 'Send'}
              </button>
              <button 
                style={styles.cancelButton}
                onClick={onCancelReply}
                disabled={replyState.sending}
              >
                Cancel
              </button>
            </div>
            {replyState.error && (
              <div style={styles.replyError}>{replyState.error}</div>
            )}
            {replyState.success && (
              <div style={styles.replySuccess}>{replyState.success}</div>
            )}
          </div>
        )}
        

      </div>
    </div>
  );
};

const EmailsModal = ({ open, onClose, emails, onEmailDeleted }) => {
  const { gmailAccessToken, checkGmailTokenScopes, forceReAuth, forceReAuthForGmail } = useAuth();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [replyState, setReplyState] = useState({
    isReplying: false,
    replyText: '',
    sending: false,
    error: '',
    success: ''
  });
  const [deleteState, setDeleteState] = useState({
    isDeleting: false,
    error: '',
    success: '',
    showReAuthButton: false
  });

  const isOpen = !!open;

  // Check Gmail scopes when modal opens
  useEffect(() => {
    if (isOpen && gmailAccessToken) {
      console.log('🔍 [EMAILS MODAL] Checking Gmail scopes on modal open...');
      checkGmailTokenScopes().then(hasRightScopes => {
        if (!hasRightScopes) {
          console.log('⚠️ [EMAILS MODAL] Gmail token missing required scopes');
          setError('Gmail access needs to be updated. Click "Re-authenticate Gmail Access" below to enable full functionality.');
        } else {
          console.log('✅ [EMAILS MODAL] Gmail token has correct scopes');
          setError(''); // Clear any previous errors
        }
      }).catch(scopeError => {
        console.warn('⚠️ [EMAILS MODAL] Could not check Gmail scopes:', scopeError.message);
        setError('Could not verify Gmail permissions. Please re-authenticate to ensure full access.');
      });
    }
  }, [isOpen, gmailAccessToken, checkGmailTokenScopes]);

  const decodeBase64Url = (data) => {
    try {
      const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(b64);
      try {
        return decodeURIComponent(escape(decoded));
      } catch {
        return decoded;
      }
    } catch {
      return '';
    }
  };

  const extractText = (payload) => {
    if (!payload) return '';
    const { body, mimeType, parts } = payload;
    if (mimeType === 'text/plain' && body?.data) return decodeBase64Url(body.data);
    if (parts && parts.length) {
      // Prefer text/plain, fallback to text/html
      const plain = parts.find(p => p.mimeType === 'text/plain');
      if (plain?.body?.data) return decodeBase64Url(plain.body.data);
      const html = parts.find(p => p.mimeType === 'text/html');
      if (html?.body?.data) return decodeBase64Url(html.body.data);
      // Recurse deeper
      for (const p of parts) {
        const inner = extractText(p);
        if (inner) return inner;
      }
    }
    if (body?.data) return decodeBase64Url(body.data);
    return '';
  };

  const onSelectEmail = async (id) => {
    if (!gmailAccessToken) {
      setError('Missing Gmail access. Please re-auth.');
      return;
    }
    setLoading(true);
    setError('');
    setDetail(null);
    // Reset reply state when selecting a new email
    setReplyState({
      isReplying: false,
      replyText: '',
      sending: false,
      error: '',
      success: ''
    });
    try {
      const resp = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, {
        headers: { Authorization: `Bearer ${gmailAccessToken}` },
      });
      const json = await resp.json();
      if (json.error) throw new Error(json.error.message || 'Failed to load email');
      const headers = Object.fromEntries((json.payload?.headers || []).map(h => [h.name, h.value]));
      const bodyText = extractText(json.payload);
      setDetail({
        id,
        subject: headers.Subject || '',
        from: headers.From || '',
        date: headers.Date || '',
        snippet: json.snippet || '',
        body: bodyText,
        threadId: json.threadId,
        messageId: headers['Message-ID'] || headers['Message-Id'] || headers['message-id']
      });
    } catch (e) {
      setError(e?.message || 'Failed to load email');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = (email) => {
    setReplyState(prev => ({
      ...prev,
      isReplying: true,
      replyText: '',
      error: '',
      success: ''
    }));
  };

  const handleReplyTextChange = (text) => {
    setReplyState(prev => ({
      ...prev,
      replyText: text
    }));
  };

  const handleCancelReply = () => {
    setReplyState(prev => ({
      ...prev,
      isReplying: false,
      replyText: '',
      error: '',
      success: ''
    }));
  };

  const handleSendReply = async (email, replyText) => {
    if (!gmailAccessToken) {
      setReplyState(prev => ({
        ...prev,
        error: 'Missing Gmail access. Please re-auth.'
      }));
      return;
    }

    if (!replyText.trim()) {
      setReplyState(prev => ({
        ...prev,
        error: 'Please enter a reply message.'
      }));
      return;
    }

    setReplyState(prev => ({
      ...prev,
      sending: true,
      error: '',
      success: ''
    }));

    try {
      await gmailService.sendReply(gmailAccessToken, email, replyText);
      
      setReplyState(prev => ({
        ...prev,
        sending: false,
        success: 'Reply sent successfully!',
        isReplying: false,
        replyText: ''
      }));

      // Clear success message after 3 seconds
      setTimeout(() => {
        setReplyState(prev => ({
          ...prev,
          success: ''
        }));
      }, 3000);

    } catch (error) {
      setReplyState(prev => ({
        ...prev,
        sending: false,
        error: error.message || 'Failed to send reply'
      }));
    }
  };

  const handleDelete = async (email) => {
    if (!gmailAccessToken) {
      setDeleteState(prev => ({
        ...prev,
        error: 'Missing Gmail access. Please re-auth.'
      }));
      return;
    }

    // Check if token has the right scopes
    const hasRightScopes = await checkGmailTokenScopes();
    if (!hasRightScopes) {
      setDeleteState(prev => ({
        ...prev,
        error: 'Gmail permissions need to be updated. Click here to re-authenticate.',
        showReAuthButton: true
      }));
      return;
    }

    if (!email || !email.id) {
      setDeleteState(prev => ({
        ...prev,
        error: 'Invalid email to delete.'
      }));
      return;
    }

    setDeleteState(prev => ({
      ...prev,
      isDeleting: true,
      error: '',
      success: '',
      showReAuthButton: false
    }));

    try {
      await gmailService.deleteMessage(gmailAccessToken, email.id);
      
      setDeleteState(prev => ({
        ...prev,
        isDeleting: false,
        success: 'Email deleted successfully!'
      }));

      // Clear success message and close detail view after 1.5 seconds
      setTimeout(() => {
        setDeleteState(prev => ({
          ...prev,
          success: ''
        }));
        setDetail(null); // Close the detail view
        
        // Notify parent component to remove the email from the list
        if (onEmailDeleted && email.id) {
          onEmailDeleted(email.id);
        }
      }, 1500);

    } catch (error) {
      setDeleteState(prev => ({
        ...prev,
        isDeleting: false,
        error: error.message || 'Failed to delete email'
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <button style={styles.closeButton} onClick={onClose} aria-label="Close">×</button>
        <h2 style={styles.title}>Emails</h2>
        <EmailsList emails={emails} onSelect={onSelectEmail} />
        
        {/* Main Error Display with Re-auth Button */}
        {error && (
          <div style={styles.mainError}>
            <div style={styles.errorMessage}>{error}</div>
            <button 
              style={styles.reAuthButton}
              onClick={forceReAuthForGmail}
            >
              Re-authenticate Gmail Access
            </button>
          </div>
        )}
        
        <EmailDetail 
          selected={detail} 
          loading={loading} 
          error={error}
          onReply={handleReply}
          replyState={replyState}
          onReplyTextChange={handleReplyTextChange}
          onSendReply={handleSendReply}
          onCancelReply={handleCancelReply}
        />
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    background: 'rgba(30,30,40,0.18)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  modal: {
    background: '#f8f6f1', borderRadius: 18, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    padding: '36px 32px 28px 32px', minWidth: 380, maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto',
    position: 'relative', fontFamily: 'Georgia, serif', display: 'flex', flexDirection: 'column', gap: 12
  },
  closeButton: {
    position: 'absolute', top: 14, right: 20, background: '#222', color: '#fff', border: 'none',
    width: 36, height: 36, borderRadius: '50%', fontSize: '1.7rem', cursor: 'pointer', lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.10)'
  },
  title: { fontSize: '1.45rem', fontWeight: 700, margin: '0 0 10px 0', color: '#23233a' },
  list: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 },
  listItem: { display: 'flex' },
  itemButton: {
    background: '#222', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px',
    fontSize: '1rem', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
  },
  loading: { color: '#888', fontStyle: 'italic' },
  error: { color: '#d32f2f', background: '#ffebee', borderRadius: 8, padding: 12 },
  empty: { color: '#888', fontStyle: 'italic' },
  detailContainer: {
    background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: 16, marginTop: 12
  },
  detailHeader: { marginBottom: 8 },
  detailSubject: { fontWeight: 700, fontSize: '1.1rem', color: '#2c2c2c' },
  detailMeta: { color: '#666', fontSize: '0.9rem' },
  detailBody: { whiteSpace: 'pre-wrap', color: '#2c2c2c', fontFamily: 'Georgia, serif', margin: 0 },
  actionSection: { marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.1)' },
  actionButtons: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  replyButton: {
    background: '#1976d2', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px',
    fontSize: '0.9rem', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  replyForm: { display: 'flex', flexDirection: 'column', gap: 12 },
  replyTextarea: {
    border: '1px solid rgba(0,0,0,0.2)', borderRadius: 8, padding: 12, fontSize: '0.9rem',
    fontFamily: 'Georgia, serif', resize: 'vertical', minHeight: 80
  },
  replyActions: { display: 'flex', gap: 8 },
  sendButton: {
    background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px',
    fontSize: '0.9rem', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  cancelButton: {
    background: '#757575', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px',
    fontSize: '0.9rem', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  replyError: { color: '#d32f2f', background: '#ffebee', borderRadius: 6, padding: 8, fontSize: '0.85rem' },
  replySuccess: { color: '#2e7d32', background: '#e8f5e8', borderRadius: 6, padding: 8, fontSize: '0.85rem' },
  deleteButton: {
    background: '#d32f2f', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px',
    fontSize: '0.9rem', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  deleteError: { color: '#d32f2f', background: '#ffebee', borderRadius: 6, padding: 8, fontSize: '0.85rem', marginTop: 8 },
  deleteSuccess: { color: '#2e7d32', background: '#e8f5e8', borderRadius: 6, padding: 8, fontSize: '0.85rem', marginTop: 8 },
  reAuthButton: {
    background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px',
    fontSize: '0.8rem', cursor: 'pointer', marginTop: 8, display: 'block', width: '100%'
  },
  errorMessage: {
    marginBottom: 8,
    lineHeight: 1.4
  },
  mainError: {
    color: '#d32f2f', 
    background: '#ffebee', 
    borderRadius: 8, 
    padding: 16,
    border: '1px solid rgba(220, 53, 69, 0.2)',
    marginBottom: 16
  }
};

export default EmailsModal;


