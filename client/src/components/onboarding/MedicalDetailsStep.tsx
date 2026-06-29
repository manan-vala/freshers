import { useFormContext } from "react-hook-form"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { FieldSet } from "@/components/ui/field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { format, parseISO } from "date-fns"
import { IconCalendar } from "@tabler/icons-react"
import { BLOOD_GROUPS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { OnboardingData } from "./types"

function FieldLabel({ text, required, limitInfo }: { text: string; required: boolean; limitInfo?: string }) {
  return (
    <span className="flex items-center gap-1">
      {text}
      <Tooltip>
        <TooltipTrigger asChild>
          {required ? (
            <span className="text-destructive cursor-help font-bold text-base leading-none">*</span>
          ) : (
            <span className="text-muted-foreground cursor-help text-xs leading-none">(Optional)</span>
          )}
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex flex-col gap-0.5">
            <p>{required ? "This field is required" : "This field is optional"}</p>
            {limitInfo && <p className="opacity-70">{limitInfo}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </span>
  )
}

export function MedicalDetailsStep() {
  const form = useFormContext<OnboardingData>();
  const isHandicapped = form.watch("isHandicapped");

  return (
    <div className="flex flex-col gap-6">
      <FieldSet>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dob"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="mb-2"><FieldLabel text="Date of Birth" required={true} /></FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <IconCalendar className="mr-2 h-4 w-4" />
                        {field.value ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? parseISO(field.value) : undefined}
                      onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      defaultMonth={new Date(2008, 0, 1)}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="bloodGroup"
            render={({ field }) => (
              <FormItem>
                <FormLabel><FieldLabel text="Blood Group" required={true} /></FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Blood Group" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {BLOOD_GROUPS.map(bg => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="medicalConditions"
          render={({ field }) => (
            <FormItem>
              <FormLabel><FieldLabel text="Any Medical Conditions" required={true} limitInfo="Max 500 characters" /></FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Please specify any chronic illnesses, allergies, etc. (Or type 'None')" 
                  className="min-h-[100px]"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="identificationMark"
          render={({ field }) => (
            <FormItem>
              <FormLabel><FieldLabel text="Identification Mark" required={true} limitInfo="Max 200 characters" /></FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="E.g., A mole on the left cheek (Or type 'None')" 
                  className="min-h-[80px]"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="p-4 border rounded-xl bg-slate-50/50 mt-2">
          <FormField
            control={form.control}
            name="isHandicapped"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between gap-4">
                <div className="flex flex-col gap-1 space-y-0">
                  <FormLabel className="text-base">Physical Disability / Handicap</FormLabel>
                  <span className="text-sm text-slate-500">Are you a person with a physical disability?</span>
                </div>
                <FormControl>
                  <Switch 
                    checked={field.value} 
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      if (!checked) {
                        form.setValue("handicapDetails", "");
                      }
                    }} 
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {isHandicapped && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <FormField
                control={form.control}
                name="handicapDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Please provide details</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Specify details here..." 
                        className="min-h-[80px]"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>
      </FieldSet>
    </div>
  )
}
