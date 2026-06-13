import { Router, Response } from 'express';
import db from '../db';
import { authMiddleware, roleGuard } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

router.get('/', (_req: AuthRequest, res: Response) => {
  try {
    const coaches = db.prepare(`
      SELECT u.id, u.name, u.phone, cp.driving_years, cp.rating, cp.rating_count, cp.description, cp.total_students
      FROM users u
      JOIN coach_profiles cp ON u.id = cp.user_id
      WHERE u.role = 'coach'
      ORDER BY cp.rating DESC
    `).all();

    // Attach schedules to each coach
    const result = coaches.map((coach: any) => {
      const schedules = db.prepare(`
        SELECT id, day_of_week, time_slot, is_active
        FROM schedules
        WHERE coach_id = ? AND is_active = 1
        ORDER BY day_of_week, time_slot
      `).all(coach.id);
      return { ...coach, schedules };
    });

    res.json(result);
  } catch (err) {
    console.error('Get coaches error:', err);
    res.status(500).json({ message: '获取教练列表失败' });
  }
});

router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const coach = db.prepare(`
      SELECT u.id, u.name, u.phone, cp.driving_years, cp.rating, cp.rating_count, cp.description, cp.total_students
      FROM users u
      JOIN coach_profiles cp ON u.id = cp.user_id
      WHERE u.id = ? AND u.role = 'coach'
    `).get(req.params.id) as any;

    if (!coach) {
      res.status(404).json({ message: '教练不存在' });
      return;
    }

    const schedules = db.prepare(`
      SELECT id, day_of_week, time_slot, is_active
      FROM schedules
      WHERE coach_id = ? AND is_active = 1
      ORDER BY day_of_week, time_slot
    `).all(coach.id);

    const reviews = db.prepare(`
      SELECT r.rating, r.comment, r.created_at, u.name as reviewer_name
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      JOIN bookings b ON r.booking_id = b.id
      WHERE b.coach_id = ? AND r.reviewer_id != ?
      ORDER BY r.created_at DESC
      LIMIT 20
    `).all(coach.id, coach.id);

    res.json({ ...coach, schedules, reviews });
  } catch (err) {
    console.error('Get coach detail error:', err);
    res.status(500).json({ message: '获取教练详情失败' });
  }
});

router.put('/profile', authMiddleware, roleGuard('coach'), (req: AuthRequest, res: Response) => {
  try {
    const { driving_years, description } = req.body;
    db.prepare('UPDATE coach_profiles SET driving_years = ?, description = ? WHERE user_id = ?')
      .run(driving_years || 0, description || '', req.user!.id);
    res.json({ message: '更新成功' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: '更新失败' });
  }
});

router.get('/:id/students', authMiddleware, roleGuard('coach'), (req: AuthRequest, res: Response) => {
  try {
    const students = db.prepare(`
      SELECT DISTINCT u.id, u.name, u.phone, sh.total_hours, sh.used_hours
      FROM bookings b
      JOIN users u ON b.student_id = u.id
      LEFT JOIN student_hours sh ON u.id = sh.student_id
      WHERE b.coach_id = ? AND b.status IN ('confirmed', 'completed')
      ORDER BY u.name
    `).all(req.params.id);

    const result = students.map((s: any) => {
      const reviews = db.prepare(`
        SELECT r.rating, r.comment, r.created_at, b.booking_date, b.time_slot
        FROM reviews r
        JOIN bookings b ON r.booking_id = b.id
        WHERE b.student_id = ? AND b.coach_id = ? AND r.reviewer_id = ?
        ORDER BY r.created_at DESC
      `).all(s.id, req.params.id, req.params.id);
      return { ...s, coach_notes: reviews };
    });

    res.json(result);
  } catch (err) {
    console.error('Get students error:', err);
    res.status(500).json({ message: '获取学员列表失败' });
  }
});

export default router;
