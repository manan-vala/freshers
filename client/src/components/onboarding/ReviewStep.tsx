import { useFormContext } from "react-hook-form"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import type { OnboardingData } from "./types"

interface Props {
  isConsented: boolean;
  setIsConsented: (val: boolean) => void;
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 bg-slate-50 p-4 rounded-xl border">
        {children}
      </div>
    </div>
  )
}

function DataRow({ label, value }: { label: string, value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      <span className="text-sm text-slate-900 font-medium">{value || <span className="text-slate-400 italic">Not provided</span>}</span>
    </div>
  )
}

export function ReviewStep({ isConsented, setIsConsented }: Props) {
  const form = useFormContext<OnboardingData>();
  const data = form.getValues();

  return (
    <div className="flex flex-col">
      <Section title="General Details">
        <DataRow label="Full Name" value={data.fullName} />
        <DataRow label="Gmail ID" value={data.email} />
        <DataRow label="Phone Number" value={data.phone} />
        <DataRow label="Emergency Phone" value={data.emergencyPhone} />
        <DataRow label="Stream" value={data.stream} />
        {data.stream === "Bachelor of Technology (B.Tech)" && (
          <DataRow label="Department / Section" value={data.department} />
        )}
        <DataRow label="Gender" value={data.gender} />
      </Section>

      <Section title="Medical Details">
        <DataRow label="Date of Birth" value={data.dob} />
        <DataRow label="Blood Group" value={data.bloodGroup} />
        <div className="md:col-span-2">
          <DataRow label="Medical Conditions" value={data.medicalConditions} />
        </div>
        <div className="md:col-span-2">
          <DataRow label="Identification Mark" value={data.identificationMark} />
        </div>
        <DataRow label="Physical Disability" value={data.isHandicapped ? "Yes" : "No"} />
        {data.isHandicapped && (
          <div className="md:col-span-2">
            <DataRow label="Disability Details" value={data.handicapDetails} />
          </div>
        )}
      </Section>

      <div className="mt-4 p-4 border border-primary/20 bg-primary/5 rounded-xl">
        <Field orientation="horizontal" className="items-start gap-3">
          <Checkbox 
            id="consent" 
            checked={isConsented} 
            onCheckedChange={(c) => setIsConsented(c === true)} 
            className="mt-1"
          />
          <div className="flex flex-col gap-1.5 leading-none">
            <FieldLabel htmlFor="consent" className="text-sm font-semibold text-slate-900 cursor-pointer">
              I verify that all information provided is accurate
            </FieldLabel>
            <p className="text-sm text-slate-600">
              I understand that submitting false information may lead to disciplinary action as per the institute's guidelines.
            </p>
          </div>
        </Field>
      </div>
    </div>
  )
}
