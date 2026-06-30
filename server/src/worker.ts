import { Worker } from 'bullmq';
import { env } from '@/config/env';
import type { EmailJob } from '@/modules/email/email.types';
import { transporter } from '@/modules/email/email.transporter';
import { renderTemplate, getSubject } from '@/modules/email/email.templates';

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
