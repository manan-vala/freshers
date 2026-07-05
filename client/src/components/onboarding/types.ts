import { onboardingSchema, type OnboardingInput } from "@shared/student";

export { onboardingSchema };
export type OnboardingData = OnboardingInput;

export const initialOnboardingData: Partial<OnboardingData> = {
  fullName: '',
  email: '',
  phone: '',
  emergencyPhone: '',
  emergencyContactName: '',
  emergencyContactRelation: undefined,
  country: 'India',
  otherCountry: '',
  permanentAddress: '',
  state: '',
  programme: undefined,
  discipline: '',
  gender: undefined,
  
  dob: '',
  bloodGroup: '',
  medicalConditions: '',
  identificationMark: '',
  isHandicapped: false,
  handicapDetails: '',
};
