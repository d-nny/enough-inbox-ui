export default {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      
      // API routes for email operations
      if (url.pathname.startsWith('/api/')) {
        return handleApiRequest(request, env, ctx);
      }
      
      // Serve static assets for UI
      return env.ASSETS.fetch(request);
    }
  };
  
  async function handleApiRequest(request, env, ctx) {
    const url = new URL(request.url);
    
    // List emails in a folder
    if (url.pathname === '/api/emails') {
      const email = url.searchParams.get('email') || 'default@example.com';
      const folder = url.searchParams.get('folder') || 'Inbox';
      
      // List emails from R2
      const prefix = `emails/${email}/${folder}/`;
      const listed = await env.EMAIL_BUCKET.list({ prefix });
      
      // Process and return the email list with metadata
      const emails = [];
      
      for (const obj of listed.objects) {
        // Skip non-email files
        if (!obj.key.endsWith('.eml')) continue;
        
        // Use metadata directly if available
        if (obj.customMetadata) {
          emails.push({
            path: obj.key,
            size: obj.size,
            uploaded: obj.uploaded,
            metadata: obj.customMetadata
          });
        } else {
          // Fetch the object to get metadata if not included in listing
          try {
            const emailObj = await env.EMAIL_BUCKET.head(obj.key);
            emails.push({
              path: obj.key,
              size: obj.size,
              uploaded: obj.uploaded,
              metadata: emailObj.customMetadata || {}
            });
          } catch (error) {
            console.error(`Error fetching metadata for ${obj.key}:`, error);
            emails.push({
              path: obj.key,
              size: obj.size,
              uploaded: obj.uploaded,
              metadata: {}
            });
          }
        }
      }
      
      // Sort by date (newest first)
      emails.sort((a, b) => {
        const dateA = a.metadata.date || a.metadata.receivedAt || a.metadata.sentAt || a.uploaded;
        const dateB = b.metadata.date || b.metadata.receivedAt || b.metadata.sentAt || b.uploaded;
        return new Date(dateB) - new Date(dateA);
      });
      
      return new Response(JSON.stringify(emails), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Get a specific email
    if (url.pathname === '/api/email') {
      const path = url.searchParams.get('path');
      
      if (!path) {
        return new Response(JSON.stringify({ error: "Missing path parameter" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const email = await env.EMAIL_BUCKET.get(path);
      
      if (!email) {
        return new Response(JSON.stringify({ error: "Email not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // Parse the email content to get a structured representation
      const content = await email.text();
      const parsedEmail = parseEmailContent(content);
      
      return new Response(JSON.stringify({
        path,
        metadata: email.customMetadata || {},
        parsed: parsedEmail
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Send a reply
    if (url.pathname === '/api/reply' && request.method === 'POST') {
      const data = await request.json();
      
      // Call the outbound email worker
      const outboundResponse = await env.EMAIL_OUTBOUND.fetch(
        "https://enough-outbound-emails.workers.dev/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        }
      );
      
      const outboundResult = await outboundResponse.json();
      
      return new Response(JSON.stringify(outboundResult), {
        status: outboundResponse.status,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Get email folders for a user
    if (url.pathname === '/api/folders') {
      const email = url.searchParams.get('email') || 'default@example.com';
      const prefix = `emails/${email}/`;
      
      const listed = await env.EMAIL_BUCKET.list({
        prefix,
        delimiter: '/'
      });
      
      // Extract folder names from the delimited prefixes
      const folders = listed.delimitedPrefixes.map(prefix => {
        // Extract the folder name from the path
        const folderPath = prefix.substring(prefix.indexOf(email) + email.length + 1);
        return folderPath.replace(/\/$/, ''); // Remove trailing slash
      });
      
      return new Response(JSON.stringify(folders), {
        headers: { "Content-Type": "application/json" }
      });
    }
    
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  // Helper function to parse email content
  function parseEmailContent(content) {
    // Split headers and body
    const parts = content.split(/\r?\n\r?\n/);
    const headerText = parts[0];
    const bodyText = parts.slice(1).join('\n\n');
    
    // Parse headers
    const headers = {};
    headerText.split(/\r?\n/).forEach(line => {
      // Handle header line continuations (starting with whitespace)
      if (/^\s+/.test(line) && Object.keys(headers).length > 0) {
        const lastHeader = Object.keys(headers).pop();
        headers[lastHeader] += ' ' + line.trim();
        return;
      }
      
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        const key = match[1].toLowerCase();
        const value = match[2].trim();
        headers[key] = value;
      }
    });
    
    // Determine content type
    const contentType = headers['content-type'] || '';
    let isHtml = contentType.includes('text/html');
    
    // For multipart messages, try to find the HTML or text part
    let body = bodyText;
    if (contentType.includes('multipart/')) {
      const boundary = contentType.match(/boundary="?([^";\r\n]+)"?/);
      if (boundary && boundary[1]) {
        const boundaryStr = boundary[1];
        const parts = bodyText.split(new RegExp(`--${boundaryStr}\\r?\\n`));
        
        // Look for HTML part first, then plain text
        let htmlPart = null;
        let textPart = null;
        
        for (const part of parts) {
          if (part.includes('Content-Type: text/html')) {
            htmlPart = part;
            const content = part.split(/\r?\n\r?\n/).slice(1).join('\n\n');
            isHtml = true;
            body = content;
            break;
          } else if (part.includes('Content-Type: text/plain')) {
            textPart = part;
            const content = part.split(/\r?\n\r?\n/).slice(1).join('\n\n');
            body = content;
          }
        }
        
        // If we found a text part but no HTML part, use the text part
        if (!htmlPart && textPart) {
          isHtml = false;
          body = textPart.split(/\r?\n\r?\n/).slice(1).join('\n\n');
        }
      }
    }
    
    // Return the parsed email
    return {
      headers,
      subject: headers.subject || 'No Subject',
      from: headers.from || '',
      to: headers.to || '',
      cc: headers.cc || '',
      date: headers.date || '',
      isHtml,
      body
    };
  }