import { prisma } from '@/config/prisma';
import { emailQueue } from '@/jobs/email.queue';
import { hashPassword } from '@/utils/password.util';
import { randomBytes } from 'crypto';

export async function createUser(data: { email: string; loginId: string; role?: 'STUDENT' | 'HMC' | 'ADMIN' }) {
  const plainPassword = randomBytes(8).toString('hex');
  const passwordHash = await hashPassword(plainPassword);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      loginId: data.loginId,
      passwordHash,
      role: data.role || 'STUDENT',
      mustChangePassword: true,
    },
  });

  await emailQueue.add('credential', {
    to: user.email,
    templateId: 'credentials',
    data: { loginId: user.loginId, password: plainPassword },
  });

  return user;
}
