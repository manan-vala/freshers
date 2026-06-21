import { z } from 'zod'

// Use z.enum with a const tuple instead of a TypeScript enum.
// Reason: TypeScript enums are non-erasable syntax, which is incompatible
// with `erasableSyntaxOnly: true` set in client/tsconfig.app.json.
// This plain-object + z.enum approach works identically on both client and server.
export const BLOOD_GROUPS = [
  'A_POSITIVE',
  'A_NEGATIVE',
  'B_POSITIVE',
  'B_NEGATIVE',
  'O_POSITIVE',
  'O_NEGATIVE',
  'AB_POSITIVE',
  'AB_NEGATIVE',
] as const

export type BloodGroup = (typeof BLOOD_GROUPS)[number]

export const onboardingSchema = z.object({
  contactNumber: z
    .string()
    .length(10, 'Contact number must be exactly 10 digits')
    .regex(/^\d{10}$/, 'Contact number must contain only digits'),
  alternateContactNumber: z
    .string()
    .length(10, 'Alternate contact number must be exactly 10 digits')
    .regex(/^\d{10}$/, 'Alternate contact number must contain only digits')
    .optional()
    .nullable(),
  permanentAddress: z.string().min(5, 'Address is too short'),
  state: z.string().min(2, 'State name is required'),
  emergencyContactName: z.string().min(2, 'Emergency contact name is required'),
  emergencyContactNumber: z
    .string()
    .length(10, 'Emergency contact number must be exactly 10 digits')
    .regex(/^\d{10}$/, 'Emergency contact number must contain only digits'),
  emergencyContactRelation: z.string().min(2, 'Relation is required'),
  bloodGroup: z.enum(BLOOD_GROUPS, { errorMap: () => ({ message: 'Invalid blood group' }) }),
  medicalConditions: z.string().optional().nullable(),
  allergies: z.string().optional().nullable(),
  physicalAccessibilityRequirements: z.string().optional().nullable(),
  consentGiven: z.literal(true, {
    errorMap: () => ({ message: 'You must provide consent to proceed' }),
  }),
})

export type OnboardingInput = z.infer<typeof onboardingSchema>
