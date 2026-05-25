// ==========================================================================
// SD HERO SERVICE - CLIENT SIDE INTERACTIVE LOGIC
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initHeaderScroll();
  initMobileMenu();
  initEstimator();
  initBookingForm();
  initTracker();
  initDefaultDate();
  initZoomModal();
  initFaqs();
  initSuccessModal();
  initWhatsAppWidget();
});

// Toast Helper
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast-notification');
  const toastMsg = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');
  
  toastMsg.textContent = message;
  
  // Set Icon & Classes
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
  
  // Fade out
  setTimeout(() => {
    toast.classList.remove('show');
  }, 5000);
}

// Header Scroll Effect
function initHeaderScroll() {
  const header = document.getElementById('main-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

// Mobile Menu Toggle
function initMobileMenu() {
  const toggle = document.getElementById('mobile-menu-toggle');
  const nav = document.getElementById('navbar');
  const links = nav.querySelectorAll('a');

  toggle.addEventListener('click', () => {
    nav.classList.toggle('active');
    toggle.classList.toggle('active');
    
    // Animate hamburger to X
    const spans = toggle.querySelectorAll('span');
    if (nav.classList.contains('active')) {
      spans[0].style.transform = 'rotate(45deg) translate(6px, 6px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(6px, -7px)';
    } else {
      spans[0].style.transform = 'none';
      spans[1].style.opacity = '1';
      spans[2].style.transform = 'none';
    }
  });

  // Close menu when clicking link
  links.forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('active');
      const spans = toggle.querySelectorAll('span');
      spans[0].style.transform = 'none';
      spans[1].style.opacity = '1';
      spans[2].style.transform = 'none';
    });
  });
}

// Quick Cost Estimator
function initEstimator() {
  const vehicleSelect = document.getElementById('calc-vehicle');
  const serviceSelect = document.getElementById('calc-service');
  const resultDisplay = document.getElementById('calc-result');

  const pricing = {
    motorcycle: {
      '350': 350,
      '1200': 1200,
      '250': 250,
      '150': 150,
      '120': 120,
      '600': 600
    },
    scooter: {
      '350': 300,
      '1200': 1000,
      '250': 200,
      '150': 120,
      '120': 100,
      '600': 500
    }
  };

  function updateEstimate() {
    const vehicle = vehicleSelect.value;
    const baseCode = serviceSelect.value;
    const finalPrice = pricing[vehicle][baseCode] || 0;
    
    resultDisplay.textContent = `₹${finalPrice}`;
  }

  vehicleSelect.addEventListener('change', updateEstimate);
  serviceSelect.addEventListener('change', updateEstimate);
}

// Set Minimum & Default Date
function initDefaultDate() {
  const dateInput = document.getElementById('bookingDate');
  if (dateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    let mm = today.getMonth() + 1;
    let dd = today.getDate();

    if (mm < 10) mm = '0' + mm;
    if (dd < 10) dd = '0' + dd;

    const formattedToday = `${yyyy}-${mm}-${dd}`;
    dateInput.min = formattedToday;
    dateInput.value = formattedToday;
  }
}

