import { Request, Response } from 'express';
import { env } from '@/config/env';
import * as authService from './auth.service';
import type { LoginInput, ChangePasswordInput, ForgotPasswordInput, ResetPasswordInput } from '@shared/auth';

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const secure = env.NODE_ENV === 'production';
  const cookieBase = { httpOnly: true, sameSite: 'strict' as const, secure };

  res.cookie('access_token', accessToken, {
    ...cookieBase,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refresh_token', refreshToken, {
    ...cookieBase,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

function clearAuthCookies(res: Response) {
  const secure = env.NODE_ENV === 'production';
  const cookieBase = { httpOnly: true, sameSite: 'strict' as const, secure };

  res.clearCookie('access_token', cookieBase);
  res.clearCookie('refresh_token', cookieBase);
}

export async function loginHandler(req: Request, res: Response) {
  const input = req.body as LoginInput;
  const result = await authService.login(input);

  setAuthCookies(res, result.accessToken, result.refreshToken);

  res.status(200).json({
    success: true,
    data: result.user,
  });
}

export async function adminLoginHandler(req: Request, res: Response) {
  const input = req.body as LoginInput;
  const result = await authService.adminLogin(input);

  // Super Admin now uses the same httpOnly cookie pattern as all other roles.
  // The token is never sent to JavaScript — the browser attaches the cookie automatically.
  setAuthCookies(res, result.accessToken, result.refreshToken);
  res.status(200).json({ success: true, data: result.user });
}

export async function refreshHandler(req: Request, res: Response) {
  const token = req.cookies.refresh_token;
  if (!token) {
    res.status(401).json({ success: false, message: 'Refresh token missing' });
    return;
  }

  const result = await authService.refresh(token);

  // We only set a new access_token, refresh_token stays the same
  const secure = env.NODE_ENV === 'production';
  res.cookie('access_token', result.accessToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.status(200).json({ success: true });
}

export async function logoutHandler(req: Request, res: Response) {
  // req.user is set by the authMiddleware if authenticated
  if (req.user) {
    await authService.logout(req.user.jti, req.user.exp);
  }
  
  clearAuthCookies(res);
  res.status(200).json({ success: true, message: 'Logged out.' });
}

export async function changePasswordHandler(req: Request, res: Response) {
  const input = req.body as ChangePasswordInput;
  const userId = req.user!.sub;

  await authService.changePassword(userId, input);

  clearAuthCookies(res);

  res.status(200).json({
    success: true,
    message: 'Password updated. Please log in again.',
  });
}
export async function requestFirstLoginOtpHandler(req: Request, res: Response) {
  const userId = req.user!.sub;
  await authService.requestFirstLoginOtp(userId);

  res.status(200).json({
    success: true,
    message: 'OTP sent to your registered email.',
  });
}
export async function forgotPasswordHandler(req: Request, res: Response) {
  const input = req.body as ForgotPasswordInput;
  
  await authService.forgotPassword(input);

  res.status(200).json({
    success: true,
    message: 'If this email is registered, a reset link has been sent.',
  });
}

export async function resetPasswordHandler(req: Request, res: Response) {
  const input = req.body as ResetPasswordInput;
  
  await authService.resetPassword(input);

  res.status(200).json({
    success: true,
    message: 'Password reset successful.',
  });
}

export async function getMeHandler(req: Request, res: Response) {
  const userId = req.user!.sub;
  const user = await authService.getMe(userId);

  res.status(200).json({
    success: true,
    data: user,
  });
}
