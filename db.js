import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect if running on Render (which defines process.env.RENDER) and use a persistent volume path
const dbDir = process.env.RENDER ? '/data' : __dirname;
const dbPath = path.join(dbDir, 'database.sqlite');

let dbConnection = null;

export async function getDb() {
  if (dbConnection) return dbConnection;

  dbConnection = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await initSchema(dbConnection);
  return dbConnection;
}

async function initSchema(db) {
  // Create bookings table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      vehicle_brand TEXT NOT NULL,
      vehicle_model TEXT NOT NULL,
      service_type TEXT NOT NULL,
      description TEXT,
      booking_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      technician_notes TEXT,
      estimated_cost REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create admins table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL
    )
  `);

  // Seed default admin
  const adminUser = 'eklavya434';
  const adminPass = process.env.ADMIN_PASSWORD || '318eklavya';
  
  const existingAdmin = await db.get('SELECT * FROM admins WHERE username = ?', [adminUser]);
  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(adminPass, salt);
    await db.run('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [adminUser, hash]);
    console.log(`Default admin seeded: username='eklavya434', password='${adminPass}'`);
  }

  // Seed sample bookings only if bookings table is empty
  const bookingCount = await db.get('SELECT COUNT(*) as count FROM bookings');
  if (bookingCount.count === 0) {
    const sampleBookings = [
      {
        id: 'SDH-W8A9B2',
        customer_name: 'Amit Kumar',
        phone: '9876543210',
        vehicle_brand: 'Hero',
        vehicle_model: 'Splendor Plus',
        service_type: 'General Service & Engine Tuning',
        description: 'Engine making light clicking noise, oil change needed, brakes loose.',
        booking_date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // yesterday
        status: 'In Progress',
        technician_notes: 'Drained engine oil. Replacing with Hero premium oil. Adjusting front & rear brakes.',
        estimated_cost: 650
      },
      {
        id: 'SDH-P2K5X8',
        customer_name: 'Rahul Singh',
        phone: '9334834344',
        vehicle_brand: 'Honda',
        vehicle_model: 'Activa 6G',
        service_type: 'Brake & Suspension Repair',
        description: 'Front shock absorbers feel stiff, squeaking noise on front brakes.',
        booking_date: new Date().toISOString().split('T')[0], // today
        status: 'Pending',
        technician_notes: '',
        estimated_cost: 450
      },
      {
        id: 'SDH-T7Y9M4',
        customer_name: 'Vikram Aditya',
        phone: '9988776655',
        vehicle_brand: 'TVS',
        vehicle_model: 'Apache RTR 160',
        service_type: 'Electrical & General Checkup',
        description: 'Self start motor not working intermittently, indicator light broken.',
        booking_date: new Date().toISOString().split('T')[0], // today
        status: 'Ready for Delivery',
        technician_notes: 'Replaced self-start relay. Indicator bulb replaced. Battery health checked - OK.',
        estimated_cost: 850
      }
    ];

    for (const b of sampleBookings) {
      await db.run(
        `INSERT INTO bookings (id, customer_name, phone, vehicle_brand, vehicle_model, service_type, description, booking_date, status, technician_notes, estimated_cost)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [b.id, b.customer_name, b.phone, b.vehicle_brand, b.vehicle_model, b.service_type, b.description, b.booking_date, b.status, b.technician_notes, b.estimated_cost]
      );
    }
    console.log('Seeded initial sample bookings for testing.');
  }
}

export function generateBookingId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid easily confused chars like I, O, 0, 1
  let result = 'SDH-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

