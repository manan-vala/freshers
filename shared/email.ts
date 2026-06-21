export interface EmailJob {
  to: string;
  templateId: 'credentials' | 'allocation' | 'password-reset';
  data: Record<string, string>;
}
