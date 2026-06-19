document.addEventListener('DOMContentLoaded', () => {
  // 1. Create and Append HTML Structure to Body
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'symptom-checker-widget';
  widgetContainer.innerHTML = `
    <!-- Floating Bubble -->
    <div class="symptom-checker-bubble" id="symptom-bubble" title="AI Symptom Checker">
      <svg viewBox="0 0 24 24">
        <path d="M19 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h4l3 3 3-3h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 13.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5 0.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5V7.5c0-.83.67-1.5 1.5-1.5s1.5 0.67 1.5 1.5V10z"/>
      </svg>
      <div class="unread-badge" id="symptom-badge">1</div>
    </div>

    <!-- Chat Drawer -->
    <div class="symptom-checker-drawer" id="symptom-drawer">
      <div class="symptom-chat-header">
        <div class="symptom-chat-header-info">
          <div class="symptom-chat-avatar">
            <img src="images/devi_avatar.png" alt="Devi">
          </div>
          <div class="symptom-chat-title">
            <h4>Devi - SD Hero AI Mechanic</h4>
            <span>Online</span>
          </div>
        </div>
        <button class="symptom-chat-close" id="symptom-close" aria-label="Close Chat">
          <svg viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
          </svg>
        </button>
      </div>

      <div class="symptom-chat-body" id="symptom-chat-body">
        <div class="symptom-chat-message system-msg">
          Hello! I am Devi, your AI Bike Diagnostic Assistant. 🏍️<br><br>
          Describe what's wrong with your bike or scooter in plain English, and <strong>you can now upload a picture</strong> of the problem area (e.g. engine oil leak, worn out brakes, exhaust smoke) using the camera icon below!
        </div>
      </div>

      <!-- Image Preview Container -->
      <div class="symptom-chat-preview-container" id="symptom-preview-container">
        <div class="symptom-chat-preview-wrapper">
          <img src="" class="symptom-chat-preview-thumb" id="symptom-preview-thumb">
          <button class="symptom-chat-preview-remove" id="symptom-preview-remove" title="Remove image">&times;</button>
        </div>
        <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 0.5rem;">Photo attached</span>
      </div>

      <div class="symptom-chat-input-area">
        <!-- Hidden file input -->
        <input type="file" id="symptom-image-input" accept="image/jpeg, image/png, image/webp" style="display: none;">
        
        <!-- Attach button -->
        <button class="symptom-chat-attach-btn" id="symptom-attach-trigger" title="Upload Bike Image">
          <svg viewBox="0 0 24 24">
            <path d="M12 12m-3.2 0a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0 -6.4 0"/>
            <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5s5 2.24 5 5s-2.24 5-5 5z"/>
          </svg>
        </button>

        <input type="text" class="symptom-chat-input" id="symptom-input" placeholder="Describe or upload bike photo..." maxlength="300">
        <button class="symptom-chat-send" id="symptom-send" aria-label="Send">
          <svg viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(widgetContainer);

  // DOM Elements References
  const bubble = document.getElementById('symptom-bubble');
  const drawer = document.getElementById('symptom-drawer');
  const closeBtn = document.getElementById('symptom-close');
  const badge = document.getElementById('symptom-badge');
  const chatBody = document.getElementById('symptom-chat-body');
  const inputEl = document.getElementById('symptom-input');
  const sendBtn = document.getElementById('symptom-send');
  
  // Image attachments elements
  const fileInput = document.getElementById('symptom-image-input');
  const attachBtn = document.getElementById('symptom-attach-trigger');
  const previewContainer = document.getElementById('symptom-preview-container');
  const previewThumb = document.getElementById('symptom-preview-thumb');
  const previewRemove = document.getElementById('symptom-preview-remove');

  // State
  let attachedImage = null;

  // Toggle Chat Drawer
  bubble.addEventListener('click', () => {
    drawer.classList.toggle('open');
    if (drawer.classList.contains('open')) {
      inputEl.focus();
      if (badge) {
        badge.style.display = 'none';
      }
    }
  });

  // Close Drawer
  closeBtn.addEventListener('click', () => {
    drawer.classList.remove('open');
  });

  // Handle Attach Button Click
  attachBtn.addEventListener('click', () => {
    fileInput.click();
  });

  // Handle File Input Change
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPEG, WebP).');
      fileInput.value = '';
      return;
    }

    // Validate size (limit 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image is too large. Please select a photo smaller than 2MB.');
      fileInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target.result.split(',')[1];
      attachedImage = {
        mimeType: file.type,
        data: base64Data
      };
      
      // Update UI preview
      previewThumb.src = event.target.result;
      previewContainer.classList.add('show');
      inputEl.focus();
    };
    reader.readAsDataURL(file);
  });

  // Remove Attached Image
  const clearAttachment = () => {
    attachedImage = null;
    fileInput.value = '';
    previewThumb.src = '';
    previewContainer.classList.remove('show');
  };
  
  previewRemove.addEventListener('click', clearAttachment);

  // Send Message Event
  const handleSend = async () => {
    const text = inputEl.value.trim();
    if (!text && !attachedImage) return;

    // Add user message with image/text to UI
    let userMsgEl;
    if (attachedImage) {
      userMsgEl = appendMessage('', 'user-msg');
      userMsgEl.innerHTML = `
        <div class="symptom-chat-image-bubble">
          <img src="data:${attachedImage.mimeType};base64,${attachedImage.data}">
        </div>
      `;
      if (text) {
        const textSpan = document.createElement('div');
        textSpan.style.marginTop = '0.5rem';
        textSpan.innerText = text;
        userMsgEl.appendChild(textSpan);
      }
    } else {
      userMsgEl = appendMessage(text, 'user-msg');
    }

    const queryText = text || 'Visual analysis of bike photo';
    const payload = {
      query: text,
      image: attachedImage
    };

    // Reset input states immediately
    inputEl.value = '';
    clearAttachment();

    // Add loading indicator
    const loadingId = appendLoading();

    try {
      const response = await fetch('/api/symptom-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      removeLoading(loadingId);

      if (!response.ok) {
        throw new Error('API server returned an error');
      }

      const data = await response.json();
      renderResponse(data, queryText);

    } catch (err) {
      console.error('Error fetching symptom diagnosis:', err);
      removeLoading(loadingId);
      appendMessage(
        "Oops, I had trouble connecting to the diagnostics server. Please check your connection or book a general service below to let our mechanics check it physically.", 
        'system-msg'
      );
      appendBookingCTA(queryText, null);
    }
  };

  sendBtn.addEventListener('click', handleSend);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  });

  // Helper: Append a basic message
  function appendMessage(content, className) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `symptom-chat-message ${className}`;
    msgDiv.innerHTML = content;
    chatBody.appendChild(msgDiv);
    scrollToBottom();
    return msgDiv;
  }

  // Helper: Append loading indicator
  function appendLoading() {
    const loadDiv = document.createElement('div');
    loadDiv.className = 'symptom-chat-loading';
    loadDiv.id = 'chat-loading-dots';
    loadDiv.innerHTML = `
      <span></span>
      <span></span>
      <span></span>
    `;
    chatBody.appendChild(loadDiv);
    scrollToBottom();
    return loadDiv.id;
  }

  // Helper: Remove loading indicator
  function removeLoading(id) {
    const loadDiv = document.getElementById(id);
    if (loadDiv) {
      loadDiv.remove();
    }
  }

  // Helper: Scroll chat body to bottom
  function scrollToBottom() {
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  // Helper: Render JSON response from API
  function renderResponse(data, originalQuery) {
    if (!data.match_found || !data.diagnoses || data.diagnoses.length === 0) {
      appendMessage(data.recommendation || "We couldn't find a direct match for this symptom in our database. Since safety is key, we recommend a physical inspection by our technicians.", 'system-msg');
      appendBookingCTA(originalQuery, "General Physical Inspection");
      return;
    }

    let responseHtml = `<p>${data.recommendation}</p>`;
    
    data.diagnoses.forEach((diag, index) => {
      const urgencyClass = getUrgencyClass(diag.urgency_level);
      
      responseHtml += `
        <div class="symptom-diagnosis-card">
          <div class="symptom-diagnosis-header">
            <span class="symptom-diagnosis-title">${index + 1}. ${diag.cause}</span>
            <span class="urgency-badge ${urgencyClass}">${diag.urgency_level}</span>
          </div>
          <div class="symptom-diagnosis-detail">
            <strong>Fix:</strong> ${diag.typical_fix}<br>
            <div class="symptom-diagnosis-cost">
              <strong>Est. Cost:</strong> ₹${diag.cost_range_inr}
            </div>
          </div>
        </div>
      `;
    });

    appendMessage(responseHtml, 'system-msg');
    
    const mainCause = data.diagnoses[0].cause;
    appendBookingCTA(originalQuery, mainCause);
  }

  // Helper: Convert urgency text to CSS class name suffix
  function getUrgencyClass(urgency) {
    const lower = (urgency || '').toLowerCase();
    if (lower.includes('now')) return 'now';
    if (lower.includes('week')) return 'week';
    return 'wait';
  }

  // Helper: Add booking CTA button in chat
  function appendBookingCTA(query, diagnosedIssue) {
    const container = document.createElement('div');
    container.style.marginTop = '0.5rem';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    const btn = document.createElement('button');
    btn.className = 'symptom-cta-btn';
    btn.innerHTML = 'Book Service Now 📅';
    
    btn.addEventListener('click', () => {
      drawer.classList.remove('open');
      
      const descField = document.getElementById('description');
      if (descField) {
        let fillText = `Symptom Check: Customer reported: "${query}".`;
        if (diagnosedIssue) {
          fillText += `\nAI Diagnosis: Possible ${diagnosedIssue}.`;
        }
        descField.value = fillText;
        descField.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      const bookingSection = document.getElementById('book');
      if (bookingSection) {
        bookingSection.scrollIntoView({ behavior: 'smooth' });
      }
    });

    container.appendChild(btn);
    chatBody.appendChild(container);
    scrollToBottom();
  }
});
