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

export const COUNTRIES = [
  "Afghanistan", "Bahrain", "Bangladesh", "Bhutan", "Brunei", "Cambodia", 
  "Canada", "Ethiopia", "France", "Germany", "Ghana", "India", "Indonesia", 
  "Kenya", "Kuwait", "Laos", "Malaysia", "Mauritius", "Myanmar", "Nepal", 
  "Nigeria", "Oman", "Philippines", "Qatar", "Rwanda", "Saudi Arabia", 
  "Singapore", "South Korea", "Sri Lanka", "Sudan", "Tanzania", "Thailand", 
  "Uganda", "United Arab Emirates (UAE)", "United Kingdom", "United States", 
  "Vietnam", "Zimbabwe"
] as const;

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam",
  "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
] as const;

export const onboardingSchema = z.object({
  fullName: z.string().min(2, { message: "Full Name must be at least 2 characters." }).max(100, { message: "Full Name cannot exceed 100 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }).max(150, { message: "Email cannot exceed 150 characters." }),
  phone: z.string().length(10, 'Contact number must be exactly 10 digits').regex(/^\d{10}$/, 'Contact number must contain only digits'),
  emergencyPhone: z.string().length(10, 'Emergency contact number must be exactly 10 digits').regex(/^\d{10}$/, 'Emergency contact number must contain only digits'),
  emergencyContactName: z.string().min(2, { message: "Emergency contact name is required." }),
  emergencyContactRelation: z.enum(["Mother", "Father", "Other"], { required_error: "Please select relation." }),
  country: z.string({ required_error: "Please select a country." }),
  otherCountry: z.string().optional(),
  permanentAddress: z.string().min(5, { message: "Address is too short." }),
  state: z.string().optional(),
  programme: z.string({
    required_error: "Please select a programme.",
  }),
  discipline: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"], {
    required_error: "Please select your gender.",
  }),
  
  dob: z.string().min(1, { message: "Please enter your date of birth." }),
  bloodGroup: z.string().min(1, { message: "Please select your blood group." }),
  medicalConditions: z.string().min(1, { message: "Please enter any medical conditions, or 'None' if applicable." }).max(500, { message: "Cannot exceed 500 characters." }),
  identificationMark: z.string().min(1, { message: "Please enter an identification mark, or 'None' if applicable." }).max(200, { message: "Cannot exceed 200 characters." }),
  isHandicapped: z.boolean().default(false),
  handicapDetails: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.country === "Other") {
    if (!data.otherCountry || data.otherCountry.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["otherCountry"],
        message: "Please specify your country.",
      });
    }
  }

  if (data.country === "India") {
    if (!data.state || data.state.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["state"],
        message: "State is required for India.",
      });
    }
  }

  // NOTE: Validation for discipline isn't strict at the shared layer as they're populated by admins, 
  // but it's kept optional. We trust the DB's existing values for programme & discipline.

  if (data.isHandicapped && (!data.handicapDetails || data.handicapDetails.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["handicapDetails"],
      message: "Please provide details about your physical disability.",
    });
  }
});

export type OnboardingInput = z.infer<typeof onboardingSchema>

export const PROGRAMMES_AND_DISCIPLINES: Record<string, string[]> = {
  "Bachelor of Technology (B.Tech)": [
    "Computer Science and Engineering", "Electronics and Communication Engineering", 
    "Electronics and Electrical Engineering", "Mechanical Engineering", 
    "Civil Engineering", "Biosciences and Bioengineering", 
    "Chemical Engineering", "Engineering Physics", 
    "Chemical Science and Technology", "Mathematics and Computing", 
    "Data Science and Artificial Intelligence", "Energy Engineering"
  ],
  "Bachelor of Design (B.Des)": [],
  "Bachelor of Science (BS)": [],
  "Doctor of Philosophy (PhD)": [
    "Biosciences and Bioengineering", "Chemical Engineering", "Civil Engineering", 
    "Computer Science and Engineering", "Electronics and Electrical Engineering", 
    "Mechanical Engineering", "Chemistry", "Mathematics", "Physics", 
    "Design", "Humanities and Social Sciences"
  ],
  "Master of Science (MS)": [
    "Energy Science and Engineering", "Disaster Management and Risk Reduction", 
    "Polymer Science and Technology"
  ],
  "Master of Technology (M.Tech)": [
    "Computer Science and Engineering", "Electronics and Electrical Engineering", 
    "Mechanical Engineering", "Civil Engineering", "Biotechnology", 
    "Bioengineering", "Chemical Engineering", "Rural Technology", 
    "Data Science", "Food Science and Technology", 
    "Robotics and Artificial Intelligence", "Biomedical Science and Engineering"
  ],
  "Master of Design (M.Des)": [
    "Design", "Electronic Product Design"
  ],
  "Master of Arts (MA)": [
    "Development Studies", "Liberal Arts"
  ],
  "Master of Science (M.Sc)": [
    "Physics", "Chemistry", "Mathematics and Computing", "Mathematics"
  ],
  "Master of Business Administration (MBA)": []
};

export const bulkUploadRowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  rollNumber: z.string().min(1, 'Roll number is required'),
  programme: z.string().min(1, 'Programme is required'),
  discipline: z.string(), // Valdiated below
  hostelCode: z.string().min(1, 'Hostel code is required'),
  gmailId: z.string().email('Invalid Gmail address'),
  outlookId: z.string().email('Invalid Outlook ID'),
}).superRefine((data, ctx) => {
  const validDisciplines = PROGRAMMES_AND_DISCIPLINES[data.programme];
  
  if (!validDisciplines) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid programme: ${data.programme}`,
      path: ['programme'],
    });
    return;
  }
  
  if (validDisciplines.length > 0) {
    if (!data.discipline || data.discipline.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Discipline is required for programme '${data.programme}'`,
        path: ['discipline'],
      });
    } else if (!validDisciplines.includes(data.discipline)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid discipline '${data.discipline}' for programme '${data.programme}'`,
        path: ['discipline'],
      });
    }
  }
});

export type BulkUploadRow = z.infer<typeof bulkUploadRowSchema>

// ─── Import Job Status (used by client polling hook) ─────────────────────────
// Defined here so client can import the type without a server dependency.
export type ImportJobState = 'waiting' | 'active' | 'completed' | 'failed' | 'unknown'

export interface ImportJobResult {
  successCount: number
  failureCount: number
  errors: Array<{ row: number; rollNumber: string; reason: string }>
}

export interface ImportJobStatus {
  state: ImportJobState
  progress: number // 0–100
  result: ImportJobResult | null
  failedReason: string | null
}
