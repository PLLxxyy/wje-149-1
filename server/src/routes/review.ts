import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { booking_id, rating, comment } = req.body;

    if (!booking_id || !rating) {
      res.status(400).json({ message: '评分信息不完整' });
      return;
    }

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking_id) as any;
    if (!booking) {
      res.status(404).json({ message: '预约不存在' });
      return;
    }

    if (booking.status !== 'completed') {
      res.status(400).json({ message: '只能评价已完成的课程' });
      return;
    }

    const isStudent = req.user!.role === 'student';
    const isCoach = req.user!.role === 'coach';

    if (isStudent) {
      const existing = db.prepare('SELECT id FROM reviews WHERE booking_id = ? AND reviewer_id = ?')
        .get(booking_id, req.user!.id);
      if (existing) {
        res.status(400).json({ message: '您已评价过此课程' });
        return;
      }

      db.prepare('INSERT INTO reviews (id, booking_id, reviewer_id, reviewee_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)')
        .run(uuidv4(), booking_id, req.user!.id, booking.coach_id, rating, comment || '');

      // Update coach rating
      const avgRating = db.prepare('SELECT AVG(rating) as avg_r, COUNT(*) as cnt FROM reviews r JOIN bookings b ON r.booking_id = b.id WHERE b.coach_id = ? AND r.reviewer_id != ?')
        .get(booking.coach_id, booking.coach_id) as any;
      if (avgRating) {
        db.prepare('UPDATE coach_profiles SET rating = ?, rating_count = ? WHERE user_id = ?')
          .run(Math.round(avgRating.avg_r * 10) / 10, avgRating.cnt, booking.coach_id);
      }

      res.json({ message: '评价成功' });
    } else if (isCoach) {
      const existing = db.prepare('SELECT id FROM reviews WHERE booking_id = ? AND reviewer_id = ?')
        .get(booking_id, req.user!.id);
      if (existing) {
        res.status(400).json({ message: '您已评价过此课程' });
        return;
      }

      db.prepare('INSERT INTO reviews (id, booking_id, reviewer_id, reviewee_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)')
        .run(uuidv4(), booking_id, req.user!.id, booking.student_id, rating, comment || '');

      res.json({ message: '评价成功' });
    } else {
      res.status(403).json({ message: '无权限' });
    }
  } catch (err) {
    console.error('Create review error:', err);
    res.status(500).json({ message: '评价失败' });
  }
});

router.get('/booking/:bookingId', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const reviews = db.prepare(`
      SELECT r.*, u.name as reviewer_name, u.role as reviewer_role
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      WHERE r.booking_id = ?
    `).all(req.params.bookingId);
    res.json(reviews);
  } catch (err) {
    console.error('Get reviews error:', err);
    res.status(500).json({ message: '获取评价失败' });
  }
});

router.get('/student', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const reviews = db.prepare(`
      SELECT r.*, u.name as reviewer_name, b.booking_date, b.time_slot
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      JOIN bookings b ON r.booking_id = b.id
      WHERE r.reviewee_id = ?
      ORDER BY r.created_at DESC
    `).all(req.user!.id);
    res.json(reviews);
  } catch (err) {
    console.error('Get student reviews error:', err);
    res.status(500).json({ message: '获取评价失败' });
  }
});

export default router;
