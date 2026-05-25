// ==========================================================================
// SD HERO SERVICE - ADMIN DASHBOARD MANAGEMENT LOGIC
// ==========================================================================

let allBookings = [];
let activeFilter = 'all';
let searchQuery = '';

// Chart.js global instances to avoid overlap bugs
let statusChartInstance = null;
let brandChartInstance = null;
let serviceChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initLoginForm();
  initLogoutBtn();
  initFilters();
  initSearch();
  initQuickAdd();
  initCSVExport();
  initAdminZoomModal();
  initPortalTabs();
});

// Toast Helper
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast-notification');
  const toastMsg = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');
  
  toastMsg.textContent = message;
  toast.className = 'toast show';
  
  if (type === 'success') {
    toast.classList.add('toast-success');
    toastIcon.textContent = '✅';
  } else if (type === 'error') {
    toast.classList.add('toast-error');
    toastIcon.textContent = '❌';
  } else {
    toastIcon.textContent = '📢';
  }
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// Authentication Check
async function checkAuth() {
  const urlParams = new URLSearchParams(window.location.search);
  const autologinKey = urlParams.get('autologin');

  if (autologinKey) {
    try {
      const response = await fetch(`/api/admin/autologin?key=${encodeURIComponent(autologinKey)}`);
      const data = await response.json();
      if (response.ok && data.token) {
        localStorage.setItem('sdhero_admin_token', data.token);
        showToast('Auto-logged in successfully!', 'success');
        // Clean up URL parameter
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (err) {
      console.error('Autologin error:', err);
    }
  }

  const token = localStorage.getItem('sdhero_admin_token');
  const loginContainer = document.getElementById('login-container');
  const dashboardContainer = document.getElementById('dashboard-container');
  const body = document.getElementById('body-root');

  if (token) {
    // Authenticated
    loginContainer.style.display = 'none';
    dashboardContainer.style.display = 'flex';
    body.classList.remove('admin-login-body'); // Remove centering styling
    
    // Fetch dashboard bookings and load QRs
    fetchBookings();
    loadQrCodes();
  } else {
    // Unauthenticated
    loginContainer.style.display = 'block';
    dashboardContainer.style.display = 'none';
    if (!body.classList.contains('admin-login-body')) {
      body.classList.add('admin-login-body');
    }
  }
}

// Admin Login Form
function initLoginForm() {
  const form = document.getElementById('admin-login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById('btn-login');
    btn.disabled = true;
    btn.textContent = 'Verifying...';

    const credentials = {
      username: document.getElementById('username').value.trim(),
      password: document.getElementById('password').value
    };

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem('sdhero_admin_token', data.token);
        showToast('Login Successful! Welcome back.', 'success');
        checkAuth();
        document.getElementById('password').value = '';
      } else {
        showToast(data.error || 'Login failed. Invalid credentials.', 'error');
      }
    } catch (err) {
      console.error('Login error:', err);
      showToast('Network error during login.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Access Dashboard';
    }
  });
}

// Admin Logout
function initLogoutBtn() {
  const btn = document.getElementById('btn-logout');
  if (!btn) return;

  btn.addEventListener('click', () => {
    localStorage.removeItem('sdhero_admin_token');
    showToast('Logged out successfully.', 'info');
    checkAuth();
  });
}

