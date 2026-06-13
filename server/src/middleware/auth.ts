import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';

const JWT_SECRET = 'driving-school-secret-key-2026';

export function generateToken(payload: { id: string; role: string; username: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: '未登录，请先登录' });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string; username: string };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: '登录已过期，请重新登录' });
  }
}

export function roleGuard(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: '无权限访问' });
      return;
    }
    next();
  };
}
