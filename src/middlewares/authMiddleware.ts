import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

type AuthUser = {
  id: string;
  email: string;
  role: 'sppg' | 'school';
};

const isAuthUser = (payload: unknown): payload is AuthUser => {
  if (!payload || typeof payload !== 'object') return false;

  const user = payload as Record<string, unknown>;
  return (
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    (user.role === 'sppg' || user.role === 'school')
  );
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token tidak ditemukan' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);

    if (!isAuthUser(payload)) {
      return res.status(401).json({ message: 'Token tidak valid' });
    }

    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };

    return next();
  } catch {
    return res.status(401).json({ message: 'Token tidak valid' });
  }
};
