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
  adminLoginHandler,
  refreshHandler,
  logoutHandler,
  changePasswordHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  getMeHandler,
  requestFirstLoginOtpHandler 
} from './auth.controller';

import {
  redirectToMicrosoftHandler,
  handleMicrosoftCallbackHandler,
} from './auth.microsoft.controller';

const router = Router();

router.get('/microsoft', redirectToMicrosoftHandler);
router.get('/microsoft/callback', handleMicrosoftCallbackHandler);

router.post('/login', validateBody(loginSchema), loginHandler);
router.post('/admin-login', validateBody(loginSchema), adminLoginHandler);
router.post('/refresh', refreshHandler);
router.post('/logout', authenticate, logoutHandler);
// Inside auth.routes.ts
router.post('/first-login/otp', authenticate, requestFirstLoginOtpHandler);
router.post('/change-password', authenticate, validateBody(changePasswordSchema), changePasswordHandler);
router.post('/forgot-password', validateBody(forgotPasswordSchema), forgotPasswordHandler);
router.post('/reset-password', validateBody(resetPasswordSchema), resetPasswordHandler);
router.get('/me', authenticate, getMeHandler);

export default router;
