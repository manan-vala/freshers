export interface OnboardingData {
  fullName: string;
  email: string;
  phone: string;
  emergencyPhone: string;
  stream: string;
  department: string;
  gender: string;
  
  dob: string;
  bloodGroup: string;
  medicalConditions: string;
  identificationMark: string;
  isHandicapped: boolean;
  handicapDetails: string;
}

export const initialOnboardingData: OnboardingData = {
  fullName: '',
  email: '',
  phone: '',
  emergencyPhone: '',
  stream: '',
  department: '',
  gender: '',
  
  dob: '',
  bloodGroup: '',
  medicalConditions: '',
  identificationMark: '',
  isHandicapped: false,
  handicapDetails: '',
}
