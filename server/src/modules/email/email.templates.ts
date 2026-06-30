import type { EmailJob } from './email.types';

export function getSubject(templateId: EmailJob['templateId']): string {
  const subjects: Record<EmailJob['templateId'], string> = {
    credentials: 'IITG Fresher Onboarding — Your Login Credentials',
    allocation: 'IITG Fresher Onboarding — Room Allocation Confirmed',
    'password-reset': 'IITG Fresher Onboarding — Password Reset',
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
