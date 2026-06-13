import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
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

router.put('/students/:id/adjust-hours', authMiddleware, roleGuard('admin'), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action, hours, reason } = req.body;

    if (!action || !['recharge', 'deduct'].includes(action)) {
      res.status(400).json({ message: '操作类型无效，必须是 recharge 或 deduct' });
      return;
    }

    if (!hours || typeof hours !== 'number' || hours <= 0 || !Number.isInteger(hours)) {
      res.status(400).json({ message: '学时必须是正整数' });
      return;
    }

    const student = db.prepare("SELECT id, role FROM users WHERE id = ? AND role = 'student'").get(id) as any;
    if (!student) {
      res.status(404).json({ message: '学员不存在' });
      return;
    }

    const currentHours = db.prepare('SELECT * FROM student_hours WHERE student_id = ?').get(id) as any;
    let beforeTotal: number;

    if (!currentHours) {
      beforeTotal = 20;
      db.prepare('INSERT INTO student_hours (id, student_id, total_hours, used_hours) VALUES (?, ?, 20, 0)')
        .run(uuidv4(), id);
    } else {
      beforeTotal = currentHours.total_hours;
    }

    let afterTotal: number;
    if (action === 'recharge') {
      afterTotal = beforeTotal + hours;
    } else {
      afterTotal = beforeTotal - hours;
      const usedHours = currentHours ? currentHours.used_hours : 0;
      if (afterTotal < usedHours) {
        res.status(400).json({ message: `扣减后总学时不能低于已练学时（${usedHours}）` });
        return;
      }
      if (afterTotal < 0) {
        res.status(400).json({ message: '总学时不能为负数' });
        return;
      }
    }

    db.prepare('UPDATE student_hours SET total_hours = ? WHERE student_id = ?').run(afterTotal, id);

    const adjustmentId = uuidv4();
    db.prepare(`
      INSERT INTO hour_adjustments (id, student_id, admin_id, action, hours, before_total, after_total, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(adjustmentId, id, req.user!.id, action, hours, beforeTotal, afterTotal, reason || '');

    const updated = db.prepare(`
      SELECT u.id, u.name, u.phone, u.created_at,
        sh.total_hours, sh.used_hours,
        (SELECT COUNT(*) FROM bookings WHERE student_id = u.id AND status = 'completed') as completed_lessons
      FROM users u
      LEFT JOIN student_hours sh ON u.id = sh.student_id
      WHERE u.id = ?
    `).get(id);

    res.json({ message: action === 'recharge' ? '学时充值成功' : '学时扣减成功', student: updated });
  } catch (err) {
    console.error('Adjust hours error:', err);
    res.status(500).json({ message: '调整学时失败' });
  }
});

router.get('/students/:id/hour-adjustments', authMiddleware, roleGuard('admin'), (req: AuthRequest, res: Response) => {
  try {
    const adjustments = db.prepare(`
      SELECT ha.*, u.name as admin_name
      FROM hour_adjustments ha
      JOIN users u ON ha.admin_id = u.id
      WHERE ha.student_id = ?
      ORDER BY ha.created_at DESC
    `).all(req.params.id);
    res.json(adjustments);
  } catch (err) {
    console.error('Get hour adjustments error:', err);
    res.status(500).json({ message: '获取学时调整记录失败' });
  }
});

export default router;
