import type { EmailJob } from './email.types';

export function getSubject(templateId: EmailJob['templateId']): string {
  const subjects: Record<EmailJob['templateId'], string> = {
    credentials: 'IITG Fresher Onboarding — Your Login Credentials',
    allocation: 'IITG Fresher Onboarding — Room Allocation Confirmed',
    'password-reset': 'IITG Fresher Onboarding — Password Reset',
    'otp-email': 'IITG Fresher Onboarding — Your Verification Code', // Added this!
  };
  return subjects[templateId];
}

export function renderTemplate(templateId: EmailJob['templateId'], data: Record<string, string>): string {
  if (templateId === 'credentials') {
    return `
      <h2>Welcome to IITG Fresher Onboarding</h2>
      <p>Your login credentials are as follows:</p>
      <p><strong>Login ID:</strong> ${data['loginId']}</p>
      <p><strong>Password:</strong> ${data['password']}</p>
      <p>Please login and change your password immediately.</p>
    `;
  } else if (templateId === 'password-reset' || templateId === 'otp-email') { // Handles both now!
    return `
      <h2>Verification Required</h2>
      <p>Your one-time password (OTP) is:</p>
      <h1 style="font-size: 32px; letter-spacing: 5px; color: #000;">${data['token'] || data['otp']}</h1>
      <p>If you did not request this, please ignore this email. This code expires in 5 minutes.</p>
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