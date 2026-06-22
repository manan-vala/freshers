import { cn } from "@/lib/utils"

interface StepIndicatorProps {
  steps: string[]
  currentStep: number
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between w-full mb-10 mt-2 relative">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 rounded-full z-0"></div>
      <div 
        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full z-0 transition-all duration-300" 
        style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
      ></div>
      
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        
        return (
          <div key={step} className="relative z-10 flex flex-col items-center gap-2">
            <div 
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors border-2",
                isCompleted ? "bg-primary border-primary text-primary-foreground" : 
                isCurrent ? "bg-white border-primary text-primary" : 
                "bg-white border-slate-200 text-slate-400"
              )}
            >
              {isCompleted ? "✓" : index + 1}
            </div>
            <span className={cn(
              "text-xs font-medium absolute -bottom-6 whitespace-nowrap",
              isCurrent || isCompleted ? "text-slate-800" : "text-slate-400"
            )}>
              {step}
            </span>
          </div>
        )
      })}
    </div>
  )
}