// Fetch all bookings from API
async function fetchBookings() {
  const token = localStorage.getItem('sdhero_admin_token');
  const listContainer = document.getElementById('admin-bookings-list');

  try {
    const response = await fetch('/api/admin/bookings', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401 || response.status === 403) {
      // Session expired or invalid
      localStorage.removeItem('sdhero_admin_token');
      checkAuth();
      showToast('Session expired. Please login again.', 'error');
      return;
    }

    if (!response.ok) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 4rem; color: var(--text-secondary);">
          <p>Failed to retrieve records. Please refresh the page.</p>
        </div>
      `;
      return;
    }

    allBookings = await response.json();
    updateStats();
    renderBookings();

  } catch (err) {
    console.error('Fetch bookings error:', err);
    listContainer.innerHTML = `
      <div style="text-align: center; padding: 4rem; color: var(--text-secondary);">
        <p>Network error fetching records. Check backend connection.</p>
      </div>
    `;
  }
}

// Calculate Stats Dashboard
function updateStats() {
  let pendingCount = 0;
  let progressCount = 0;
  let readyCount = 0;
  let totalActiveRevenue = 0;

  allBookings.forEach(booking => {
    if (booking.status === 'Pending') {
      pendingCount++;
    } else if (booking.status === 'In Progress') {
      progressCount++;
      totalActiveRevenue += (booking.estimated_cost || 0);
    } else if (booking.status === 'Ready for Delivery') {
      readyCount++;
      totalActiveRevenue += (booking.estimated_cost || 0);
    }
  });

  document.getElementById('stat-pending').textContent = pendingCount;
  document.getElementById('stat-progress').textContent = progressCount;
  document.getElementById('stat-ready').textContent = readyCount;
  document.getElementById('stat-revenue').textContent = `₹${totalActiveRevenue}`;
}

// Filter Tabs Init
function initFilters() {
  const tabs = document.querySelectorAll('.filter-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeFilter = tab.getAttribute('data-status');
      renderBookings();
    });
  });
}

// Search Input Init
function initSearch() {
  const searchInput = document.getElementById('admin-search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderBookings();
  });
}

// Render Bookings List dynamically
function renderBookings() {
  const listContainer = document.getElementById('admin-bookings-list');
  
  // Filter list in memory
  let filtered = allBookings;

  // 1. Status Filter
  if (activeFilter !== 'all') {
    filtered = filtered.filter(b => b.status === activeFilter);
  }

  // 2. Text Search Filter (matches ID, customer name, brand, model or phone)
  if (searchQuery !== '') {
    filtered = filtered.filter(b => {
      return b.id.toLowerCase().includes(searchQuery) ||
             b.customer_name.toLowerCase().includes(searchQuery) ||
             b.phone.includes(searchQuery) ||
             b.vehicle_brand.toLowerCase().includes(searchQuery) ||
             b.vehicle_model.toLowerCase().includes(searchQuery);
    });
  }

  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align: center; padding: 4rem; color: var(--text-secondary); background-color: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <p>No bookings match the filter criteria.</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = filtered.map(b => {
    const formattedDate = b.booking_date;
    
    // Status color badge builder
    let statusClass = 'status-pending';
    if (b.status === 'In Progress') statusClass = 'status-progress';
    else if (b.status === 'Ready for Delivery') statusClass = 'status-ready';
    else if (b.status === 'Completed') statusClass = 'status-completed';

    // Parse diagnostic health report JSON
    let health = { battery: 'Healthy', oil: 'Excellent', brakes: 'OK', spark: 'Clean', chain: 'Lubricated' };
    if (b.health_report && b.health_report.trim() !== '') {
      try {
        health = JSON.parse(b.health_report);
      } catch (e) {
        console.error('Failed to parse health report for booking', b.id, e);
      }
    }

    return `
      <div class="admin-booking-card" id="card-${b.id}">
        <!-- Card Header -->
        <div class="admin-booking-card-header">
          <div class="card-header-left">
            <span class="booking-card-id">${b.id}</span>
            <span class="booking-card-date">Booked: ${formattedDate}</span>
          </div>
          <span class="status-badge ${statusClass}">${b.status}</span>
        </div>

        <!-- Details Info Grid -->
        <div class="admin-booking-details">
          <div>
            <label>Customer Details</label>
            <p style="font-weight:600; font-size:1.05rem;">${b.customer_name}</p>
            <p style="font-size:0.9rem; color:var(--text-secondary); margin-top:0.25rem;">
              📞 <a href="tel:${b.phone}" style="border-bottom:1px dashed var(--text-muted);">${b.phone}</a>
            </p>
          </div>
          
          <div>
            <label>Vehicle & Service</label>
            <p style="font-weight:600; font-size:1.05rem;">${b.vehicle_brand} - ${b.vehicle_model}</p>
            <p style="font-size:0.9rem; color:var(--accent); font-weight:500; margin-top:0.25rem;">${b.service_type}</p>
          </div>

          <div>
            <label>Customer Complaint / Request</label>
            <p style="font-size:0.9rem; color:var(--text-secondary); line-height:1.4;">
              ${b.description ? b.description : '<span style="color:var(--text-muted); font-style:italic;">No description provided.</span>'}
            </p>
            ${b.vehicle_image ? `
            <div class="booking-detail-image-wrapper">
              <label>Customer Uploaded Photo</label>
              <img src="${b.vehicle_image}" alt="Customer Uploaded Bike Image" class="booking-image-thumb" onclick="openAdminZoomModal('${b.vehicle_image}')" title="Click to view full screen">
            </div>
            ` : ''}
          </div>
        </div>

        <!-- Admin Control Form Area -->
        <div class="admin-booking-actions" style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div class="action-left" style="display: flex; flex-wrap: wrap; gap: 1rem; width: 100%;">
            
            <div class="action-item">
              <label for="status-${b.id}" style="font-size:0.75rem;">Status</label>
              <select id="status-${b.id}" class="input-control" style="width:170px;">
                <option value="Pending" ${b.status === 'Pending' ? 'selected' : ''}>Pending Review</option>
                <option value="In Progress" ${b.status === 'In Progress' ? 'selected' : ''}>In Service</option>
                <option value="Ready for Delivery" ${b.status === 'Ready for Delivery' ? 'selected' : ''}>Ready for Delivery</option>
                <option value="Completed" ${b.status === 'Completed' ? 'selected' : ''}>Completed/Delivered</option>
              </select>
            </div>

            <div class="action-item">
              <label for="cost-${b.id}" style="font-size:0.75rem;">Cost (₹)</label>
              <input type="number" id="cost-${b.id}" class="input-control" style="width:110px;" value="${b.estimated_cost || 0}" min="0">
            </div>

            <div class="action-item" style="flex-grow:1; min-width:220px;">
              <label for="notes-${b.id}" style="font-size:0.75rem;">Technician Service Notes</label>
              <input type="text" id="notes-${b.id}" class="input-control" value="${b.technician_notes || ''}" placeholder="Explain repairs done...">
            </div>

          </div>

          <!-- Bike Health Inspection Checklist Dropdowns -->
          <div class="admin-health-inspections" style="width: 100%; border-top: 1px solid var(--border-color); padding-top: 1rem;">
            <label style="font-size: 0.75rem; color: var(--accent); margin-bottom: 0.75rem; display: block; font-weight: 700;">⚙️ Bike Diagnostics Health Report</label>
            <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
              <div class="admin-health-item">
                <label for="health-battery-${b.id}">🔋 Battery</label>
                <select id="health-battery-${b.id}" class="admin-health-select">
                  <option value="Healthy" ${health.battery === 'Healthy' ? 'selected' : ''}>Healthy</option>
                  <option value="Weak" ${health.battery === 'Weak' ? 'selected' : ''}>Weak</option>
                  <option value="Needs Charge" ${health.battery === 'Needs Charge' ? 'selected' : ''}>Needs Charge</option>
                </select>
              </div>
              <div class="admin-health-item">
                <label for="health-oil-${b.id}">🛢️ Engine Oil</label>
                <select id="health-oil-${b.id}" class="admin-health-select">
                  <option value="Excellent" ${health.oil === 'Excellent' ? 'selected' : ''}>Excellent</option>
                  <option value="Low" ${health.oil === 'Low' ? 'selected' : ''}>Low</option>
                  <option value="Blackened" ${health.oil === 'Blackened' ? 'selected' : ''}>Blackened</option>
                </select>
              </div>
              <div class="admin-health-item">
                <label for="health-brakes-${b.id}">🛑 Brakes</label>
                <select id="health-brakes-${b.id}" class="admin-health-select">
                  <option value="OK" ${health.brakes === 'OK' ? 'selected' : ''}>OK</option>
                  <option value="Worn" ${health.brakes === 'Worn' ? 'selected' : ''}>Worn</option>
                  <option value="Loose" ${health.brakes === 'Loose' ? 'selected' : ''}>Loose</option>
                </select>
              </div>
              <div class="admin-health-item">
                <label for="health-spark-${b.id}">⚙️ Spark Plug</label>
                <select id="health-spark-${b.id}" class="admin-health-select">
                  <option value="Clean" ${health.spark === 'Clean' ? 'selected' : ''}>Clean</option>
                  <option value="Carbon Blocked" ${health.spark === 'Carbon Blocked' ? 'selected' : ''}>Carbon Blocked</option>
                  <option value="Replace" ${health.spark === 'Replace' ? 'selected' : ''}>Replace</option>
                </select>
              </div>
              <div class="admin-health-item">
                <label for="health-chain-${b.id}">🚲 Drive Chain</label>
                <select id="health-chain-${b.id}" class="admin-health-select">
                  <option value="Lubricated" ${health.chain === 'Lubricated' ? 'selected' : ''}>Lubricated</option>
                  <option value="Dry" ${health.chain === 'Dry' ? 'selected' : ''}>Dry</option>
                  <option value="Needs Adjust" ${health.chain === 'Needs Adjust' ? 'selected' : ''}>Needs Adjust</option>
                </select>
              </div>
            </div>
          </div>

          <div class="action-right" style="display: flex; gap: 0.5rem; align-items: flex-end; width: 100%; border-top: 1px solid var(--border-color); padding-top: 1rem; justify-content: flex-end;">
            <div class="action-item" style="margin-right: 0.5rem; text-align: left;">
              <label for="lang-${b.id}" style="font-size:0.7rem; margin-bottom: 0.25rem;">Language</label>
              <select id="lang-${b.id}" class="input-control" style="width:95px; padding:0.4rem 0.5rem; font-size:0.8rem; background-color: var(--bg-primary);">
                <option value="hinglish" selected>Hinglish</option>
                <option value="hindi">Hindi (हिंदी)</option>
                <option value="english">English</option>
              </select>
            </div>
            <button onclick="updateBooking('${b.id}')" class="btn btn-sm btn-success" id="btn-save-${b.id}" style="height: 36px;">Save</button>
            <button onclick="sendWhatsApp('${b.id}')" class="btn btn-sm btn-whatsapp" style="height: 36px;">WhatsApp Update</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Update Booking Status, Notes, and Cost via PUT API
async function updateBooking(bookingId) {
  const token = localStorage.getItem('sdhero_admin_token');
  const btn = document.getElementById(`btn-save-${bookingId}`);

  const status = document.getElementById(`status-${bookingId}`).value;
  const estimated_cost = parseFloat(document.getElementById(`cost-${bookingId}`).value) || 0;
  const technician_notes = document.getElementById(`notes-${bookingId}`).value.trim();

  // Read diagnostic checklist dropdown values
  const battery = document.getElementById(`health-battery-${bookingId}`).value;
  const oil = document.getElementById(`health-oil-${bookingId}`).value;
  const brakes = document.getElementById(`health-brakes-${bookingId}`).value;
  const spark = document.getElementById(`health-spark-${bookingId}`).value;
  const chain = document.getElementById(`health-chain-${bookingId}`).value;
  
  const health_report = JSON.stringify({ battery, oil, brakes, spark, chain });

  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const response = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        status,
        technician_notes,
        estimated_cost,
        health_report // Save structured diagnostic checklist back to server
      })
    });

    const data = await response.json();

    if (response.ok) {
      showToast(`Booking ${bookingId} updated successfully.`, 'success');
      // Refresh database items
      fetchBookings();
    } else {
      showToast(data.error || 'Failed to update record.', 'error');
    }
  } catch (err) {
    console.error('Update booking error:', err);
    showToast('Network error updating record.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save';
  }
}

