import { z } from "zod";

export const onboardingSchema = z.object({
  fullName: z.string().min(2, { message: "Full Name must be at least 2 characters." }).max(100, { message: "Full Name cannot exceed 100 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }).max(150, { message: "Email cannot exceed 150 characters." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  emergencyPhone: z.string().min(10, { message: "Emergency phone must be at least 10 digits." }),
  stream: z.enum(["Bachelor of Technology (B.Tech)", "Bachelor of Design (B.Des)"], {
    required_error: "Please select a stream.",
  }),
  department: z.string().optional(),
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
  if (data.stream === "Bachelor of Technology (B.Tech)" && (!data.department || data.department.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["department"],
      message: "Please select a department.",
    });
  }
  
  if (data.isHandicapped && (!data.handicapDetails || data.handicapDetails.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["handicapDetails"],
      message: "Please provide details about your physical disability.",
    });
  }
});

export type OnboardingData = z.infer<typeof onboardingSchema>;

export const initialOnboardingData: Partial<OnboardingData> = {
  fullName: '',
  email: '',
  phone: '',
  emergencyPhone: '',
  stream: undefined,
  department: '',
  gender: undefined,
  
  dob: '',
  bloodGroup: '',
  medicalConditions: '',
  identificationMark: '',
  isHandicapped: false,
  handicapDetails: '',
};
