import { IconLogout } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { useLogout, type User } from '@/lib/auth'
import { useNavigate } from '@tanstack/react-router'

interface NavbarProps {
  user: User | null;
}

export function Navbar({ user }: NavbarProps) {
  const logoutMutation = useLogout();
  const navigate = useNavigate();

  const emailPrefix = user?.email?.split('@')[0] || 'User';
  const initial = emailPrefix.charAt(0).toUpperCase();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate({ to: '/login' });
      }
    });
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b sticky top-0 z-20">
      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="IITG Logo" className="w-8 h-8 object-contain" />
        <span className="font-bold text-lg text-slate-800">Fresher Onboarding</span>
      </div>
      
      {user && (
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-sm font-medium text-slate-900">{emailPrefix}</span>
            <span className="text-xs text-slate-500">Student Profile</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 shadow-sm">
            {initial}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="text-slate-500 hover:text-red-600 hover:bg-red-50 ml-2 flex items-center gap-2"
            title="Logout"
          >
            <IconLogout className="size-5 shrink-0" stroke={2} />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      )}
    </header>
  );
}
