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
      description: document.getElementById('description').value.trim()
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
        showToast(`Booking Successful! Your ID: ${data.bookingId}`, 'success');
        form.reset();
        initDefaultDate();

        // Automatically populate tracker and scroll
        const trackerInput = document.getElementById('track-search-input');
        if (trackerInput) {
          trackerInput.value = data.bookingId;
          // Trigger tracker search
          document.getElementById('btn-track-search').click();
          // Smooth scroll to tracker section
          document.getElementById('track').scrollIntoView({ behavior: 'smooth' });
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

