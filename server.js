const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Simple in-memory user storage
const users = [];

// Simple token generation
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Simple token storage
const tokens = {};

// Mock time slots: 10 AM to 5 PM (1-hr intervals)
const slots = [
  { time: '10:00 AM', booked: false, name: '' },
  { time: '11:00 AM', booked: false, name: '' },
  { time: '12:00 PM', booked: false, name: '' },
  { time: '1:00 PM', booked: false, name: '' },
  { time: '2:00 PM', booked: false, name: '' },
  { time: '3:00 PM', booked: false, name: '' },
  { time: '4:00 PM', booked: false, name: '' },
  { time: '5:00 PM', booked: false, name: '' }
];

// GET /slots - Return list of time slots with booking status
app.get('/slots', authenticate, (req, res) => {
  res.json(slots);
});

// POST /book - Book a slot (send name and time)
app.post('/book', authenticate, (req, res) => {
  const { name, time } = req.body;
  
  if (!name || !time) {
    return res.status(400).json({ success: false, message: 'Name and time are required.' });
  }
  
  const slot = slots.find(s => s.time === time);
  
  if (!slot) {
    return res.status(404).json({ success: false, message: 'Slot not found.' });
  }
  
  if (slot.booked) {
    return res.status(400).json({ success: false, message: 'Slot already booked.' });
  }
  
  slot.booked = true;
  slot.name = name;
  slot.bookedBy = req.user.username; // Store who booked the slot
  
  res.json({ success: true, message: 'Slot booked successfully.' });
});

// POST /cancel - Cancel a booking (send time slot)
app.post('/cancel', authenticate, (req, res) => {
  const { time } = req.body;
  
  if (!time) {
    return res.status(400).json({ success: false, message: 'Time is required.' });
  }
  
  const slot = slots.find(s => s.time === time);
  
  if (!slot) {
    return res.status(404).json({ success: false, message: 'Slot not found.' });
  }
  
  if (!slot.booked) {
    return res.status(400).json({ success: false, message: 'Slot is not booked.' });
  }
  
  // Only allow the user who booked the slot or admin to cancel
  if (slot.bookedBy !== req.user.username && req.user.username !== 'admin') {
    return res.status(403).json({ success: false, message: 'You can only cancel your own bookings.' });
  }
  
  slot.booked = false;
  slot.name = '';
  slot.bookedBy = '';
  
  res.json({ success: true, message: 'Booking cancelled.' });
});

// Register endpoint
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username and password are required' 
    });
  }
  
  // Check if username already exists
  if (users.some(user => user.username === username)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username already exists' 
    });
  }
  
  // Hash the password (in a real app, use bcrypt)
  const hashedPassword = crypto
    .createHash('sha256')
    .update(password)
    .digest('hex');
  
  // Store the user
  users.push({
    username,
    password: hashedPassword
  });
  
  res.json({ 
    success: true, 
    message: 'Registration successful' 
  });
});

// Login endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Username and password are required' 
    });
  }
  
  // Find the user
  const user = users.find(user => user.username === username);
  
  if (!user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid username or password' 
    });
  }
  
  // Hash the provided password and compare
  const hashedPassword = crypto
    .createHash('sha256')
    .update(password)
    .digest('hex');
  
  if (user.password !== hashedPassword) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid username or password' 
    });
  }
  
  // Generate a token
  const token = generateToken();
  
  // Store the token
  tokens[token] = {
    username,
    created: Date.now()
  };
  
  res.json({ 
    success: true, 
    message: 'Login successful', 
    username,
    token 
  });
});

// Verify token endpoint
app.post('/verify-token', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ valid: false });
  }
  
  const token = authHeader.split(' ')[1];
  
  if (!tokens[token]) {
    return res.json({ valid: false });
  }
  
  // Check if token is expired (24 hours)
  const tokenData = tokens[token];
  const now = Date.now();
  const tokenAge = now - tokenData.created;
  const tokenMaxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  if (tokenAge > tokenMaxAge) {
    delete tokens[token];
    return res.json({ valid: false });
  }
  
  res.json({ 
    valid: true, 
    username: tokenData.username 
  });
});

// Middleware to check authentication
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  if (!tokens[token]) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
  
  // Check if token is expired (24 hours)
  const tokenData = tokens[token];
  const now = Date.now();
  const tokenAge = now - tokenData.created;
  const tokenMaxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  if (tokenAge > tokenMaxAge) {
    delete tokens[token];
    return res.status(401).json({ 
      success: false, 
      message: 'Token expired' 
    });
  }
  
  // Add user to request
  req.user = {
    username: tokenData.username
  };
  
  next();
}

// Serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve the login.html file
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});