const API_URL = 'http://localhost:3000';
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginCard = document.querySelector('.login-card');
const registerCard = document.querySelector('.register-card');
const registerToggle = document.getElementById('register-toggle');
const loginToggle = document.getElementById('login-toggle');
const loginMessage = document.getElementById('login-message');
const registerMessage = document.getElementById('register-message');

// Toggle between login and register forms
registerToggle.addEventListener('click', (e) => {
  e.preventDefault();
  loginCard.classList.add('hidden');
  registerCard.classList.remove('hidden');
});

loginToggle.addEventListener('click', (e) => {
  e.preventDefault();
  registerCard.classList.add('hidden');
  loginCard.classList.remove('hidden');
});

// Show message function
function showMessage(element, message, isSuccess) {
  element.textContent = message;
  element.className = isSuccess ? 'success' : 'error';
  setTimeout(() => {
    element.textContent = '';
    element.className = '';
  }, 3000);
}

// Handle login form submission
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  
  if (!username || !password) {
    showMessage(loginMessage, 'Please enter both username and password', false);
    return;
  }
  
  fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Store user info in localStorage
      localStorage.setItem('user', JSON.stringify({
        username: data.username,
        token: data.token
      }));
      
      // Redirect to booking page
      window.location.href = 'index.html';
    } else {
      showMessage(loginMessage, data.message || 'Login failed', false);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    showMessage(loginMessage, 'An error occurred. Please try again.', false);
  });
});

// Handle register form submission
registerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirmPassword = document.getElementById('reg-confirm-password').value;
  
  if (!username || !password || !confirmPassword) {
    showMessage(registerMessage, 'Please fill in all fields', false);
    return;
  }
  
  if (password !== confirmPassword) {
    showMessage(registerMessage, 'Passwords do not match', false);
    return;
  }
  
  fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showMessage(registerMessage, 'Registration successful! You can now login.', true);
      
      // Clear form fields
      document.getElementById('reg-username').value = '';
      document.getElementById('reg-password').value = '';
      document.getElementById('reg-confirm-password').value = '';
      
      // Switch to login form after a delay
      setTimeout(() => {
        registerCard.classList.add('hidden');
        loginCard.classList.remove('hidden');
      }, 2000);
    } else {
      showMessage(registerMessage, data.message || 'Registration failed', false);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    showMessage(registerMessage, 'An error occurred. Please try again.', false);
  });
});

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
  if (user && user.token) {
    // Verify token validity with the server
    fetch(`${API_URL}/verify-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.valid) {
        // Token is valid, redirect to booking page
        window.location.href = 'index.html';
      } else {
        // Token is invalid, clear localStorage
        localStorage.removeItem('user');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      // In case of error, stay on login page
    });
  }
});