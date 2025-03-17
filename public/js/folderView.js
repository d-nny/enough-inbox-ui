// Folder view handler

class FolderView {
    constructor(api) {
      this.api = api;
      this.folderListElement = document.getElementById('folder-list');
      this.currentFolderElement = document.getElementById('current-folder');
      this.currentEmailElement = document.getElementById('current-email');
      this.selectedFolder = 'Inbox'; // Default folder
      
      // Initialize event handlers
      this.initEventHandlers();
    }
    
    // Initialize event handlers
    initEventHandlers() {
      // Delegate click events for folder items
      this.folderListElement.addEventListener('click', (event) => {
        const folderItem = event.target.closest('.folder-item');
        if (folderItem) {
          const folder = folderItem.dataset.folder;
          this.selectFolder(folder);
        }
      });
    }
    
    // Load folders from API
    async loadFolders() {
      try {
        // Update current user display
        this.currentEmailElement.textContent = this.api.getCurrentUser();
        
        // Get folders from API
        const folders = await this.api.getFolders();
        
        // Ensure we always have at least Inbox and Sent folders
        if (!folders.includes('Inbox')) folders.unshift('Inbox');
        if (!folders.includes('Sent')) folders.push('Sent');
        
        // Clear existing folders
        this.folderListElement.innerHTML = '';
        
        // Add folder items
        folders.forEach(folder => {
          const folderItem = document.createElement('div');
          folderItem.className = 'folder-item';
          folderItem.dataset.folder = folder;
          folderItem.textContent = folder;
          
          if (folder === this.selectedFolder) {
            folderItem.classList.add('selected');
          }
          
          this.folderListElement.appendChild(folderItem);
        });
      } catch (error) {
        console.error('Error loading folders:', error);
        // Create default folders if API fails
        this.folderListElement.innerHTML = `
          <div class="folder-item selected" data-folder="Inbox">Inbox</div>
          <div class="folder-item" data-folder="Sent">Sent</div>
          <div class="folder-item" data-folder="Unread">Unread</div>
        `;
      }
    }
    
    // Select a folder
    selectFolder(folder) {
      // Update selected folder
      this.selectedFolder = folder;
      
      // Update UI
      this.currentFolderElement.textContent = folder;
      
      // Update selected class
      const folderItems = this.folderListElement.querySelectorAll('.folder-item');
      folderItems.forEach(item => {
        if (item.dataset.folder === folder) {
          item.classList.add('selected');
        } else {
          item.classList.remove('selected');
        }
      });
      
      // Dispatch event so other components can respond
      const event = new CustomEvent('folder-selected', { detail: { folder } });
      document.dispatchEvent(event);
    }
    
    // Get currently selected folder
    getSelectedFolder() {
      return this.selectedFolder;
    }
  }
  
  // Create instance (will be initialized by app.js)