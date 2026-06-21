import { Worker } from 'bullmq';
import nodemailer from 'nodemailer';
import { env } from '@/config/env';
import type { EmailJob } from '@shared/email';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

const worker = new Worker<EmailJob>(
  'emails',
  async (job) => {
    const { to, templateId, data } = job.data;
    const html = renderTemplate(templateId, data);
    await transporter.sendMail({ from: env.SMTP_FROM, to, subject: getSubject(templateId), html });
    console.log(`✓ Email sent to ${to} [${templateId}]`);
  },
  { 
    connection: {
      host: new URL(env.REDIS_URL).hostname,
      port: Number(new URL(env.REDIS_URL).port) || 6379,
      username: new URL(env.REDIS_URL).username || undefined,
      password: new URL(env.REDIS_URL).password || undefined,
      family: 4,
      maxRetriesPerRequest: null,
    } 
  }
);

worker.on('failed', (job, err) => {
  console.error(`✗ Email job ${job?.id} failed:`, err.message);
});

console.log('Worker is listening for email jobs...');

function getSubject(templateId: EmailJob['templateId']): string {
  const subjects: Record<EmailJob['templateId'], string> = {
    credentials: 'IITG Fresher Onboarding — Your Login Credentials',
    allocation: 'IITG Fresher Onboarding — Room Allocation Confirmed',
    'password-reset': 'IITG Fresher Onboarding — Password Reset',
  };
  return subjects[templateId];
}

function renderTemplate(templateId: EmailJob['templateId'], data: Record<string, string>): string {
  if (templateId === 'credentials') {
    return `
      <h2>Welcome to IITG Fresher Onboarding</h2>
      <p>Your login credentials are as follows:</p>
      <p><strong>Login ID:</strong> ${data['loginId']}</p>
      <p><strong>Password:</strong> ${data['password']}</p>
      <p>Please login and change your password immediately.</p>
    `;
  } else if (templateId === 'password-reset') {
    return `
      <h2>Password Reset</h2>
      <p>A password reset was requested for your account.</p>
      <p>Your password reset token is: <strong>${data['token']}</strong></p>
      <p>If you did not request this, please ignore this email.</p>
    `;
  } else if (templateId === 'allocation') {
    return `
      <h2>Room Allocation Confirmed</h2>
      <p>Your room allocation is confirmed.</p>
      <p><strong>Hostel:</strong> ${data['hostelName']}</p>
      <p><strong>Room Number:</strong> ${data['roomNumber']}</p>
    `;
  }
  return '';
}
