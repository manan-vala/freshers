import { Request, Response } from 'express';
import { env } from '@/config/env';
import { prisma } from '@/config/prisma';
import { signAccessToken, signRefreshToken } from '@/utils/jwt.util';
import { setAuthCookies } from './auth.controller';

const SCOPES = ['openid', 'profile', 'email', 'offline_access', 'User.Read'];

export const redirectToMicrosoftHandler = (req: Request, res: Response) => {
  const params = new URLSearchParams({
    client_id: env.MICROSOFT_CLIENT_ID,
    response_type: 'code',
    redirect_uri: env.MICROSOFT_REDIRECT_URI,
    response_mode: 'query',
    scope: SCOPES.join(' '),
    prompt: 'login',
    max_age: '0',
  });

  res.redirect(`https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?${params}`);
};

export const handleMicrosoftCallbackHandler = async (req: Request, res: Response) => {
  const { code, error } = req.query;
  const clientUrl = env.CLIENT_URL;

  if (error || !code) {
    return res.redirect(`${clientUrl}/login?error=ms_auth_failed`);
  }

  try {
    // 1. Exchange code for token
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: env.MICROSOFT_CLIENT_ID,
          client_secret: env.MICROSOFT_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code: code as string,
          redirect_uri: env.MICROSOFT_REDIRECT_URI,
          scope: SCOPES.join(' '),
        }),
      }
    );
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) return res.redirect(`${clientUrl}/login?error=token_exchange_failed`);

    // 2. Fetch MS Graph profile
    const profileRes = await fetch(
      'https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const profile = await profileRes.json();
    const email = (profile.mail || profile.userPrincipalName || '').toLowerCase();

    // 3. Gate 1: Domain check
    if (!email.endsWith(`@${env.ALLOWED_EMAIL_DOMAIN}`)) {
      return res.redirect(`${clientUrl}/login?error=unauthorized_domain`);
    }

    // 4. Gate 2 & 3: DB presence and Role check
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    if (!user || !user.isActive) {
      return res.redirect(`${clientUrl}/login?error=not_provisioned`);
    }

    if (user.role !== 'HMC' && user.role !== 'ADMIN') {
      return res.redirect(`${clientUrl}/login?error=unauthorized_role`);
    }

    // Link microsoftId if not already linked
    if (!user.microsoftId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { microsoftId: profile.id, lastLoginAt: new Date() },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    // Issue cookies and redirect
    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = signRefreshToken(user.id);

    setAuthCookies(res, accessToken, refreshToken);

    return res.redirect(`${clientUrl}/hostel/dashboard`);
  } catch (err) {
    console.error('MS Auth Error:', err);
    return res.redirect(`${clientUrl}/login?error=internal_server_error`);
  }
};
