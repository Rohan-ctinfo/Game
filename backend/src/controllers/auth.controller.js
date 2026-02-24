import * as authService from '../services/auth.service.js';
import { loginSchema, registerSchema } from '../validations/auth.validation.js';

export async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);
    const out = await authService.register({
      ...data,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    res.status(201).json(out);
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const out = await authService.login({
      ...data,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    res.json(out);
  } catch (err) {
    next(err);
  }
}