// Send Preformatted WhatsApp Message to Customer (with Hinglish, Hindi, and English template selectors)
function sendWhatsApp(bookingId) {
  const booking = allBookings.find(b => b.id === bookingId);
  if (!booking) return;

  const phone = booking.phone;
  const cleanPhone = phone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  // Retrieve matching UI values
  const statusInput = document.getElementById(`status-${bookingId}`).value;
  const costInput = document.getElementById(`cost-${bookingId}`).value;
  const notesInput = document.getElementById(`notes-${bookingId}`).value.trim();
  const langInput = document.getElementById(`lang-${bookingId}`).value;

  let messageText = '';

  if (langInput === 'hinglish') {
    if (statusInput === 'Pending') {
      messageText = `*S.D. Hero Service Centre (Patna)*\n\nPranam ${booking.customer_name} ji,\nHumne aapki gaadi *${booking.vehicle_brand} ${booking.vehicle_model}* ki booking request accept kar li hai. \n📆 *Date*: ${booking.booking_date}\n📍 *Service Centre*: Prithviraj Chowk, Lohanipur, Patna\n\nApne vehicle ka status track karne ke liye yahan click karein: http://${window.location.host}/index.html?track=${booking.id}`;
    } else if (statusInput === 'In Progress') {
      messageText = `*S.D. Hero Service Centre (Patna)*\n\nNamaste ${booking.customer_name} ji,\nAapki gaadi *${booking.vehicle_brand} ${booking.vehicle_model}* ka repair work chal raha hai. \n🛠️ *Repairs*: ${notesInput || 'General servicing jari hai.'}\n💰 *Estimated Cost*: ₹${costInput}\n\nLive tracking link: http://${window.location.host}/index.html?track=${booking.id}`;
    } else if (statusInput === 'Ready for Delivery') {
      messageText = `*S.D. Hero Service Centre (Patna)*\n\nNamaste ${booking.customer_name} ji, khushkhabri! \nAapki gaadi *${booking.vehicle_brand} ${booking.vehicle_model}* taiyar ho chuki hai aur delivery ke liye ready hai. \n📋 *Kaam*: ${notesInput || 'Service aur tuning complete.'}\n💸 *Total Bill*: ₹${costInput}\n\nKripya Service Centre (Prithviraj Chowk, Lohanipur) par aakar apni gaadi le jayein. Dhanyawad!`;
    } else if (statusInput === 'Completed') {
      messageText = `*S.D. Hero Service Centre (Patna)*\n\nNamaste ${booking.customer_name} ji,\nHumse service karwane ke liye bohot dhanyawad. Umeed hai aapki gaadi mast chal rahi hogi. \n📞 Kisi bhi samasya ke liye contact karein: 9334834344. Drive safe!`;
    }
  } else if (langInput === 'hindi') {
    if (statusInput === 'Pending') {
      messageText = `*S.D. Hero Service Centre (Patna)*\n\nप्रणाम ${booking.customer_name} जी,\nहमने आपकी गाड़ी *${booking.vehicle_brand} ${booking.vehicle_model}* की बुकिंग स्वीकार कर ली है। \n📆 *दिनांक*: ${booking.booking_date}\n📍 *पता*: पृथ्वीराज चौक, लोहानीपुर, पटना\n\nगाड़ी का स्टेटस ट्रैक करने के लिए यहाँ क्लिक करें: http://${window.location.host}/index.html?track=${booking.id}`;
    } else if (statusInput === 'In Progress') {
      messageText = `*S.D. Hero Service Centre (Patna)*\n\nनमस्ते ${booking.customer_name} जी,\nआपकी गाड़ी *${booking.vehicle_brand} ${booking.vehicle_model}* का काम शुरू हो गया है। \n🛠️ *विवरण*: ${notesInput || 'सर्विसिंग की जा रही है।'}\n💰 *अनुमानित खर्च*: ₹${costInput}\n\nलाइव ट्रैक लिंक: http://${window.location.host}/index.html?track=${booking.id}`;
    } else if (statusInput === 'Ready for Delivery') {
      messageText = `*S.D. Hero Service Centre (Patna)*\n\nनमस्ते ${booking.customer_name} जी, खुशखबरी! \nआपकी गाड़ी *${booking.vehicle_brand} ${booking.vehicle_model}* बिल्कुल तैयार हो चुकी है। \n📋 *काम*: ${notesInput || 'सर्विस और ट्यूनिंग पूरी हुई।'}\n💸 *कुल बिल*: ₹${costInput}\n\nकृपया पृथ्वीराज चौक स्थित सर्विस सेंटर आकर अपनी गाड़ी ले जाएं। धन्यवाद!`;
    } else if (statusInput === 'Completed') {
      messageText = `*S.D. Hero Service Centre (Patna)*\n\nनमस्ते ${booking.customer_name} जी,\nहमारी सेवा का लाभ उठाने के लिए बहुत-बहुत धन्यवाद। आशा है कि आपकी गाड़ी शानदार चल रही होगी। सुरक्षित यात्रा करें!`;
    }
  } else { // english
    if (statusInput === 'Pending') {
      messageText = `*S.D. Hero Service Centre (Patna)*\n\nDear ${booking.customer_name},\nWe have successfully registered your service slot for *${booking.vehicle_brand} ${booking.vehicle_model}*. \n📆 *Date*: ${booking.booking_date}\n📍 *Service Centre*: Prithviraj Chowk, Lohanipur, Patna\n\nTrack your vehicle: http://${window.location.host}/index.html?track=${booking.id}`;
    } else if (statusInput === 'In Progress') {
      messageText = `*S.D. Hero Service Centre (Patna)*\n\nHello ${booking.customer_name},\nYour vehicle *${booking.vehicle_brand} ${booking.vehicle_model}* is currently under service. \n🛠️ *Notes*: ${notesInput || 'General maintenance in progress.'}\n💰 *Estimated Cost*: ₹${costInput}\n\nLive tracking: http://${window.location.host}/index.html?track=${booking.id}`;
    } else if (statusInput === 'Ready for Delivery') {
      messageText = `*S.D. Hero Service Centre (Patna)*\n\nHello ${booking.customer_name},\nGreat news! Your vehicle *${booking.vehicle_brand} ${booking.vehicle_model}* is ready for delivery. \n📋 *Service Details*: ${notesInput || 'Tuning and servicing completed.'}\n💸 *Final Bill*: ₹${costInput}\n\nPlease visit our workshop at Lohanipur to collect your ride. Thank you!`;
    } else if (statusInput === 'Completed') {
      messageText = `*S.D. Hero Service Centre (Patna)*\n\nDear ${booking.customer_name},\nThank you for choosing S.D. Hero Service Centre. Drive safe!`;
    }
  }

  const waUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(messageText)}`;
  window.open(waUrl, '_blank');
}

// Generate QR codes dynamically based on local host
function loadQrCodes() {
  const host = window.location.host;
  const protocol = window.location.protocol;
  const customerUrl = `${protocol}//${host}/`;
  const ownerUrl = `${protocol}//${host}/admin.html?autologin=318eklavya`;

  const qrCustomerImg = document.getElementById('qr-customer');
  const qrOwnerImg = document.getElementById('qr-owner');
  const btnOwnerLink = document.getElementById('btn-owner-link');

  if (qrCustomerImg) {
    qrCustomerImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(customerUrl)}`;
  }
  if (qrOwnerImg) {
    qrOwnerImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ownerUrl)}`;
  }
  if (btnOwnerLink) {
    btnOwnerLink.href = ownerUrl;
  }
}

