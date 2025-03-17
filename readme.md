# Email Inbox UI for Cloudflare

This Cloudflare Worker provides a web UI for viewing and managing emails stored in R2.

## Features

- View emails across different folders (Inbox, Sent, etc.)
- Read full email content with proper HTML rendering
- Reply to emails
- Simple and clean UI

## API Endpoints

The worker exposes several API endpoints for the UI to use:

### Get Email Folders

```
GET /api/folders?email=user@example.com
```

Returns a list of folders for the specified email address.

### List Emails

```
GET /api/emails?email=user@example.com&folder=Inbox
```

Returns a list of emails in the specified folder for the given email address.

### Get Email

```
GET /api/email?path=emails/user@example.com/Inbox/123456_abcdef.eml
```

Returns the full content of a specific email, including parsed headers and body.

### Send Reply

```
POST /api/reply
Content-Type: application/json

{
  "to": "recipient@example.com",
  "subject": "Re: Original Subject",
  "body": "<p>Reply content</p>",
  "inReplyToMessageId": "<original-message-id@example.com>"
}
```

Sends a reply to an email by calling the outbound email worker.

## UI Organization

The UI is a simple web application with:

1. A sidebar for email folders
2. An email list panel
3. An email detail panel
4. A reply form that appears when needed

## Configuration

### Wrangler.toml Settings

The `wrangler.toml` file includes:

- R2 binding for email storage
- Service binding to the outbound email worker
- Site configuration for static assets

## Setup Instructions

1. **Prerequisites**:
   - [Node.js](https://nodejs.org/) (v16 or later)
   - [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
   - A Cloudflare account with Workers, R2, and Pages enabled

2. **Configuration**:
   - Edit `wrangler.toml` to update your account ID and other settings

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Frontend Setup**:
   - Create the UI files in the `public` directory (HTML, CSS, JS)
   - For a more advanced UI, you might want to use a framework like React or Vue

5. **Development**:
   ```bash
   npm run dev
   ```

6. **Deployment**:
   ```bash
   npm run deploy
   ```

## Frontend Implementation

### File Structure

```
public/
├── index.html        # Main HTML file
├── css/
│   └── styles.css    # CSS styles
└── js/
    ├── app.js        # Main application logic
    ├── api.js        # API client
    ├── folderView.js # Folder management
    ├── emailList.js  # Email list view
    ├── emailView.js  # Email detail view
    └── replyForm.js  # Reply form handling
```

## Integration with Other Workers

This worker is part of a system that includes:
- `enough-inbound-emails`: Receives incoming emails
- `email-processor-worker`: Processes emails and stores metadata in a database
- `enough-outbound-emails`: Sends outbound emails