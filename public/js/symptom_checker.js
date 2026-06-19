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
            <svg viewBox="0 0 24 24">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </div>
          <div class="symptom-chat-title">
            <h4>SD Hero AI Mechanic</h4>
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
          Hello! I am your AI Bike Diagnostic Assistant. 🏍️<br><br>
          Describe what's wrong with your bike or scooter in plain English (e.g. <em>"mileage has dropped"</em>, <em>"clicking noise when starting"</em>, or <em>"front brake feels loose"</em>). 
          I will analyze the symptoms and give you likely causes, estimated repair costs, and urgency level immediately!
        </div>
      </div>

      <div class="symptom-chat-input-area">
        <input type="text" class="symptom-chat-input" id="symptom-input" placeholder="Type symptom (e.g. engine overheating)..." maxlength="300">
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

  // Toggle Chat Drawer
  bubble.addEventListener('click', () => {
    drawer.classList.toggle('open');
    if (drawer.classList.contains('open')) {
      inputEl.focus();
      // Remove badge when user opens chat
      if (badge) {
        badge.style.display = 'none';
      }
    }
  });

  // Close Drawer
  closeBtn.addEventListener('click', () => {
    drawer.classList.remove('open');
  });

  // Send Message Event
  const handleSend = async () => {
    const text = inputEl.value.trim();
    if (!text) return;

    // Add user message to chat UI
    appendMessage(text, 'user-msg');
    inputEl.value = '';

    // Add loading indicator
    const loadingId = appendLoading();

    try {
      const response = await fetch('/api/symptom-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: text })
      });

      removeLoading(loadingId);

      if (!response.ok) {
        throw new Error('API server returned an error');
      }

      const data = await response.json();
      renderResponse(data, text);

    } catch (err) {
      console.error('Error fetching symptom diagnosis:', err);
      removeLoading(loadingId);
      appendMessage(
        "Oops, I had trouble connecting to the diagnostics server. Please check your connection or book a general service below to let our mechanics check it physically.", 
        'system-msg'
      );
      appendBookingCTA(text, null);
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
      // No match found
      appendMessage(data.recommendation || "We couldn't find a direct match for this symptom in our database. Since safety is key, we recommend a physical inspection by our technicians.", 'system-msg');
      appendBookingCTA(originalQuery, "General Physical Inspection");
      return;
    }

    // Format matches found
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
    
    // Add Book Service button
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
      // Minimize Chat Drawer
      drawer.classList.remove('open');
      
      // Auto-populate booking form details
      const descField = document.getElementById('description');
      if (descField) {
        let fillText = `Symptom Check: Customer reported: "${query}".`;
        if (diagnosedIssue) {
          fillText += `\nAI Diagnosis: Possible ${diagnosedIssue}.`;
        }
        descField.value = fillText;
        // Trigger input event to let frontend framework/validation scripts register the change
        descField.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      // Scroll to booking form
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
