// Gmail service for handling email operations

export const gmailService = {
  /**
   * Send a reply email using Gmail API
   * @param {string} accessToken - Gmail access token
   * @param {Object} originalEmail - The original email being replied to
   * @param {string} replyText - The reply message text
   * @returns {Promise<Object>} - Response from Gmail API
   */
  async sendReply(accessToken, originalEmail, replyText) {
    if (!accessToken) {
      throw new Error('Gmail access token is required');
    }

    if (!originalEmail || !originalEmail.id) {
      throw new Error('Original email is required');
    }

    if (!replyText || !replyText.trim()) {
      throw new Error('Reply text is required');
    }

    // Extract email addresses from the original email
    const fromEmail = this.extractEmailAddress(originalEmail.from);
    const toEmail = fromEmail; // Reply to the sender
    
    // Create email headers
    const subject = originalEmail.subject?.startsWith('Re:') 
      ? originalEmail.subject 
      : `Re: ${originalEmail.subject || '(No Subject)'}`;
    
    const messageId = originalEmail.messageId || `<${originalEmail.id}@gmail.com>`;
    const threadId = originalEmail.threadId;
    
    // Build email headers
    const headers = [
      `To: ${toEmail}`,
      `Subject: ${subject}`,
      `In-Reply-To: ${messageId}`,
      `References: ${messageId}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      replyText.trim()
    ].join('\r\n');

    // Encode the email in base64
    const encodedMessage = btoa(unescape(encodeURIComponent(headers)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Prepare the request body
    const requestBody = {
      raw: encodedMessage,
      threadId: threadId
    };

    try {
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Failed to send email: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error sending Gmail reply:', error);
      throw error;
    }
  },

  /**
   * Send a new email using Gmail API
   * @param {string} accessToken - Gmail access token
   * @param {string} toEmail - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} body - Email body content
   * @param {string} fromName - Optional sender name
   * @returns {Promise<Object>} - Response from Gmail API
   */
  async sendNewEmail(accessToken, toEmail, subject, body, fromName = '') {
    if (!accessToken) {
      throw new Error('Gmail access token is required');
    }

    if (!toEmail || !toEmail.trim()) {
      throw new Error('Recipient email is required');
    }

    if (!subject || !subject.trim()) {
      throw new Error('Email subject is required');
    }

    if (!body || !body.trim()) {
      throw new Error('Email body is required');
    }

    // Clean the recipient email
    const cleanToEmail = this.extractEmailAddress(toEmail);
    
    // Build email headers
    const headers = [
      `To: ${cleanToEmail}`,
      `Subject: ${subject.trim()}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      body.trim()
    ].join('\r\n');

    // Encode the email in base64
    const encodedMessage = btoa(unescape(encodeURIComponent(headers)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Prepare the request body
    const requestBody = {
      raw: encodedMessage
    };

    try {
      console.log('📧 Sending new email via Gmail API...');
      console.log('📧 To:', cleanToEmail);
      console.log('📧 Subject:', subject.trim());
      
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Gmail API error:', errorData);
        throw new Error(errorData.error?.message || `Failed to send email: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Email sent successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Error sending new email:', error);
      throw error;
    }
  },

  /**
   * Look up contact email by name or company
   * @param {string} contactIdentifier - Name, company, or email address
   * @returns {Promise<Object>} - Contact information including email
   */
  async lookupContactEmail(contactIdentifier) {
    try {
      // If it's already an email address, return it
      if (contactIdentifier.includes('@')) {
        return {
          email: contactIdentifier,
          name: contactIdentifier,
          found: true
        };
      }

      console.log('🔍 Looking up contact in Firebase:', contactIdentifier);
      
      // Import Firebase dynamically to avoid circular dependencies
      const { db } = await import('../firebase.js');
      const { collection, query, where, getDocs, or } = await import('firebase/firestore');
      
      const lowerIdentifier = contactIdentifier.toLowerCase();
      console.log('🔍 Looking for contact with identifier:', lowerIdentifier);
      
      // Query Firebase contacts collection - SIMPLE APPROACH
      console.log('🔍 Getting all contacts for simple search...');
      const allContactsSnapshot = await getDocs(collection(db, 'contacts'));
      
      if (!allContactsSnapshot.empty) {
        // Find the best match by searching through all contacts
        let bestMatch = null;
        let bestScore = 0;
        
        allContactsSnapshot.forEach((doc) => {
          const contactData = doc.data();
          const fullName = `${contactData.firstName || ''} ${contactData.lastName || ''}`.toLowerCase().trim();
          const company = (contactData.company || '').toLowerCase();
          
          // Calculate match score
          let score = 0;
          if (fullName.includes(lowerIdentifier) || lowerIdentifier.includes(fullName)) score += 10;
          if (company.includes(lowerIdentifier) || lowerIdentifier.includes(company)) score += 5;
          if (contactData.email) score += 3;
          
          if (score > bestScore) {
            bestScore = score;
            bestMatch = {
              id: doc.id,
              email: contactData.email,
              name: fullName || company || 'Unknown',
              company: contactData.company,
              found: true
            };
          }
        });
        
        if (bestMatch && bestMatch.email) {
          console.log('✅ Contact found in Firebase:', bestMatch);
          return bestMatch;
        }
      }
      
      console.log('❌ Contact not found in Firebase:', contactIdentifier);
      return {
        email: null,
        name: contactIdentifier,
        found: false
      };
      
    } catch (error) {
      console.error('❌ Error looking up contact in Firebase:', error);
      return {
        email: null,
        name: contactIdentifier,
        found: false,
        error: error.message
      };
    }
  },

  /**
   * Extract email address from a string that might contain display name
   * @param {string} emailString - String like "John Doe <john@example.com>"
   * @returns {string} - Clean email address
   */
  extractEmailAddress(emailString) {
    if (!emailString) return '';
    
    // Check if it's in format "Name <email@domain.com>"
    const match = emailString.match(/<(.+?)>/);
    if (match) {
      return match[1];
    }
    
    // If no angle brackets, assume it's just an email
    return emailString.trim();
  },

  /**
   * Get email thread to refresh the conversation
   * @param {string} accessToken - Gmail access token
   * @param {string} threadId - Thread ID to fetch
   * @returns {Promise<Object>} - Thread data
   */
  async getThread(accessToken, threadId) {
    if (!accessToken) {
      throw new Error('Gmail access token is required');
    }

    if (!threadId) {
      throw new Error('Thread ID is required');
    }

    try {
      const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Failed to fetch thread: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Gmail thread:', error);
      throw error;
    }
  },

  /**
   * Delete an email message using Gmail API
   * @param {string} accessToken - Gmail access token
   * @param {string} messageId - The ID of the message to delete
   * @returns {Promise<Object>} - Response from Gmail API
   */
  async deleteMessage(accessToken, messageId) {
    console.log('🔥 deleteMessage() called');
    console.log('🔥 messageId:', messageId);
    
    console.log('🚨 [DELETE FUNCTION] deleteMessage function called!');
    console.log('🚨 [DELETE FUNCTION] messageId:', messageId);
    console.log('🚨 [DELETE FUNCTION] accessToken exists:', !!accessToken);
    
    // 🚨 AGGRESSIVE LOGGING - FUNCTION ENTRY
    console.log('🚨 [AGGRESSIVE] FUNCTION ENTRY - deleteMessage STARTED');
    console.log('🚨 [AGGRESSIVE] Parameters received:');
    console.log('🚨 [AGGRESSIVE] - accessToken type:', typeof accessToken);
    console.log('🚨 [AGGRESSIVE] - accessToken value:', accessToken);
    console.log('🚨 [AGGRESSIVE] - accessToken === null:', accessToken === null);
    console.log('🚨 [AGGRESSIVE] - accessToken === undefined:', accessToken === undefined);
    console.log('🚨 [AGGRESSIVE] - accessToken === "":', accessToken === '');
    console.log('🚨 [AGGRESSIVE] - accessToken length:', accessToken ? accessToken.length : 'N/A');
    console.log('🚨 [AGGRESSIVE] - messageId type:', typeof messageId);
    console.log('🚨 [AGGRESSIVE] - messageId value:', messageId);
    console.log('🚨 [AGGRESSIVE] - messageId === null:', messageId === null);
    console.log('🚨 [AGGRESSIVE] - messageId === undefined:', messageId === undefined);
    console.log('🚨 [AGGRESSIVE] - messageId === "":', messageId === '');
    console.log('🚨 [AGGRESSIVE] - messageId length:', messageId ? messageId.length : 'N/A');
    
    console.log('🚨 [AGGRESSIVE] About to check if (!accessToken)');
    console.log('🚨 [AGGRESSIVE] !accessToken evaluates to:', !accessToken);
    if (!accessToken) {
      console.log('🚨 [AGGRESSIVE] INSIDE if (!accessToken) block - TOKEN IS MISSING');
      console.log('❌ [IF CHECK] accessToken check FAILED - accessToken is falsy');
      console.log('🔥 accessToken is null:', accessToken === null);
      console.log('🔥 accessToken is undefined:', accessToken === undefined);
      console.log('🔥 accessToken type:', typeof accessToken);
      console.log('🔥 accessToken length:', accessToken ? accessToken.length : 'N/A');
      console.log('🚨 [AGGRESSIVE] About to throw error for missing token');
      throw new Error('Gmail access token is required');
    }
    console.log('🚨 [AGGRESSIVE] PASSED accessToken check - token exists');
    console.log('✅ [IF CHECK] accessToken check PASSED - accessToken exists');

    console.log('🚨 [AGGRESSIVE] About to check if (!messageId)');
    console.log('🚨 [AGGRESSIVE] !messageId evaluates to:', !messageId);
    if (!messageId) {
      console.log('🚨 [AGGRESSIVE] INSIDE if (!messageId) block - MESSAGE ID IS MISSING');
      console.log('❌ [IF CHECK] messageId check FAILED - messageId is falsy');
      throw new Error('Message ID is required');
    }
    console.log('🚨 [AGGRESSIVE] PASSED messageId check - messageId exists');
    console.log('✅ [IF CHECK] messageId check PASSED - messageId exists');

    // 🔍 DEBUG: Log token and check scopes before delete operation
    console.log('🔍 [DELETE DEBUG] Access token (first 10 chars):', accessToken.substring(0, 10));
    console.log('🔍 [DELETE DEBUG] Access token (last 10 chars):', accessToken.substring(accessToken.length - 10));
    console.log('🔍 [DELETE DEBUG] Token length:', accessToken.length);
    
    // Check token scopes via Google's tokeninfo endpoint
    console.log('🚨 [AGGRESSIVE] About to start tokeninfo scope check');
    try {
      console.log('🚨 [AGGRESSIVE] Inside tokeninfo try block');
      console.log('🔍 [DELETE DEBUG] Checking token scopes...');
      const tokeninfoUrl = `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`;
      console.log('🚨 [AGGRESSIVE] Built tokeninfo URL:', tokeninfoUrl);
      console.log('🔍 [TOKENINFO] Full URL:', tokeninfoUrl);
      console.log('🔍 [TOKENINFO] About to fetch tokeninfo...');
      
      console.log('🚨 [AGGRESSIVE] About to call fetch(tokeninfoUrl)');
      console.log('🚨 [AGGRESSIVE] Fetch URL:', tokeninfoUrl);
      const scopeResponse = await fetch(tokeninfoUrl);
      console.log('🚨 [AGGRESSIVE] Fetch completed, response received');
      console.log('🔍 [TOKENINFO] Response received, status:', scopeResponse.status);
      console.log('🔍 [TOKENINFO] Response ok:', scopeResponse.ok);
      
      if (scopeResponse.ok) {
        const tokenInfo = await scopeResponse.json();
        console.log('🔍 [TOKENINFO] Raw response body:', tokenInfo);
        console.log('🔍 [DELETE DEBUG] Token scopes:', tokenInfo.scope);
        console.log('🔍 [DELETE DEBUG] Has gmail.modify scope:', tokenInfo.scope && tokenInfo.scope.includes('https://www.googleapis.com/auth/gmail.modify'));
        console.log('🔍 [DELETE DEBUG] Token expires in:', tokenInfo.expires_in, 'seconds');
      } else {
        console.warn('⚠️ [DELETE DEBUG] Could not check token scopes:', scopeResponse.status);
        console.warn('⚠️ [TOKENINFO] Failed response status:', scopeResponse.status);
      }
    } catch (scopeError) {
      console.error('❌ [TOKENINFO] Error in scope check catch block');
      console.error('❌ [TOKENINFO] Full error stack:', scopeError.stack);
      console.warn('⚠️ [DELETE DEBUG] Error checking token scopes:', scopeError.message);
    }

    console.log('🚨 [AGGRESSIVE] About to start Gmail DELETE request');
    try {
      console.log('🚨 [AGGRESSIVE] Inside Gmail DELETE try block');
      console.log('🔍 [DELETE DEBUG] Sending DELETE request to Gmail API...');
      const deleteUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`;
      console.log('🚨 [AGGRESSIVE] Built DELETE URL:', deleteUrl);
      const deleteHeaders = {
        'Authorization': `Bearer ${accessToken}`,
      };
      console.log('🚨 [AGGRESSIVE] Built DELETE headers:', deleteHeaders);
      
      console.log('🔍 [GMAIL DELETE] About to send DELETE request...');
      console.log('🔍 [GMAIL DELETE] Full URL:', deleteUrl);
      console.log('🔍 [GMAIL DELETE] Headers:', deleteHeaders);
      console.log('🚨 [AGGRESSIVE] About to call fetch for Gmail DELETE');
      console.log('🚨 [AGGRESSIVE] Fetch method: DELETE');
      console.log('🚨 [AGGRESSIVE] Fetch URL:', deleteUrl);
      console.log('🚨 [AGGRESSIVE] Fetch headers:', deleteHeaders);
      console.log('🧨 [DELETE] Using token:', accessToken);
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: deleteHeaders
      });
      console.log('🚨 [AGGRESSIVE] Gmail DELETE fetch completed');

      console.log('🔍 [GMAIL DELETE] Response received, status:', response.status);
      console.log('🔍 [GMAIL DELETE] Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [GMAIL DELETE] Error response body:', errorData);
        throw new Error(errorData.error?.message || `Failed to delete message: ${response.status}`);
      }

      console.log('✅ [GMAIL DELETE] Delete request successful');
      // Gmail API returns empty response on successful deletion
      console.log('🚨 [AGGRESSIVE] Gmail DELETE was successful');
      console.log('✅ deleteMessage() completed successfully');
      return { success: true };
    } catch (error) {
      console.log('🚨 [AGGRESSIVE] Caught error in Gmail DELETE catch block');
      console.error('❌ [GMAIL DELETE] Error in delete catch block');
      console.error('❌ [GMAIL DELETE] Full error stack:', error.stack);
      console.error('Error deleting Gmail message:', error);
      console.log('🚨 [AGGRESSIVE] About to throw error from Gmail DELETE');
      console.log('❌ deleteMessage() completed with error');
      throw error;
    }
    console.log('🚨 [AGGRESSIVE] deleteMessage function ENDING - all try/catch blocks completed');
  }
};
