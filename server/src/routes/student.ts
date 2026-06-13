import { Router, Response } from 'express';
import db from '../db';
import { authMiddleware } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const hours = db.prepare('SELECT * FROM student_hours WHERE student_id = ?').get(req.user!.id);
    res.json(hours || { total_hours: 20, used_hours: 0 });
  } catch (err) {
    console.error('Get hours error:', err);
    res.status(500).json({ message: '获取学时失败' });
  }
});

export default router;
