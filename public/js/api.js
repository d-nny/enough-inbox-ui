// API client for interacting with the backend

class EmailAPI {
  constructor() {
    this.baseUrl = '';  // Empty base URL for same-origin requests
    this.currentUser = localStorage.getItem('userEmail') || 'user@example.com';
  }
  
  // Set current user
  setCurrentUser(email) {
    this.currentUser = email;
    localStorage.setItem('userEmail', email);
  }
  
  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }
  
  // Get list of folders
  async getFolders() {
    try {
      const response = await fetch(`${this.baseUrl}/api/folders?email=${encodeURIComponent(this.currentUser)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch folders: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching folders:', error);
      // Return default folders if API fails
      return ['Inbox', 'Sent', 'Unread'];
    }
  }
  
  // Get emails for a folder
  async getEmails(folder = 'Inbox') {
    const response = await fetch(`${this.baseUrl}/api/emails?email=${encodeURIComponent(this.currentUser)}&folder=${encodeURIComponent(folder)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch emails: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  // Get a specific email
  async getEmail(path) {
    const response = await fetch(`${this.baseUrl}/api/email?path=${encodeURIComponent(path)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch email: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  // Send a reply
  async sendReply(data) {
    const response = await fetch(`${this.baseUrl}/api/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to send reply: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }
}

// Create and export API instance
const api = new EmailAPI();