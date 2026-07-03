export type EmailJob = {
  to: string;
  templateId: 'password-reset' | 'otp-email' |'credentials'|'allocation';
  data: Record<string, any>; 
};