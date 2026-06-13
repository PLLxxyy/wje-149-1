import { Router, Response } from 'express';
import db from '../db';
import { authMiddleware, roleGuard } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

router.get('/', authMiddleware, roleGuard('coach'), (req: AuthRequest, res: Response) => {
  try {
    const schedules = db.prepare(`
      SELECT id, day_of_week, time_slot, is_active
      FROM schedules
      WHERE coach_id = ?
      ORDER BY day_of_week, time_slot
    `).all(req.user!.id);
    res.json(schedules);
  } catch (err) {
    console.error('Get schedules error:', err);
    res.status(500).json({ message: '获取排班失败' });
  }
});

router.post('/', authMiddleware, roleGuard('coach'), (req: AuthRequest, res: Response) => {
  try {
    const { day_of_week, time_slot } = req.body;
    const { v4: uuidv4 } = require('uuid');

    if (day_of_week === undefined || !time_slot) {
      res.status(400).json({ message: '请选择日期和时段' });
      return;
    }

    const existing = db.prepare(
      'SELECT id, is_active FROM schedules WHERE coach_id = ? AND day_of_week = ? AND time_slot = ?'
    ).get(req.user!.id, day_of_week, time_slot) as any;

    if (existing) {
      if (!existing.is_active) {
        db.prepare('UPDATE schedules SET is_active = 1 WHERE id = ?').run(existing.id);
      }
      res.json({ message: '排班已添加', id: existing.id });
    } else {
      const id = uuidv4();
      db.prepare('INSERT INTO schedules (id, coach_id, day_of_week, time_slot, is_active) VALUES (?, ?, ?, ?, 1)')
        .run(id, req.user!.id, day_of_week, time_slot);
      res.json({ message: '排班已添加', id });
    }
  } catch (err) {
    console.error('Add schedule error:', err);
    res.status(500).json({ message: '添加排班失败' });
  }
});

router.delete('/:id', authMiddleware, roleGuard('coach'), (req: AuthRequest, res: Response) => {
  try {
    const schedule = db.prepare('SELECT * FROM schedules WHERE id = ? AND coach_id = ?').get(req.params.id, req.user!.id) as any;
    if (!schedule) {
      res.status(404).json({ message: '排班不存在' });
      return;
    }
    db.prepare('UPDATE schedules SET is_active = 0 WHERE id = ?').run(req.params.id);
    res.json({ message: '排班已删除' });
  } catch (err) {
    console.error('Delete schedule error:', err);
    res.status(500).json({ message: '删除排班失败' });
  }
});

router.post('/batch', authMiddleware, roleGuard('coach'), (req: AuthRequest, res: Response) => {
  try {
    const { schedules: newSchedules } = req.body;
    const { v4: uuidv4 } = require('uuid');

    db.prepare('DELETE FROM schedules WHERE coach_id = ? AND id NOT IN (SELECT schedule_id FROM bookings WHERE status IN (?, ?))')
      .run(req.user!.id, 'pending', 'confirmed');

    for (const s of newSchedules) {
      const existing = db.prepare(
        'SELECT id FROM schedules WHERE coach_id = ? AND day_of_week = ? AND time_slot = ?'
      ).get(req.user!.id, s.day_of_week, s.time_slot) as any;

      if (existing) {
        db.prepare('UPDATE schedules SET is_active = 1 WHERE id = ?').run(existing.id);
      } else {
        db.prepare('INSERT INTO schedules (id, coach_id, day_of_week, time_slot, is_active) VALUES (?, ?, ?, ?, 1)')
          .run(uuidv4(), req.user!.id, s.day_of_week, s.time_slot);
      }
    }

    res.json({ message: '排班更新成功' });
  } catch (err) {
    console.error('Batch update schedules error:', err);
    res.status(500).json({ message: '排班更新失败' });
  }
});

export default router;
