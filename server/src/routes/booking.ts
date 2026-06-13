import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { coach_id, schedule_id, booking_date, time_slot } = req.body;

    if (!coach_id || !schedule_id || !booking_date || !time_slot) {
      res.status(400).json({ message: '预约信息不完整' });
      return;
    }

    const schedule = db.prepare('SELECT * FROM schedules WHERE id = ? AND coach_id = ? AND is_active = 1')
      .get(schedule_id, coach_id) as any;
    if (!schedule) {
      res.status(400).json({ message: '该时段不可预约' });
      return;
    }

    const existingBooking = db.prepare(`
      SELECT id FROM bookings
      WHERE coach_id = ? AND booking_date = ? AND time_slot = ? AND status IN ('pending', 'confirmed')
    `).get(coach_id, booking_date, time_slot);
    if (existingBooking) {
      res.status(400).json({ message: '该时段已被预约' });
      return;
    }

    const studentConflict = db.prepare(`
      SELECT id FROM bookings
      WHERE student_id = ? AND booking_date = ? AND time_slot = ? AND status IN ('pending', 'confirmed')
    `).get(req.user!.id, booking_date, time_slot);
    if (studentConflict) {
      res.status(400).json({ message: '您在该时段已有预约' });
      return;
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO bookings (id, student_id, coach_id, schedule_id, booking_date, time_slot, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).run(id, req.user!.id, coach_id, schedule_id, booking_date, time_slot);

    res.json({ message: '预约成功', id });
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ message: '预约失败' });
  }
});

router.get('/my', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const bookings = db.prepare(`
      SELECT b.*, u.name as coach_name, u.phone as coach_phone
      FROM bookings b
      JOIN users u ON b.coach_id = u.id
      WHERE b.student_id = ?
      ORDER BY b.booking_date DESC, b.time_slot ASC
    `).all(req.user!.id);
    res.json(bookings);
  } catch (err) {
    console.error('Get my bookings error:', err);
    res.status(500).json({ message: '获取预约列表失败' });
  }
});

router.get('/coach', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const bookings = db.prepare(`
      SELECT b.*, u.name as student_name, u.phone as student_phone
      FROM bookings b
      JOIN users u ON b.student_id = u.id
      WHERE b.coach_id = ?
      ORDER BY b.booking_date DESC, b.time_slot ASC
    `).all(req.user!.id);
    res.json(bookings);
  } catch (err) {
    console.error('Get coach bookings error:', err);
    res.status(500).json({ message: '获取预约列表失败' });
  }
});

router.put('/:id/sign', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) as any;
    if (!booking) {
      res.status(404).json({ message: '预约不存在' });
      return;
    }

    if (booking.status === 'cancelled' || booking.status === 'completed') {
      res.status(400).json({ message: '该预约状态无法签到' });
      return;
    }

    const isStudent = req.user!.role === 'student';
    const isCoach = req.user!.role === 'coach';

    if (isStudent && booking.student_id === req.user!.id) {
      db.prepare('UPDATE bookings SET student_signed = 1, status = ? WHERE id = ?').run('confirmed', booking.id);
    } else if (isCoach && booking.coach_id === req.user!.id) {
      db.prepare('UPDATE bookings SET coach_signed = 1 WHERE id = ?').run(booking.id);
    } else {
      res.status(403).json({ message: '无权限操作' });
      return;
    }

    // Check if both signed -> complete and add hours
    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id) as any;
    if (updated.student_signed && updated.coach_signed && !updated.hours_earned) {
      db.prepare('UPDATE bookings SET status = ?, hours_earned = 1 WHERE id = ?').run('completed', booking.id);
      db.prepare('UPDATE student_hours SET used_hours = used_hours + 1 WHERE student_id = ?').run(booking.student_id);
    }

    res.json({ message: '签到成功' });
  } catch (err) {
    console.error('Sign booking error:', err);
    res.status(500).json({ message: '签到失败' });
  }
});

router.put('/:id/cancel', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id) as any;
    if (!booking) {
      res.status(404).json({ message: '预约不存在' });
      return;
    }

    if (booking.student_id !== req.user!.id && booking.coach_id !== req.user!.id) {
      res.status(403).json({ message: '无权限操作' });
      return;
    }

    if (booking.status === 'completed') {
      res.status(400).json({ message: '已完成的预约不能取消' });
      return;
    }

    db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run('cancelled', booking.id);
    res.json({ message: '预约已取消' });
  } catch (err) {
    console.error('Cancel booking error:', err);
    res.status(500).json({ message: '取消预约失败' });
  }
});

// Get booked slots for a coach on a specific date
router.get('/booked/:coachId/:date', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const booked = db.prepare(`
      SELECT time_slot FROM bookings
      WHERE coach_id = ? AND booking_date = ? AND status IN ('pending', 'confirmed')
    `).all(req.params.coachId, req.params.date);
    res.json(booked.map((b: any) => b.time_slot));
  } catch (err) {
    console.error('Get booked slots error:', err);
    res.status(500).json({ message: '获取预约信息失败' });
  }
});

export default router;
