import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, generateBookingId } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_sdhero_patna';

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Admin authentication middleware
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Token missing.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

// ----------------------------------------------------
// CUSTOMER APIS
// ----------------------------------------------------

// 1. Submit a booking request
app.post('/api/bookings', async (req, res) => {
  try {
    const { customerName, phone, vehicleBrand, vehicleModel, serviceType, description, bookingDate, vehicleImage } = req.body;

    if (!customerName || !phone || !vehicleBrand || !vehicleModel || !serviceType || !bookingDate) {
      return res.status(400).json({ error: 'All fields except description are required.' });
    }

    const db = await getDb();
    const id = generateBookingId();

    await db.run(
      `INSERT INTO bookings (id, customer_name, phone, vehicle_brand, vehicle_model, service_type, description, booking_date, vehicle_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, customerName, phone, vehicleBrand, vehicleModel, serviceType, description || '', bookingDate, vehicleImage || null]
    );

    res.status(201).json({
      success: true,
      message: 'Booking request registered successfully.',
      bookingId: id
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to register booking request. Please try again later.' });
  }
});

// 2. Track booking status
app.get('/api/bookings/track', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Tracking query (Booking ID or Phone) is required.' });
    }

    const db = await getDb();
    const trimmedQuery = query.trim();

    let bookings = [];
    if (trimmedQuery.toUpperCase().startsWith('SDH-')) {
      // Find single booking by ID
      const booking = await db.get('SELECT * FROM bookings WHERE UPPER(id) = ?', [trimmedQuery.toUpperCase()]);
      if (booking) {
        bookings.push(booking);
      }
    } else {
      // Find bookings by phone number (match exact or suffix to support Indian country code formats)
      bookings = await db.all(
        'SELECT * FROM bookings WHERE phone = ? OR phone LIKE ? ORDER BY created_at DESC', 
        [trimmedQuery, `%${trimmedQuery}`]
      );
    }

    res.json(bookings);
  } catch (error) {
    console.error('Error tracking booking:', error);
    res.status(500).json({ error: 'Failed to retrieve tracking info.' });
  }
});

// ----------------------------------------------------
// ADMIN APIS
// ----------------------------------------------------

// Autologin by scan key
app.get('/api/admin/autologin', async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) {
      return res.status(400).json({ error: 'Autologin key required.' });
    }

    const defaultPass = process.env.ADMIN_PASSWORD || '318eklavya';
    if (key === defaultPass) {
      const token = jwt.sign({ username: 'eklavya434' }, JWT_SECRET, { expiresIn: '30d' }); // 30 days session
      return res.json({ success: true, token });
    }

    res.status(401).json({ error: 'Invalid autologin key.' });
  } catch (error) {
    console.error('Autologin error:', error);
    res.status(500).json({ error: 'Server error during autologin.' });
  }
});

// 3. Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const db = await getDb();
    const admin = await db.get('SELECT * FROM admins WHERE username = ?', [username]);

    if (!admin) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const validPassword = await bcrypt.compare(password, admin.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign({ username: admin.username }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed due to a server error.' });
  }
});

// 4. Retrieve all bookings (Admin only)
app.get('/api/admin/bookings', authenticateAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const bookings = await db.all('SELECT * FROM bookings ORDER BY created_at DESC');
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings.' });
  }
});

// 5. Update a booking status and notes (Admin only)
app.put('/api/admin/bookings/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, technician_notes, estimated_cost, health_report } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    const db = await getDb();
    const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [id]);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    await db.run(
      `UPDATE bookings 
       SET status = ?, technician_notes = ?, estimated_cost = ?, health_report = ?
       WHERE id = ?`,
      [status, technician_notes || '', estimated_cost || 0, health_report || null, id]
    );

    res.json({ success: true, message: 'Booking updated successfully.' });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ error: 'Failed to update booking.' });
  }
});

// Initialize DB and start listening
try {
  const db = await getDb();
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  🏍️  SD HERO SERVICE Service Centre API RUNNING ON PORT ${PORT}`);
    console.log(`  🌐  Local URL: http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
} catch (err) {
  console.error('Database connection failed. Server cannot start.', err);
  process.exit(1);
}