// Walk-in Registration form handler
function initQuickAdd() {
  const form = document.getElementById('quick-add-booking-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('btn-quick-add');
    btn.disabled = true;
    btn.textContent = 'Registering...';

    const todayStr = new Date().toISOString().split('T')[0];

    const bookingData = {
      customerName: document.getElementById('quick-name').value.trim(),
      phone: document.getElementById('quick-phone').value.trim(),
      vehicleBrand: document.getElementById('quick-brand').value,
      vehicleModel: document.getElementById('quick-model').value.trim(),
      serviceType: document.getElementById('quick-service').value,
      bookingDate: todayStr,
      description: 'Walk-in registration at Service Centre Counter.'
    };

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast(`Registered successfully! ID: ${data.bookingId}`, 'success');
        form.reset();
        fetchBookings(); // Reload dashboard entries
      } else {
        showToast(data.error || 'Registration failed.', 'error');
      }
    } catch (err) {
      console.error('Quick add error:', err);
      showToast('Network error during registration.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Register Bike';
    }
  });
}

// Excel/CSV Backup Downloader
function initCSVExport() {
  const btn = document.getElementById('btn-export-csv');
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (allBookings.length === 0) {
      showToast('No booking records to download.', 'error');
      return;
    }

    // Define CSV Headers
    const headers = ['Booking ID', 'Customer Name', 'Phone', 'Brand', 'Model', 'Service Required', 'Status', 'Technician Notes', 'Billing Cost', 'Booking Date', 'Registered At'];
    
    const csvRows = [];
    csvRows.push(headers.join(',')); // Add headers row

    // Iterate items
    allBookings.forEach(b => {
      const row = [
        `"${b.id}"`,
        `"${b.customer_name.replace(/"/g, '""')}"`,
        `"${b.phone}"`,
        `"${b.vehicle_brand}"`,
        `"${b.vehicle_model.replace(/"/g, '""')}"`,
        `"${b.service_type}"`,
        `"${b.status}"`,
        `"${(b.technician_notes || '').replace(/"/g, '""')}"`,
        b.estimated_cost || 0,
        `"${b.booking_date}"`,
        `"${b.created_at}"`
      ];
      csvRows.push(row.join(','));
    });

    // Create file blobbing and click download link
    const csvContent = "\uFEFF" + csvRows.join('\n'); // prepending BOM to support Hindi characters in Excel
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `SD_Hero_Service_Bookings_Backup_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Service Centre database backup downloaded successfully!', 'success');
  });
}

// Fullscreen Click-to-Zoom Lightbox Overlay Setup for Admin Dashboard
function initAdminZoomModal() {
  const modal = document.getElementById('admin-image-zoom-modal');
  const modalImg = document.getElementById('admin-zoom-modal-image');
  const closeBtn = document.getElementById('btn-close-admin-zoom');

  if (!modal || !modalImg || !closeBtn) return;

  closeBtn.addEventListener('click', () => {
    modal.classList.remove('show');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target === closeBtn) {
      modal.classList.remove('show');
    }
  });

  // Global trigger function to open fullscreen modal from card thumbnails
  window.openAdminZoomModal = (imgSrc) => {
    modalImg.src = imgSrc;
    modal.classList.add('show');
  };
}

// Portal tab navigation switcher
function initPortalTabs() {
  const tabBookings = document.getElementById('tab-bookings');
  const tabAnalytics = document.getElementById('tab-analytics');
  
  const statsSection = document.querySelector('.dashboard-stats');
  const filterSection = document.querySelector('.filter-bar');
  const quickAddSection = document.getElementById('quick-add-booking');
  const listSection = document.getElementById('admin-bookings-list').parentNode; // The section containing the list
  const analyticsSection = document.getElementById('analytics-dashboard-panel');

  if (!tabBookings || !tabAnalytics || !analyticsSection) return;

  tabBookings.addEventListener('click', () => {
    tabBookings.classList.add('active');
    tabBookings.style.color = 'var(--accent)';
    tabBookings.style.borderBottom = '2px solid var(--accent)';
    
    tabAnalytics.classList.remove('active');
    tabAnalytics.style.color = 'var(--text-secondary)';
    tabAnalytics.style.borderBottom = '2px solid transparent';

    if (statsSection) statsSection.style.display = 'grid';
    if (filterSection) filterSection.style.display = 'flex';
    if (quickAddSection) quickAddSection.style.display = 'block';
    if (listSection) listSection.style.display = 'block';
    
    analyticsSection.style.display = 'none';
  });

  tabAnalytics.addEventListener('click', () => {
    tabAnalytics.classList.add('active');
    tabAnalytics.style.color = 'var(--accent)';
    tabAnalytics.style.borderBottom = '2px solid var(--accent)';
    
    tabBookings.classList.remove('active');
    tabBookings.style.color = 'var(--text-secondary)';
    tabBookings.style.borderBottom = '2px solid transparent';

    if (statsSection) statsSection.style.display = 'none';
    if (filterSection) filterSection.style.display = 'none';
    if (quickAddSection) quickAddSection.style.display = 'none';
    if (listSection) listSection.style.display = 'none';
    
    analyticsSection.style.display = 'block';

    // Render charts
    renderVisualAnalytics();
  });
}

// Render and update Visual Analytics Charts
function renderVisualAnalytics() {
  if (allBookings.length === 0) return;

  const totalBookings = allBookings.length;
  const completedBookings = allBookings.filter(b => b.status === 'Completed');
  const completedCount = completedBookings.length;
  
  const settledRevenue = completedBookings.reduce((sum, b) => sum + (b.estimated_cost || 0), 0);
  const avgCost = completedCount > 0 ? Math.round(settledRevenue / completedCount) : 0;

  document.getElementById('stat-total-bookings').textContent = totalBookings;
  document.getElementById('stat-completed-bookings').textContent = completedCount;
  document.getElementById('stat-completed-revenue').textContent = `₹${settledRevenue}`;
  document.getElementById('stat-average-ticket').textContent = `₹${avgCost}`;

  const statusCounts = {
    'Pending': 0,
    'In Progress': 0,
    'Ready for Delivery': 0,
    'Completed': 0
  };
  allBookings.forEach(b => {
    if (statusCounts[b.status] !== undefined) {
      statusCounts[b.status]++;
    }
  });

  const brandCounts = {};
  allBookings.forEach(b => {
    const brand = b.vehicle_brand || 'Others';
    brandCounts[brand] = (brandCounts[brand] || 0) + 1;
  });

  const serviceCounts = {};
  allBookings.forEach(b => {
    const svc = b.service_type || 'Other Repairs';
    let label = svc.split('&')[0].trim();
    serviceCounts[label] = (serviceCounts[label] || 0) + 1;
  });

  const loyaltyData = {};
  allBookings.forEach(b => {
    const phone = b.phone;
    if (!loyaltyData[phone]) {
      loyaltyData[phone] = {
        name: b.customer_name,
        completedCount: 0,
        totalBookings: 0,
        model: `${b.vehicle_brand} ${b.vehicle_model}`
      };
    }
    loyaltyData[phone].totalBookings++;
    if (b.status === 'Completed') {
      loyaltyData[phone].completedCount++;
    }
  });

  const sortedCustomers = Object.keys(loyaltyData)
    .map(phone => ({ phone, ...loyaltyData[phone] }))
    .sort((a, b) => b.completedCount - a.completedCount || b.totalBookings - a.totalBookings)
    .slice(0, 5);

  const loyaltyListContainer = document.getElementById('analytics-loyalty-list');
  if (loyaltyListContainer) {
    if (sortedCustomers.length === 0) {
      loyaltyListContainer.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No customer records yet.</p>`;
    } else {
      loyaltyListContainer.innerHTML = sortedCustomers.map((cust, index) => {
        let stars = '★☆☆☆☆';
        let tier = 'Welcome Rider';
        let badgeColor = '#646a78';

        if (cust.completedCount >= 4) {
          stars = '★★★★★';
          tier = 'Gold VIP Rider';
          badgeColor = 'var(--accent)';
        } else if (cust.completedCount >= 2) {
          stars = '★★★☆☆';
          tier = 'Silver Rider';
          badgeColor = 'var(--status-progress)';
        } else if (cust.completedCount >= 1) {
          stars = '★☆☆☆☆';
          tier = 'Bronze Rider';
          badgeColor = '#8a6d3b';
        }

        const rankingEmojis = ['🥇', '🥈', '🥉', '🏍️', '🏍️'];
        const emoji = rankingEmojis[index] || '🏍️';

        return `
          <div style="display: flex; align-items: center; justify-content: space-between; background-color: var(--bg-primary); border: 1px solid var(--border-color); padding: 0.85rem 1.25rem; border-radius: var(--radius-md); transition: border-color var(--transition-fast); text-align: left;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border-color)'">
            <div style="display: flex; align-items: center; gap: 0.85rem;">
              <span style="font-size: 1.3rem;">${emoji}</span>
              <div>
                <h5 style="margin: 0; color: #fff; font-size: 0.95rem; font-weight: 600;">${cust.name}</h5>
                <p style="margin: 0.15rem 0 0 0; font-size: 0.75rem; color: var(--text-secondary);">${cust.phone} • ${cust.model}</p>
              </div>
            </div>
            <div style="text-align: right;">
              <span style="display: inline-block; font-size: 0.72rem; font-weight: 700; color: #fff; background-color: ${badgeColor}; padding: 0.15rem 0.5rem; border-radius: var(--radius-sm); margin-bottom: 0.2rem;">${tier}</span>
              <p style="margin: 0; font-size: 0.78rem; color: var(--accent); font-weight: 600;">${cust.completedCount} Completed</p>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  const ctxStatus = document.getElementById('chart-status-distribution').getContext('2d');
  if (statusChartInstance) statusChartInstance.destroy();
  
  statusChartInstance = new Chart(ctxStatus, {
    type: 'doughnut',
    data: {
      labels: ['Pending', 'In Progress', 'Ready', 'Completed'],
      datasets: [{
        data: [
          statusCounts['Pending'],
          statusCounts['In Progress'],
          statusCounts['Ready for Delivery'],
          statusCounts['Completed']
        ],
        backgroundColor: [
          '#ffc107',
          '#00bcd4',
          '#4caf50',
          '#8bc34a'
        ],
        borderWidth: 2,
        borderColor: '#171921'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#9fa6b5',
            font: { family: 'Inter', size: 11 }
          }
        }
      }
    }
  });

  const ctxBrand = document.getElementById('chart-brand-distribution').getContext('2d');
  if (brandChartInstance) brandChartInstance.destroy();

  const brandLabels = Object.keys(brandCounts);
  const brandData = Object.values(brandCounts);

  brandChartInstance = new Chart(ctxBrand, {
    type: 'bar',
    data: {
      labels: brandLabels,
      datasets: [{
        label: 'Bikes Serviced',
        data: brandData,
        backgroundColor: 'rgba(255, 106, 0, 0.75)',
        borderColor: 'var(--accent)',
        borderWidth: 1.5,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#9fa6b5', font: { family: 'Inter' } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#9fa6b5', stepSize: 1 }
        }
      }
    }
  });

  const ctxService = document.getElementById('chart-service-distribution').getContext('2d');
  if (serviceChartInstance) serviceChartInstance.destroy();

  const serviceLabels = Object.keys(serviceCounts);
  const serviceData = Object.values(serviceCounts);

  serviceChartInstance = new Chart(ctxService, {
    type: 'bar',
    data: {
      labels: serviceLabels,
      datasets: [{
        label: 'Requests',
        data: serviceData,
        backgroundColor: 'rgba(0, 188, 212, 0.75)',
        borderColor: '#00bcd4',
        borderWidth: 1.5,
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#9fa6b5', stepSize: 1 }
        },
        y: {
          grid: { display: false },
          ticks: { color: '#9fa6b5', font: { family: 'Inter' } }
        }
      }
    }
  });
}

