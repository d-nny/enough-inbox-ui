// Email detail view handler

class EmailView {
    constructor(api) {
      this.api = api;
      this.emailDetailPanel = document.getElementById('email-detail-panel');
      this.emailDetailEmpty = document.querySelector('.email-detail-empty');
      this.emailDetailContent = document.getElementById('email-detail-content');
      this.emailSubject = document.getElementById('email-subject');
      this.emailFrom = document.getElementById('email-from');
      this.emailTo = document.getElementById('email-to');
      this.emailCcContainer = document.getElementById('email-cc-container');
      this.emailCc = document.getElementById('email-cc');
      this.emailDate = document.getElementById('email-date');
      this.emailBody = document.getElementById('email-body');
      this.replyButton = document.getElementById('reply-button');
      
      this.currentEmail = null;
      
      // Initialize event handlers
      this.initEventHandlers();
    }
    
    // Initialize event handlers
    initEventHandlers() {
      // Listen for email selection events
      document.addEventListener('email-selected', (event) => {
        this.loadEmail(event.detail.path);
      });
      
      // Reply button
      this.replyButton.addEventListener('click', () => {
        if (this.currentEmail) {
          // Dispatch event for reply form to handle
          const event = new CustomEvent('show-reply-form', { 
            detail: { email: this.currentEmail }
          });
          document.dispatchEvent(event);
        }
      });
    }
    
    // Format date for display
    formatDate(dateString) {
      if (!dateString) return '';
      
      try {
        const date = new Date(dateString);
        return date.toLocaleString([], {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (error) {
        console.error('Error formatting date:', error);
        return dateString;
      }
    }
    
    // Load email details
    async loadEmail(path) {
      try {
        // Show loading
        this.showLoading(true);
        
        // Hide empty state and show content
        this.emailDetailEmpty.style.display = 'none';
        this.emailDetailContent.style.display = 'flex';
        
        // Get email from API
        const email = await this.api.getEmail(path);
        this.currentEmail = email;
        
        // Extract data
        const metadata = email.metadata || {};
        const parsed = email.parsed || {};
        
        // Update UI
        this.emailSubject.textContent = parsed.subject || metadata.subject || 'No Subject';
        this.emailFrom.textContent = parsed.from || metadata.from || 'Unknown';
        this.emailTo.textContent = parsed.to || metadata.to || '';
        
        // Handle CC (hide if empty)
        if (parsed.cc || metadata.cc_recipients) {
          this.emailCcContainer.style.display = 'block';
          this.emailCc.textContent = parsed.cc || metadata.cc_recipients || '';
        } else {
          this.emailCcContainer.style.display = 'none';
        }
        
        // Date
        const dateStr = parsed.date || metadata.date || metadata.receivedAt || metadata.sentAt;
        this.emailDate.textContent = this.formatDate(dateStr);
        
        // Body content
        if (parsed.body) {
          if (parsed.isHtml) {
            // Create sandbox iframe for HTML content
            const iframe = document.createElement('iframe');
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            iframe.sandbox = 'allow-same-origin';
            
            this.emailBody.innerHTML = '';
            this.emailBody.appendChild(iframe);
            
            // Write HTML content to iframe
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open();
            doc.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <base target="_blank">
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    font-size: 14px;
                    line-height: 1.5;
                    color: #333;
                    margin: 0;
                    padding: 0;
                  }
                  a {
                    color: #1a73e8;
                  }
                  img {
                    max-width: 100%;
                  }
                </style>
              </head>
              <body>${parsed.body}</body>
              </html>
            `);
            doc.close();
            
            // Adjust iframe height to content
            iframe.onload = () => {
              iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 'px';
            };
          } else {
            // Plain text - format with line breaks
            this.emailBody.innerHTML = this.formatPlainText(parsed.body);
          }
        } else {
          this.emailBody.textContent = 'No content';
        }
      } catch (error) {
        console.error('Error loading email:', error);
        this.emailDetailEmpty.style.display = 'flex';
        this.emailDetailContent.style.display = 'none';
        this.emailDetailEmpty.querySelector('.empty-message').textContent = 
          `Error loading email: ${error.message}`;
      } finally {
        this.showLoading(false);
      }
    }
    
    // Format plain text with HTML line breaks
    formatPlainText(text) {
      if (!text) return '';
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\n/g, '<br>');
    }
    
    // Show/hide loading overlay
    showLoading(show) {
      const loadingOverlay = document.getElementById('loading-overlay');
      loadingOverlay.style.display = show ? 'flex' : 'none';
    }
    
    // Get current email data
    getCurrentEmail() {
      return this.currentEmail;
    }
  }
  
  // Create instance (will be initialized by app.js)