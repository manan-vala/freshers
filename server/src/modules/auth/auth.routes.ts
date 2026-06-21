import { Router } from 'express';
import { validateBody } from '@/middleware/validate.middleware';
import { authenticate } from '@/middleware/auth.middleware';
import {
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@shared/auth';
import {
  loginHandler,
  refreshHandler,
  logoutHandler,
  changePasswordHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  getMeHandler,
} from './auth.controller';

const router = Router();

router.post('/login', validateBody(loginSchema), loginHandler);
router.post('/refresh', refreshHandler);
router.post('/logout', authenticate, logoutHandler);
router.post('/change-password', authenticate, validateBody(changePasswordSchema), changePasswordHandler);
router.post('/forgot-password', validateBody(forgotPasswordSchema), forgotPasswordHandler);
router.post('/reset-password', validateBody(resetPasswordSchema), resetPasswordHandler);

router.get('/me', authenticate, getMeHandler);

export default router;
