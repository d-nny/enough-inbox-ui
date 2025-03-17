// Email list handler

class EmailList {
    constructor(api) {
      this.api = api;
      this.emailListElement = document.getElementById('email-list');
      this.selectedEmailPath = null;
      this.emails = [];
      
      // Initialize event handlers
      this.initEventHandlers();
    }
    
    // Initialize event handlers
    initEventHandlers() {
      // Delegate click events for email items
      this.emailListElement.addEventListener('click', (event) => {
        const emailItem = event.target.closest('.email-item');
        if (emailItem) {
          const emailPath = emailItem.dataset.path;
          this.selectEmail(emailPath);
        }
      });
      
      // Listen for folder selection events
      document.addEventListener('folder-selected', (event) => {
        this.loadEmails(event.detail.folder);
      });
    }
    
    // Format date for display
    formatDate(dateString) {
      const date = new Date(dateString);
      const now = new Date();
      
      // If date is today, just show time
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      // If date is this year, show month and day
      if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
      
      // Otherwise show full date
      return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    }
    
    // Load emails for a folder
    async loadEmails(folder) {
      try {
        // Show loading state
        this.emailListElement.innerHTML = '<div class="email-list-empty">Loading emails...</div>';
        
        // Get emails from API
        this.emails = await this.api.getEmails(folder);
        
        // If no emails, show empty message
        if (this.emails.length === 0) {
          this.emailListElement.innerHTML = '<div class="email-list-empty">No emails in this folder</div>';
          return;
        }
        
        // Clear list
        this.emailListElement.innerHTML = '';
        
        // Add email items
        this.emails.forEach(email => {
          const path = email.path;
          const metadata = email.metadata || {};
          
          // Create email item
          const emailItem = document.createElement('div');
          emailItem.className = 'email-item';
          emailItem.dataset.path = path;
          
          // Get sender name (try to extract from format "Name <email@example.com>")
          let sender = metadata.from || 'Unknown';
          const senderMatch = sender.match(/^([^<]+)\s*<.+>$/);
          if (senderMatch) {
            sender = senderMatch[1].trim();
          }
          
          // Get date - try various metadata fields
          const dateStr = metadata.date || metadata.receivedAt || metadata.sentAt || email.uploaded;
          const formattedDate = this.formatDate(dateStr);
          
          // Create email item content
          emailItem.innerHTML = `
            <div class="email-item-header">
              <div class="email-item-sender">${this.escapeHtml(sender)}</div>
              <div class="email-item-date">${formattedDate}</div>
            </div>
            <div class="email-item-subject">${this.escapeHtml(metadata.subject || 'No Subject')}</div>
            <div class="email-item-preview">${this.escapeHtml(metadata.preview || '')}</div>
          `;
          
          this.emailListElement.appendChild(emailItem);
        });
        
        // Reset selection
        this.selectedEmailPath = null;
      } catch (error) {
        console.error('Error loading emails:', error);
        this.emailListElement.innerHTML = `
          <div class="email-list-empty">Error loading emails: ${error.message}</div>
        `;
      }
    }
    
    // Select an email
    selectEmail(path) {
      // Update selected email
      this.selectedEmailPath = path;
      
      // Update UI
      const emailItems = this.emailListElement.querySelectorAll('.email-item');
      emailItems.forEach(item => {
        if (item.dataset.path === path) {
          item.classList.add('selected');
        } else {
          item.classList.remove('selected');
        }
      });
      
      // Dispatch event so other components can respond
      const event = new CustomEvent('email-selected', { detail: { path } });
      document.dispatchEvent(event);
    }
    
    // Escape HTML to prevent XSS
    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  }
  
  // Create instance (will be initialized by app.js)