// Booking Form Submission
function initBookingForm() {
  const form = document.getElementById('booking-form');
  if (!form) return;

  const fileInput = document.getElementById('vehicleImageFile');
  const previewContainer = document.getElementById('booking-image-preview-container');
  const previewImage = document.getElementById('booking-image-preview');
  const btnRemove = document.getElementById('btn-remove-image');

  let selectedVehicleBase64 = null;

  // Handle File Input Change (Compress client-side instantly)
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        previewImage.src = '';
        previewContainer.style.display = 'none';
        
        // Show loading state by text hint if wanted, or just run
        const compressedBase64 = await compressAndBase64(file);
        selectedVehicleBase64 = compressedBase64;
        
        previewImage.src = compressedBase64;
        previewContainer.style.display = 'block';
      } catch (err) {
        console.error('Image compression error:', err);
        showToast('Failed to process image. Please try a different photo.', 'error');
        fileInput.value = '';
        selectedVehicleBase64 = null;
      }
    });
  }

  // Handle Remove Image Preview
  if (btnRemove) {
    btnRemove.addEventListener('click', () => {
      if (fileInput) fileInput.value = '';
      selectedVehicleBase64 = null;
      previewImage.src = '';
      previewContainer.style.display = 'none';
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btnSubmit = document.getElementById('btn-submit-booking');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Registering Booking...';

    const bookingData = {
      customerName: document.getElementById('customerName').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      vehicleBrand: document.getElementById('vehicleBrand').value,
      vehicleModel: document.getElementById('vehicleModel').value.trim(),
      serviceType: document.getElementById('serviceType').value,
      bookingDate: document.getElementById('bookingDate').value,
      description: document.getElementById('description').value.trim(),
      vehicleImage: selectedVehicleBase64 // Insert compressed Base64 image
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
        showToast(`Booking Registered! Reference: ${data.bookingId}`, 'success');

        // Populate Success Modal card details
        const modalBookingId = document.getElementById('success-booking-id');
        const modalCustomerName = document.getElementById('success-customer-name');
        const modalVehicleDetails = document.getElementById('success-vehicle-details');
        const modalBookingDate = document.getElementById('success-booking-date');
        const modalServiceType = document.getElementById('success-service-type');

        if (modalBookingId) modalBookingId.textContent = data.bookingId;
        if (modalCustomerName) modalCustomerName.textContent = bookingData.customerName;
        if (modalVehicleDetails) modalVehicleDetails.textContent = `${bookingData.vehicleBrand} ${bookingData.vehicleModel}`;
        if (modalBookingDate) modalBookingDate.textContent = bookingData.bookingDate;
        if (modalServiceType) modalServiceType.textContent = bookingData.serviceType;

        // Build pre-composed confirmation WhatsApp message
        let cleanPhone = bookingData.phone.replace(/\D/g, '');
        if (cleanPhone.length === 10) {
          cleanPhone = '91' + cleanPhone;
        }

        const waMessage = `*S.D. HERO SERVICE CENTRE - BOOKING CONFIRMED* 🏍️\n\nHello *${bookingData.customerName}*,\n\nWe have successfully received your service booking request!\n\n📋 *Booking Details*:\n• *Booking ID*: ${data.bookingId}\n• *Vehicle*: ${bookingData.vehicleBrand} ${bookingData.vehicleModel}\n• *Service*: ${bookingData.serviceType}\n• *Date*: ${bookingData.bookingDate}\n\nOur garage team is reviewing your slot. S.D. Hero will call you back shortly on this phone number to confirm your appointment!\n\nThank you for choosing Patna's premium workshop!\n\n🌐 Track live: https://sdhero-service.onrender.com/?track=${data.bookingId}`;

        const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waMessage)}`;
        
        const waBtn = document.getElementById('btn-whatsapp-confirm');
        if (waBtn) {
          waBtn.href = waUrl;
        }

        // Display Success & WhatsApp modal
        const successModal = document.getElementById('booking-success-modal');
        if (successModal) {
          successModal.classList.add('show');
        }

        form.reset();
        if (previewContainer) previewContainer.style.display = 'none';
        if (previewImage) previewImage.src = '';
        selectedVehicleBase64 = null;
        initDefaultDate();

        // Populate search input in the background so it is primed when they close modal
        const trackerInput = document.getElementById('track-search-input');
        if (trackerInput) {
          trackerInput.value = data.bookingId;
          document.getElementById('btn-track-search').click();
        }
      } else {
        showToast(data.error || 'Failed to submit booking. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Submit booking error:', err);
      showToast('Network error. Please check your internet connection.', 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Submit Booking Request';
    }
  });
}

// Live Vehicle Tracking
function initTracker() {
  const searchBtn = document.getElementById('btn-track-search');
  const searchInput = document.getElementById('track-search-input');
  
  if (!searchBtn || !searchInput) return;

  async function performTracking() {
    const query = searchInput.value.trim();
    if (!query) {
      showToast('Please enter a Booking ID or Phone number.', 'error');
      return;
    }

    const resultsWrapper = document.getElementById('track-results');
    const noResultsWrapper = document.getElementById('track-no-results');

    // Reset view
    resultsWrapper.style.display = 'none';
    noResultsWrapper.style.display = 'none';

    try {
      const response = await fetch(`/api/bookings/track?query=${encodeURIComponent(query)}`);
      const bookings = await response.json();

      if (!response.ok) {
        showToast(bookings.error || 'Failed to fetch tracking data.', 'error');
        return;
      }

      if (bookings.length === 0) {
        noResultsWrapper.style.display = 'block';
        return;
      }

      // Display the latest booking (bookings are sorted by created_at DESC in backend)
      const booking = bookings[0];
      
      // Populate fields
      document.getElementById('res-booking-id').textContent = booking.id;
      document.getElementById('res-booking-date').textContent = booking.booking_date;
      document.getElementById('res-customer-name').textContent = booking.customer_name;
      document.getElementById('res-vehicle-info').textContent = `${booking.vehicle_brand} ${booking.vehicle_model}`;
      document.getElementById('res-service-type').textContent = booking.service_type;
      document.getElementById('res-description').textContent = booking.description || 'No description provided.';
      document.getElementById('res-billing-cost').textContent = `₹${booking.estimated_cost || 0}`;

      // Notes block
      const notesBlock = document.getElementById('res-notes-block');
      const notesText = document.getElementById('res-technician-notes');
      if (booking.technician_notes && booking.technician_notes.trim() !== '') {
        notesText.textContent = booking.technician_notes;
        notesBlock.style.display = 'block';
      } else {
        notesBlock.style.display = 'none';
      }

      // Vehicle Image rendering
      const imageBlock = document.getElementById('res-image-block');
      const vehicleImage = document.getElementById('res-vehicle-image');
      if (booking.vehicle_image && booking.vehicle_image.trim() !== '') {
        vehicleImage.src = booking.vehicle_image;
        imageBlock.style.display = 'block';
        // Open fullscreen on tap/click
        vehicleImage.onclick = () => {
          if (typeof window.openZoomModal === 'function') {
            window.openZoomModal(booking.vehicle_image);
          }
        };
      } else {
        imageBlock.style.display = 'none';
      }

      // Bike Health Diagnostic Report parser
      const healthCard = document.getElementById('res-health-card');
      if (booking.health_report && booking.health_report.trim() !== '') {
        try {
          const health = JSON.parse(booking.health_report);
          populateHealthStatus('health-val-battery', health.battery || 'Good');
          populateHealthStatus('health-val-oil', health.oil || 'Excellent');
          populateHealthStatus('health-val-brakes', health.brakes || 'OK');
          populateHealthStatus('health-val-spark', health.spark || 'Clean');
          populateHealthStatus('health-val-chain', health.chain || 'Lubricated');
          healthCard.style.display = 'block';
        } catch (e) {
          console.error('Failed to parse health report:', e);
          healthCard.style.display = 'none';
        }
      } else {
        healthCard.style.display = 'none';
      }

      // Dynamic Customer Loyalty Rewards calculator
      let totalCompleted = 0;
      try {
        const loyaltyRes = await fetch(`/api/bookings/track?query=${encodeURIComponent(booking.phone)}`);
        const allUserBookings = await loyaltyRes.json();
        totalCompleted = allUserBookings.filter(b => b.status === 'Completed').length;
      } catch (e) {
        console.error('Loyalty count error:', e);
      }

      const loyaltyCard = document.getElementById('res-loyalty-card');
      const tierName = document.getElementById('loyalty-tier-name');
      const loyaltyDesc = document.getElementById('loyalty-desc');
      const starsIcons = document.getElementById('loyalty-stars-icons');

      if (loyaltyCard && tierName && loyaltyDesc && starsIcons) {
        let tier = "Welcome Rider";
        let starsHtml = "★☆☆☆☆";
        let discountMsg = "Keep servicing with us to unlock VIP discounts!";

        if (totalCompleted >= 5) {
          tier = "Gold VIP Rider (Level 3)";
          starsHtml = "★★★★★";
          discountMsg = "Unlocked: 10% OFF Labor + Free Pressure Wash! 🎁";
        } else if (totalCompleted >= 3) {
          tier = "Silver Rider (Level 2)";
          starsHtml = "★★★☆☆";
          discountMsg = "Unlocked: Free Bike Polishing on next service! 🌟";
        } else if (totalCompleted >= 1) {
          tier = "Bronze Rider (Level 1)";
          starsHtml = "★☆☆☆☆";
          discountMsg = "Complete 2 more services to unlock Silver Tier! 🏍️";
        }

        tierName.textContent = tier;
        starsIcons.innerHTML = `<span style="color:#ffd700; text-shadow:0 0 10px rgba(255,215,0,0.5); font-family: sans-serif;">${starsHtml}</span>`;
        document.getElementById('loyalty-count-val').textContent = totalCompleted;
        loyaltyDesc.innerHTML = `Completed services: <strong>${totalCompleted}</strong>. ${discountMsg}`;
        loyaltyCard.style.display = 'flex';
      }

      // WhatsApp chat trigger regarding this specific booking
      const waChatBtn = document.getElementById('btn-whatsapp-chat');
      if (waChatBtn) {
        waChatBtn.onclick = () => {
          const shopPhone = '919334834344'; // Patna shop owner mobile
          const msg = encodeURIComponent(`Hello S.D. Hero Service Centre,\nI have a question about my booking ID: ${booking.id} (${booking.vehicle_brand} ${booking.vehicle_model}).\nMy active service status shows: *${booking.status}*.`);
          window.open(`https://wa.me/${shopPhone}?text=${msg}`, '_blank');
        };
      }

      // Dynamic UPI Payment Widget logic
      const paymentCard = document.getElementById('res-payment-card');
      const paymentAmountBtn = document.getElementById('payment-amount-btn');
      const paymentQrImg = document.getElementById('payment-qr-img');
      const upiBtn = document.getElementById('btn-upi-intent');

      // Show payment card ONLY if status is 'Ready for Delivery' or 'Completed' AND estimated_cost > 0
      if ((booking.status === 'Ready for Delivery' || booking.status === 'Completed') && (booking.estimated_cost && booking.estimated_cost > 0)) {
        paymentAmountBtn.textContent = booking.estimated_cost;
        
        // Dynamic zero-fee Indian UPI parameters
        const shopUpi = '9334834344@ybl'; // Patna shop owner's UPI handle
        const payeeName = encodeURIComponent('S.D. Hero Service');
        const txNote = encodeURIComponent(`Repair bill for booking ${booking.id}`);
        const upiString = `upi://pay?pa=${shopUpi}&pn=${payeeName}&am=${booking.estimated_cost}&cu=INR&tn=${txNote}`;
        
        // Set QR code image using public rendering API
        paymentQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiString)}`;
        
        // Deep-linking intent for mobile redirect (Instant Pay)
        upiBtn.onclick = () => {
          window.location.href = upiString;
        };
        
        paymentCard.style.display = 'block';
      } else {
        paymentCard.style.display = 'none';
      }

      // Update badge
      const statusBadge = document.getElementById('res-status-badge');
      statusBadge.textContent = booking.status;
      
      // Reset classes
      statusBadge.className = 'status-badge';
      
      // Update Timeline Steps & Progress Bar width
      const stepPending = document.getElementById('step-pending');
      const stepInspecting = document.getElementById('step-inspecting');
      const stepProgress = document.getElementById('step-progress');
      const stepReady = document.getElementById('step-ready');
      const stepCompleted = document.getElementById('step-completed');
      const progressBar = document.getElementById('timeline-progress');

      // Clear all active/completed classes
      [stepPending, stepInspecting, stepProgress, stepReady, stepCompleted].forEach(step => {
        step.classList.remove('active', 'completed');
      });

      let progressWidth = '0%';

      switch (booking.status) {
        case 'Pending':
          statusBadge.classList.add('status-pending');
          stepPending.classList.add('active');
          progressWidth = '0%';
          break;
        case 'In Progress':
          statusBadge.classList.add('status-progress');
          stepPending.classList.add('completed');
          stepInspecting.classList.add('completed');
          stepProgress.classList.add('active');
          progressWidth = '50%';
          break;
        case 'Ready for Delivery':
          statusBadge.classList.add('status-ready');
          stepPending.classList.add('completed');
          stepInspecting.classList.add('completed');
          stepProgress.classList.add('completed');
          stepReady.classList.add('active');
          progressWidth = '75%';
          break;
        case 'Completed':
          statusBadge.classList.add('status-completed');
          stepPending.classList.add('completed');
          stepInspecting.classList.add('completed');
          stepProgress.classList.add('completed');
          stepReady.classList.add('completed');
          stepCompleted.classList.add('completed');
          progressWidth = '100%';
          break;
        default:
          statusBadge.classList.add('status-pending');
          stepPending.classList.add('active');
          progressWidth = '0%';
      }

      // Apply width
      progressBar.style.width = progressWidth;
      
      // Make tracker info visible
      resultsWrapper.style.display = 'block';
    } catch (err) {
      console.error('Tracking query error:', err);
      showToast('Network error fetching tracking status.', 'error');
    }
  }

  searchBtn.addEventListener('click', performTracking);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performTracking();
    }
  });

  // Auto-trigger if 'track' parameter is present in the URL query string
  const urlParams = new URLSearchParams(window.location.search);
  const autoTrackId = urlParams.get('track');
  if (autoTrackId) {
    searchInput.value = autoTrackId.trim();
    performTracking();
    // Scroll to tracker
    setTimeout(() => {
      document.getElementById('track').scrollIntoView({ behavior: 'smooth' });
    }, 300);
  }
}

// Client-side Image compression helper using HTML5 Canvas
function compressAndBase64(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Downscale while maintaining proportions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas image to Base64 JPEG string
        const base64Data = canvas.toDataURL('image/jpeg', quality);
        resolve(base64Data);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

// Interactive click-to-zoom fullscreen lightbox setup
function initZoomModal() {
  const modal = document.getElementById('image-zoom-modal');
  const modalImg = document.getElementById('zoom-modal-image');
  const closeBtn = document.getElementById('btn-close-zoom');

  if (!modal || !modalImg || !closeBtn) return;

  closeBtn.addEventListener('click', () => {
    modal.classList.remove('show');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target === closeBtn) {
      modal.classList.remove('show');
    }
  });

  // Global trigger function to open zoom window from any thumbnail
  window.openZoomModal = (imgSrc) => {
    modalImg.src = imgSrc;
    modal.classList.add('show');
  };
}

// Collapsible FAQs Accordion toggler logic
function initFaqs() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const header = item.querySelector('.faq-header');
    if (header) {
      header.addEventListener('click', () => {
        faqItems.forEach(otherItem => {
          if (otherItem !== item) {
            otherItem.classList.remove('active');
          }
        });
        item.classList.toggle('active');
      });
    }
  });
}

// Colored highlights based on health diagnostics status
function populateHealthStatus(elemId, status) {
  const elem = document.getElementById(elemId);
  if (!elem) return;
  elem.textContent = status;
  
  elem.className = 'health-status-badge';
  
  const goodTerms = ['good', 'excellent', 'ok', 'healthy', 'lubricated', 'clean', 'tight', 'adjusted'];
  const dangerTerms = ['replace', 'worn', 'bad', 'blackened', 'danger'];
  const statusLower = status.toLowerCase();
  
  if (goodTerms.some(term => statusLower.includes(term))) {
    elem.classList.add('health-good');
  } else if (dangerTerms.some(term => statusLower.includes(term))) {
    elem.classList.add('health-danger');
  } else {
    elem.classList.add('health-caution');
  }
}

// Interactive Booking Success Modal Toggler & Scroller
function initSuccessModal() {
  const modal = document.getElementById('booking-success-modal');
  const closeBtn = document.getElementById('btn-close-success');

  if (!modal || !closeBtn) return;

  function closeAndScroll() {
    modal.classList.remove('show');
    // Smooth scroll to tracker section
    const trackSection = document.getElementById('track');
    if (trackSection) {
      trackSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  closeBtn.addEventListener('click', closeAndScroll);

  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target === closeBtn) {
      closeAndScroll();
    }
  });
}

// Direct WhatsApp Floating Bubble Widget (Auto-hide Badge on click)
function initWhatsAppWidget() {
  const waBtn = document.getElementById('whatsapp-float-btn');
  if (!waBtn) return;

  waBtn.addEventListener('click', () => {
    const badge = document.getElementById('wa-badge-notif');
    if (badge) {
      badge.style.display = 'none';
    }
  });
}

