import { Router, Response } from 'express';
import db from '../db';
import { authMiddleware, roleGuard } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

router.get('/stats', authMiddleware, roleGuard('admin'), (_req: AuthRequest, res: Response) => {
  try {
    const coachCount = (db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'coach'").get() as any).cnt;
    const studentCount = (db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'student'").get() as any).cnt;
    const totalBookings = (db.prepare('SELECT COUNT(*) as cnt FROM bookings').get() as any).cnt;
    const completedBookings = (db.prepare("SELECT COUNT(*) as cnt FROM bookings WHERE status = 'completed'").get() as any).cnt;
    const pendingBookings = (db.prepare("SELECT COUNT(*) as cnt FROM bookings WHERE status = 'pending'").get() as any).cnt;
    const confirmedBookings = (db.prepare("SELECT COUNT(*) as cnt FROM bookings WHERE status = 'confirmed'").get() as any).cnt;
    const cancelledBookings = (db.prepare("SELECT COUNT(*) as cnt FROM bookings WHERE status = 'cancelled'").get() as any).cnt;

    const totalSchedules = (db.prepare('SELECT COUNT(*) as cnt FROM schedules WHERE is_active = 1').get() as any).cnt;
    const activeBookings = (db.prepare("SELECT COUNT(*) as cnt FROM bookings WHERE status IN ('pending', 'confirmed')").get() as any).cnt;
    const bookingRate = totalSchedules > 0 ? Math.round((activeBookings / totalSchedules) * 100) : 0;

    // Coach ranking
    const coachRanking = db.prepare(`
      SELECT u.name, cp.rating, cp.total_students, cp.driving_years,
        (SELECT COUNT(*) FROM bookings WHERE coach_id = u.id AND status = 'completed') as completed_lessons
      FROM users u
      JOIN coach_profiles cp ON u.id = cp.user_id
      WHERE u.role = 'coach'
      ORDER BY cp.total_students DESC
    `).all();

    // Daily booking stats (last 7 days)
    const dailyStats = db.prepare(`
      SELECT booking_date as date, COUNT(*) as count
      FROM bookings
      WHERE booking_date >= date('now', '-7 days')
      GROUP BY booking_date
      ORDER BY booking_date
    `).all();

    res.json({
      coachCount,
      studentCount,
      totalBookings,
      completedBookings,
      pendingBookings,
      confirmedBookings,
      cancelledBookings,
      bookingRate,
      totalSchedules,
      coachRanking,
      dailyStats,
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ message: '获取统计数据失败' });
  }
});

router.get('/students', authMiddleware, roleGuard('admin'), (_req: AuthRequest, res: Response) => {
  try {
    const students = db.prepare(`
      SELECT u.id, u.name, u.phone, u.created_at,
        sh.total_hours, sh.used_hours,
        (SELECT COUNT(*) FROM bookings WHERE student_id = u.id AND status = 'completed') as completed_lessons
      FROM users u
      LEFT JOIN student_hours sh ON u.id = sh.student_id
      WHERE u.role = 'student'
      ORDER BY u.created_at DESC
    `).all();
    res.json(students);
  } catch (err) {
    console.error('Get students error:', err);
    res.status(500).json({ message: '获取学员列表失败' });
  }
});

router.get('/coaches', authMiddleware, roleGuard('admin'), (_req: AuthRequest, res: Response) => {
  try {
    const coaches = db.prepare(`
      SELECT u.id, u.name, u.phone, u.created_at,
        cp.driving_years, cp.rating, cp.rating_count, cp.total_students,
        (SELECT COUNT(*) FROM bookings WHERE coach_id = u.id AND status = 'completed') as completed_lessons
      FROM users u
      JOIN coach_profiles cp ON u.id = cp.user_id
      WHERE u.role = 'coach'
      ORDER BY cp.total_students DESC
    `).all();
    res.json(coaches);
  } catch (err) {
    console.error('Get coaches error:', err);
    res.status(500).json({ message: '获取教练列表失败' });
  }
});

export default router;
