import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { generateToken } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

router.post('/register', (req: AuthRequest, res: Response) => {
  try {
    const { username, password, name, phone, role } = req.body;

    if (!username || !password || !name) {
      res.status(400).json({ message: '用户名、密码和姓名不能为空' });
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      res.status(400).json({ message: '用户名已存在' });
      return;
    }

    const userRole = role === 'coach' ? 'coach' : 'student';
    const hash = bcrypt.hashSync(password, 10);
    const userId = uuidv4();

    db.prepare('INSERT INTO users (id, username, password, name, role, phone) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, username, hash, name, userRole, phone || '');

    if (userRole === 'coach') {
      db.prepare('INSERT INTO coach_profiles (id, user_id) VALUES (?, ?)')
        .run(uuidv4(), userId);
    } else {
      db.prepare('INSERT INTO student_hours (id, student_id) VALUES (?, ?)')
        .run(uuidv4(), userId);
    }

    const token = generateToken({ id: userId, role: userRole, username });
    res.json({ token, user: { id: userId, username, name, role: userRole, phone: phone || '' } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: '注册失败' });
  }
});

router.post('/login', (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ message: '用户名和密码不能为空' });
      return;
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    if (!user) {
      res.status(401).json({ message: '用户名或密码错误' });
      return;
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      res.status(401).json({ message: '用户名或密码错误' });
      return;
    }

    const token = generateToken({ id: user.id, role: user.role, username: user.username });
    res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role, phone: user.phone } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: '登录失败' });
  }
});

router.get('/me', (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: '未登录' });
      return;
    }
    const jwt = require('jsonwebtoken');
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, 'driving-school-secret-key-2026') as { id: string };
    const user = db.prepare('SELECT id, username, name, role, phone FROM users WHERE id = ?').get(decoded.id) as any;
    if (!user) {
      res.status(404).json({ message: '用户不存在' });
      return;
    }
    res.json(user);
  } catch {
    res.status(401).json({ message: '登录已过期' });
  }
});

export default router;
