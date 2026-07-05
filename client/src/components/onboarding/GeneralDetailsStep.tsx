import { useFormContext } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { FieldSet } from "@/components/ui/field"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { OnboardingData } from "./types"
import { PROGRAMMES_AND_DISCIPLINES, COUNTRIES, INDIAN_STATES } from "@shared/student"

function RequiredLabel({ text, limitInfo }: { text: string; limitInfo?: string }) {
  return (
    <span className="flex items-center gap-1">
      {text}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-destructive cursor-help font-bold text-base leading-none">*</span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex flex-col gap-0.5">
            <p>This field is required</p>
            {limitInfo && <p className="opacity-70">{limitInfo}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </span>
  )
}

export function GeneralDetailsStep() {
  const form = useFormContext<OnboardingData>();
  const programmeValue = form.watch("programme");
  const countryValue = form.watch("country");
  const availableDisciplines = programmeValue ? PROGRAMMES_AND_DISCIPLINES[programmeValue] || [] : [];

  return (
    <div className="flex flex-col gap-6">
      <FieldSet>
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel><RequiredLabel text="Full Name (same as allotment sheet)" limitInfo="Max 100 characters" /></FormLabel>
              <FormControl>
                <Input placeholder="John Doe" readOnly className="bg-slate-50 cursor-not-allowed" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel><RequiredLabel text="Gmail ID" limitInfo="Max 150 characters" /></FormLabel>
              <FormControl>
                <Input type="email" placeholder="john.doe@gmail.com" readOnly className="bg-slate-50 cursor-not-allowed" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="permanentAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel><RequiredLabel text="Permanent Address" /></FormLabel>
              <FormControl>
                <Input placeholder="123 Main St, City, Country" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel><RequiredLabel text="Country" /></FormLabel>
                <Select 
                  onValueChange={(val) => {
                    field.onChange(val);
                    if (val !== "India") {
                      form.setValue("state", "");
                    }
                    if (val !== "Other") {
                      form.setValue("otherCountry", "");
                    }
                  }} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Country" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Other">Other</SelectItem>
                    {COUNTRIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{countryValue === "India" ? <RequiredLabel text="State" /> : "State"}</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  disabled={countryValue !== "India"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={countryValue === "India" ? "Select State" : "N/A"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {INDIAN_STATES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {countryValue === "Other" && (
          <FormField
            control={form.control}
            name="otherCountry"
            render={({ field }) => (
              <FormItem>
                <FormLabel><RequiredLabel text="Please specify your country" /></FormLabel>
                <FormControl>
                  <Input placeholder="Country name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel><RequiredLabel text="Phone Number" /></FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Input className="w-16 md:w-20 text-center px-1" defaultValue="+91" aria-label="Country code" />
                    <Input type="tel" className="flex-1" placeholder="9876543210" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="emergencyPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel><RequiredLabel text="Emergency Phone Number" /></FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Input className="w-16 md:w-20 text-center px-1" defaultValue="+91" aria-label="Country code" />
                    <Input type="tel" className="flex-1" placeholder="9876543210" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="emergencyContactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel><RequiredLabel text="Emergency Contact Name" /></FormLabel>
                <FormControl>
                  <Input placeholder="Jane Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="emergencyContactRelation"
            render={({ field }) => (
              <FormItem>
                <FormLabel><RequiredLabel text="Relation" /></FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Relation" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Mother">Mother</SelectItem>
                    <SelectItem value="Father">Father</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="programme"
          render={({ field }) => (
            <FormItem>
              <FormLabel><RequiredLabel text="Programme" /></FormLabel>
              <Select 
                onValueChange={(val) => {
                  field.onChange(val);
                  form.setValue("discipline", "");
                }} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Programme" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.keys(PROGRAMMES_AND_DISCIPLINES).map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {availableDisciplines.length > 0 && (
          <FormField
            control={form.control}
            name="discipline"
            render={({ field }) => (
              <FormItem>
                <FormLabel><RequiredLabel text="Discipline" /></FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Discipline" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableDisciplines.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel><RequiredLabel text="Gender" /></FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-row gap-6 mt-2"
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="Male" />
                    </FormControl>
                    <FormLabel className="font-normal">Male</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="Female" />
                    </FormControl>
                    <FormLabel className="font-normal">Female</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="Other" />
                    </FormControl>
                    <FormLabel className="font-normal">Other</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FieldSet>
    </div>
  )
}
