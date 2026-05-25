import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

let dbInstance = null;
let isPostgres = false;

// Convert SQLite '?' placeholders to PostgreSQL '$1, $2'
function convertSql(sql) {
  if (!isPostgres) return sql;
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

class PostgresWrapper {
  constructor(pool) {
    this.pool = pool;
  }

  async exec(sql) {
    await this.pool.query(sql);
  }

  async run(sql, params = []) {
    const pgSql = convertSql(sql);
    const result = await this.pool.query(pgSql, params);
    return {
      lastID: null,
      changes: result.rowCount
    };
  }

  async get(sql, params = []) {
    const pgSql = convertSql(sql);
    const result = await this.pool.query(pgSql, params);
    return result.rows[0];
  }

  async all(sql, params = []) {
    const pgSql = convertSql(sql);
    const result = await this.pool.query(pgSql, params);
    return result.rows;
  }
}

export async function getDb() {
  if (dbInstance) return dbInstance;

  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    console.log('🔌 Connecting to cloud PostgreSQL database...');
    isPostgres = true;
    const pool = new Pool({
      connectionString: connectionString,
      ssl: {
        rejectUnauthorized: false // Required for Render/Neon SSL connections
      }
    });
    
    // Warm up connection
    await pool.query('SELECT NOW()');
    console.log('✓ Cloud PostgreSQL connected successfully!');
    
    dbInstance = new PostgresWrapper(pool);
  } else {
    console.log('🔌 Connecting to local SQLite database...');
    isPostgres = false;
    const dbPath = path.join(__dirname, 'database.sqlite');
    const sqliteDb = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    dbInstance = sqliteDb;
  }

  await initSchema(dbInstance);
  return dbInstance;
}

async function initSchema(db) {
  // Create bookings table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id VARCHAR(50) PRIMARY KEY,
      customer_name VARCHAR(100) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      vehicle_brand VARCHAR(50) NOT NULL,
      vehicle_model VARCHAR(50) NOT NULL,
      service_type VARCHAR(100) NOT NULL,
      description TEXT,
      booking_date VARCHAR(20) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'Pending',
      technician_notes TEXT,
      estimated_cost REAL DEFAULT 0,
      vehicle_image TEXT,
      health_report TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Safe migration to add vehicle_image column if database was already built previously
  try {
    await db.exec(`ALTER TABLE bookings ADD COLUMN vehicle_image TEXT`);
    console.log('✓ Migration: Added vehicle_image column to bookings table');
  } catch (e) {
    // Column already exists or table doesn't support it, ignore
  }

  // Safe migration to add health_report column if database was already built previously
  try {
    await db.exec(`ALTER TABLE bookings ADD COLUMN health_report TEXT`);
    console.log('✓ Migration: Added health_report column to bookings table');
  } catch (e) {
    // Column already exists or table doesn't support it, ignore
  }

  // Create admins table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      username VARCHAR(50) PRIMARY KEY,
      password_hash VARCHAR(255) NOT NULL
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
  if (bookingCount && parseInt(bookingCount.count) === 0) {
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
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'SDH-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
