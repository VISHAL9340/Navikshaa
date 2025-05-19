const API_URL = 'http://localhost:3000';
const slotsDiv = document.getElementById('slots');
const messageDiv = document.getElementById('message');
const bookingForm = document.getElementById('booking-form');
const formBook = document.getElementById('form-book');
const nameInput = document.getElementById('name');
const slotTimeSpan = document.getElementById('slot-time');
const closeModal = document.getElementById('close-modal');
let currentSlotTime = '';
let currentUser = null;

// Check if user is logged in
function checkAuth() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
  if (!user || !user.token) {
    // Not logged in, redirect to login page
    window.location.href = 'login.html';
    return false;
  }
  
  currentUser = user;
  return true;
}

function showMessage(msg, success = true) {
  messageDiv.textContent = msg;
  messageDiv.style.color = success ? '#34c759' : '#ff3b30';
  setTimeout(() => { messageDiv.textContent = ''; }, 2500);
}

function fetchSlots() {
  fetch(`${API_URL}/slots`, {
    headers: {
      'Authorization': `Bearer ${currentUser.token}`
    }
  })
    .then(res => {
      if (res.status === 401) {
        // Unauthorized, redirect to login
        localStorage.removeItem('user');
        window.location.href = 'login.html';
        throw new Error('Unauthorized');
      }
      return res.json();
    })
    .then(renderSlots)
    .catch((error) => {
      if (error.message !== 'Unauthorized') {
        showMessage('Failed to load slots.', false);
      }
    });
}

function renderSlots(slots) {
  slotsDiv.innerHTML = '';
  slots.forEach(slot => {
    const slotDiv = document.createElement('div');
    slotDiv.className = 'slot ' + (slot.booked ? 'booked' : 'available');
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'time';
    timeDiv.textContent = slot.time;
    slotDiv.appendChild(timeDiv);
    
    if (slot.booked) {
      const nameDiv = document.createElement('div');
      nameDiv.className = 'name';
      nameDiv.textContent = `Booked by: ${slot.name}`;
      slotDiv.appendChild(nameDiv);
      
      // Show who booked it (username)
      if (slot.bookedBy) {
        const bookedByDiv = document.createElement('div');
        bookedByDiv.className = 'booked-by';
        bookedByDiv.textContent = `(${slot.bookedBy})`;
        slotDiv.appendChild(bookedByDiv);
      }
      
      // Only show cancel button if current user booked it or is admin
      if (!slot.bookedBy || slot.bookedBy === currentUser.username || currentUser.username === 'admin') {
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'cancel';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = () => cancelSlot(slot.time);
        slotDiv.appendChild(cancelBtn);
      }
    } else {
      const bookBtn = document.createElement('button');
      bookBtn.className = 'book';
      bookBtn.textContent = 'Book';
      bookBtn.onclick = () => openBookingModal(slot.time);
      slotDiv.appendChild(bookBtn);
    }
    
    slotsDiv.appendChild(slotDiv);
  });
}

function openBookingModal(time) {
  currentSlotTime = time;
  slotTimeSpan.textContent = time;
  nameInput.value = '';
  bookingForm.classList.remove('hidden');
  nameInput.focus();
}

function closeBookingModal() {
  bookingForm.classList.add('hidden');
}

formBook.onsubmit = function(e) {
  e.preventDefault();
  const name = nameInput.value.trim();
  if (!name) {
    showMessage('Please enter your name.', false);
    return;
  }
  fetch(`${API_URL}/book`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentUser.token}`
    },
    body: JSON.stringify({ name, time: currentSlotTime })
  })
    .then(res => {
      if (res.status === 401) {
        // Unauthorized, redirect to login
        localStorage.removeItem('user');
        window.location.href = 'login.html';
        throw new Error('Unauthorized');
      }
      return res.json();
    })
    .then(data => {
      if (data.success) {
        showMessage('Slot booked successfully!');
        closeBookingModal();
        fetchSlots();
      } else {
        showMessage(data.message, false);
      }
    })
    .catch((error) => {
      if (error.message !== 'Unauthorized') {
        showMessage('Booking failed.', false);
      }
    });
};

function cancelSlot(time) {
  if (!confirm('Cancel this booking?')) return;
  fetch(`${API_URL}/cancel`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentUser.token}`
    },
    body: JSON.stringify({ time })
  })
    .then(res => {
      if (res.status === 401) {
        // Unauthorized, redirect to login
        localStorage.removeItem('user');
        window.location.href = 'login.html';
        throw new Error('Unauthorized');
      }
      return res.json();
    })
    .then(data => {
      if (data.success) {
        showMessage('Booking cancelled.');
        fetchSlots();
      } else {
        showMessage(data.message, false);
      }
    })
    .catch((error) => {
      if (error.message !== 'Unauthorized') {
        showMessage('Cancel failed.', false);
      }
    });
}

closeModal.onclick = closeBookingModal;
window.onclick = function(e) {
  if (e.target === bookingForm) closeBookingModal();
};

document.addEventListener('DOMContentLoaded', () => {
  // Check if user is logged in
  if (checkAuth()) {
    // Add logout button to the page
    const container = document.querySelector('.container');
    const header = document.createElement('div');
    header.className = 'header';
    header.innerHTML = `
      <div class="user-info">Logged in as: <span>${currentUser.username}</span></div>
      <button id="logout-btn">Logout</button>
    `;
    container.insertBefore(header, container.firstChild);
    
    // Add event listener to logout button
    document.getElementById('logout-btn').addEventListener('click', () => {
      localStorage.removeItem('user');
      window.location.href = 'login.html';
    });
    
    // Fetch slots
    fetchSlots();
  }
});