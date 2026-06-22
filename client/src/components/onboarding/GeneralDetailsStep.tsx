import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Field, FieldLabel, FieldSet } from "@/components/ui/field"
import { STREAMS, BTECH_DEPARTMENTS } from "@/lib/constants"
import type { OnboardingData } from "./types"

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export function GeneralDetailsStep({ data, updateData }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <FieldSet>
        <Field>
          <FieldLabel>Full Name (same as allotment sheet)</FieldLabel>
          <Input 
            value={data.fullName} 
            onChange={e => updateData({ fullName: e.target.value })} 
            placeholder="John Doe" 
          />
        </Field>
        
        <Field>
          <FieldLabel>Gmail ID</FieldLabel>
          <Input 
            type="email" 
            value={data.email} 
            onChange={e => updateData({ email: e.target.value })} 
            placeholder="john.doe@gmail.com" 
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field>
            <FieldLabel>Phone Number</FieldLabel>
            <Input 
              type="tel" 
              value={data.phone} 
              onChange={e => updateData({ phone: e.target.value })} 
              placeholder="+91 9876543210" 
            />
          </Field>
          
          <Field>
            <FieldLabel>Emergency Phone Number</FieldLabel>
            <Input 
              type="tel" 
              value={data.emergencyPhone} 
              onChange={e => updateData({ emergencyPhone: e.target.value })} 
              placeholder="+91 9876543210" 
            />
          </Field>
        </div>

        <Field>
          <FieldLabel>Stream</FieldLabel>
          <Select value={data.stream} onValueChange={v => updateData({ stream: v, department: '' })}>
            <SelectTrigger>
              <SelectValue placeholder="Select Stream" />
            </SelectTrigger>
            <SelectContent>
              {STREAMS.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {data.stream && (
          <Field>
            <FieldLabel>Department / Section</FieldLabel>
            {data.stream === "Bachelor of Technology (B.Tech)" ? (
              <Select value={data.department} onValueChange={v => updateData({ department: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {BTECH_DEPARTMENTS.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input 
                value={data.department} 
                onChange={e => updateData({ department: e.target.value })} 
                placeholder="Department Name" 
              />
            )}
          </Field>
        )}

        <Field>
          <FieldLabel>Gender</FieldLabel>
          <RadioGroup 
            value={data.gender} 
            onValueChange={v => updateData({ gender: v })}
            className="flex flex-row gap-6 mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Male" id="r1" />
              <label htmlFor="r1" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Male</label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Female" id="r2" />
              <label htmlFor="r2" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Female</label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Other" id="r3" />
              <label htmlFor="r3" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Other</label>
            </div>
          </RadioGroup>
        </Field>
      </FieldSet>
    </div>
  )
}
