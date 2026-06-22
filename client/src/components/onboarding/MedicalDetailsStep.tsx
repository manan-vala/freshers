import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Field, FieldLabel, FieldSet } from "@/components/ui/field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { format, parseISO } from "date-fns"
import { IconCalendar } from "@tabler/icons-react"
import { BLOOD_GROUPS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { OnboardingData } from "./types"

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export function MedicalDetailsStep({ data, updateData }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <FieldSet>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field>
            <FieldLabel>Date of Birth</FieldLabel>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !data.dob && "text-muted-foreground"
                  )}
                >
                  <IconCalendar className="mr-2 h-4 w-4" />
                  {data.dob ? format(parseISO(data.dob), "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={data.dob ? parseISO(data.dob) : undefined}
                  onSelect={(date) => updateData({ dob: date ? format(date, 'yyyy-MM-dd') : '' })}
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </Field>
          
          <Field>
            <FieldLabel>Blood Group</FieldLabel>
            <Select value={data.bloodGroup} onValueChange={v => updateData({ bloodGroup: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select Blood Group" />
              </SelectTrigger>
              <SelectContent>
                {BLOOD_GROUPS.map(bg => (
                  <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field>
          <FieldLabel>Any Medical Conditions</FieldLabel>
          <Textarea 
            value={data.medicalConditions} 
            onChange={e => updateData({ medicalConditions: e.target.value })} 
            placeholder="Please specify any chronic illnesses, allergies, etc. (Optional)" 
            className="min-h-[100px]"
          />
        </Field>

        <Field>
          <FieldLabel>Identification Mark</FieldLabel>
          <Textarea 
            value={data.identificationMark} 
            onChange={e => updateData({ identificationMark: e.target.value })} 
            placeholder="E.g., A mole on the left cheek (Optional)" 
            className="min-h-[80px]"
          />
        </Field>

        <div className="p-4 border rounded-xl bg-slate-50/50 mt-2">
          <Field orientation="horizontal" className="flex flex-row items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <FieldLabel className="text-base">Physical Disability / Handicap</FieldLabel>
              <span className="text-sm text-slate-500">Are you a person with a physical disability?</span>
            </div>
            <Switch 
              checked={data.isHandicapped} 
              onCheckedChange={checked => updateData({ isHandicapped: checked, handicapDetails: checked ? data.handicapDetails : '' })} 
            />
          </Field>

          {data.isHandicapped && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <Field>
                <FieldLabel>Please provide details</FieldLabel>
                <Textarea 
                  value={data.handicapDetails} 
                  onChange={e => updateData({ handicapDetails: e.target.value })} 
                  placeholder="Specify details here..." 
                  className="min-h-[80px]"
                />
              </Field>
            </div>
          )}
        </div>
      </FieldSet>
    </div>
  )
}
