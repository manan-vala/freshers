import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold">
            IITG
          </div>
          <span className="font-bold text-lg text-slate-800">Fresher Portal</span>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto w-full">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
          Welcome to IIT Guwahati
        </h1>
        <p className="text-lg text-slate-600 mb-10 max-w-2xl">
          We are excited to have you join us. Please complete your onboarding process to provide the necessary details for your enrollment.
        </p>
        
        <div className="grid md:grid-cols-3 gap-6 mb-12 w-full text-left">
          <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-bold mb-4">1</div>
            <h3 className="font-semibold text-lg mb-2">General Info</h3>
            <p className="text-slate-500 text-sm">Provide your basic details, contact information, and academic department.</p>
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-bold mb-4">2</div>
            <h3 className="font-semibold text-lg mb-2">Medical Info</h3>
            <p className="text-slate-500 text-sm">Submit your medical history and specific health requirements.</p>
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-bold mb-4">3</div>
            <h3 className="font-semibold text-lg mb-2">Review & Submit</h3>
            <p className="text-slate-500 text-sm">Verify all your provided information and securely submit your profile.</p>
          </div>
        </div>

        <Button asChild size="lg" className="text-base px-8">
          <Link to="/onboarding">Begin Onboarding</Link>
        </Button>
      </main>

      <footer className="py-6 text-center text-slate-500 text-sm border-t bg-white">
        &copy; {new Date().getFullYear()} Indian Institute of Technology Guwahati. All rights reserved.
      </footer>
    </div>
  )
}
