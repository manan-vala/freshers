import { Router } from 'express';

import { validateBody } from '@/middleware/validate.middleware';
import { authenticate } from '@/middleware/auth.middleware';
import {
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  signUpInitSchema,
  signUpVerifySchema,
  signUpCompleteSchema
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
  signUpInitHandler,
  signUpVerifyOtpHandler,
  signUpCompleteHandler
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
router.post('/change-password', authenticate, validateBody(changePasswordSchema), changePasswordHandler);
router.post('/forgot-password', validateBody(forgotPasswordSchema), forgotPasswordHandler);
router.post('/reset-password', validateBody(resetPasswordSchema), resetPasswordHandler);
router.get('/me', authenticate, getMeHandler);

// Signup routes
router.post('/signup/init', validateBody(signUpInitSchema), signUpInitHandler);
router.post('/signup/verify', validateBody(signUpVerifySchema), signUpVerifyOtpHandler);
router.post('/signup/complete', validateBody(signUpCompleteSchema), signUpCompleteHandler);

export default router;
