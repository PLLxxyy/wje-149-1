import Database, { type Database as SqliteDatabase } from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const dbPath = path.join(__dirname, '..', 'driving_school.db');
const db: SqliteDatabase = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('coach', 'student', 'admin')),
      phone TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coach_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      driving_years INTEGER DEFAULT 0,
      rating REAL DEFAULT 5.0,
      rating_count INTEGER DEFAULT 0,
      description TEXT DEFAULT '',
      total_students INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      coach_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
      time_slot TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (coach_id) REFERENCES users(id),
      UNIQUE(coach_id, day_of_week, time_slot)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      coach_id TEXT NOT NULL,
      schedule_id TEXT NOT NULL,
      booking_date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'completed', 'cancelled')),
      student_signed INTEGER DEFAULT 0,
      coach_signed INTEGER DEFAULT 0,
      hours_earned INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (student_id) REFERENCES users(id),
      FOREIGN KEY (coach_id) REFERENCES users(id),
      FOREIGN KEY (schedule_id) REFERENCES schedules(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      reviewer_id TEXT NOT NULL,
      reviewee_id TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (booking_id) REFERENCES bookings(id),
      FOREIGN KEY (reviewer_id) REFERENCES users(id),
      FOREIGN KEY (reviewee_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS student_hours (
      id TEXT PRIMARY KEY,
      student_id TEXT UNIQUE NOT NULL,
      total_hours INTEGER DEFAULT 20,
      used_hours INTEGER DEFAULT 0,
      FOREIGN KEY (student_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS hour_adjustments (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      admin_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('recharge', 'deduct')),
      hours INTEGER NOT NULL,
      before_total INTEGER NOT NULL,
      after_total INTEGER NOT NULL,
      reason TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (student_id) REFERENCES users(id),
      FOREIGN KEY (admin_id) REFERENCES users(id)
    );
  `);

  seedData();
}

function seedData(): void {
  const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (existingAdmin) return;

  const hash = bcrypt.hashSync('123456', 10);

  const adminId = uuidv4();
  const coachId = uuidv4();
  const studentId = uuidv4();

  db.prepare('INSERT INTO users (id, username, password, name, role, phone) VALUES (?, ?, ?, ?, ?, ?)')
    .run(adminId, 'admin', hash, '系统管理员', 'admin', '13800000001');

  db.prepare('INSERT INTO users (id, username, password, name, role, phone) VALUES (?, ?, ?, ?, ?, ?)')
    .run(coachId, 'coach', hash, '张教练', 'coach', '13800000002');

  db.prepare('INSERT INTO users (id, username, password, name, role, phone) VALUES (?, ?, ?, ?, ?, ?)')
    .run(studentId, 'student', hash, '李同学', 'student', '13800000003');

  db.prepare('INSERT INTO coach_profiles (id, user_id, driving_years, rating, rating_count, description, total_students) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(uuidv4(), coachId, 8, 4.8, 0, '资深驾校教练，教学经验丰富，耐心细致，擅长科目二和科目三教学。', 0);

  // Add a second coach
  const coach2Id = uuidv4();
  db.prepare('INSERT INTO users (id, username, password, name, role, phone) VALUES (?, ?, ?, ?, ?, ?)')
    .run(coach2Id, 'coach2', hash, '王教练', 'coach', '13800000004');
  db.prepare('INSERT INTO coach_profiles (id, user_id, driving_years, rating, rating_count, description, total_students) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(uuidv4(), coach2Id, 12, 4.9, 0, '金牌教练，通过率极高，教学风格严谨，因材施教。', 0);

  // Seed schedules for coaches
  const timeSlots = ['08:00-09:00', '09:00-10:00', '10:00-11:00', '14:00-15:00', '15:00-16:00', '16:00-17:00'];
  for (let day = 1; day <= 5; day++) {
    for (const slot of timeSlots) {
      db.prepare('INSERT INTO schedules (id, coach_id, day_of_week, time_slot, is_active) VALUES (?, ?, ?, ?, ?)')
        .run(uuidv4(), coachId, day, slot, 1);
      db.prepare('INSERT INTO schedules (id, coach_id, day_of_week, time_slot, is_active) VALUES (?, ?, ?, ?, ?)')
        .run(uuidv4(), coach2Id, day, slot, 1);
    }
  }

  // Seed student hours
  db.prepare('INSERT INTO student_hours (id, student_id, total_hours, used_hours) VALUES (?, ?, ?, ?)')
    .run(uuidv4(), studentId, 20, 0);
}

initDb();

export default db;
