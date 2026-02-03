import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useLogout } from "@/hooks/use-auth";
import { 
  LogOut, 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  School,
  Menu,
  X,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useSocket } from "@/hooks/use-socket";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { data: user } = useUser();
  const { mutate: logout } = useLogout();
  const [location] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Initialize socket listener for real-time updates
  useSocket();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!user) return null;

  const isTeacher = user.role === "teacher";

  const navItems = isTeacher
    ? [
        { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
        // Classes are dynamic, but we can have a main entry point or list
      ]
    : [
        { href: "/student/dashboard", label: "My Attendance", icon: CalendarDays },
      ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-primary text-primary-foreground p-4 flex justify-between items-center shadow-md z-50">
        <div className="flex items-center gap-2 font-display font-bold text-lg">
          <School className="h-6 w-6 text-secondary" />
          <span>Rise & Shine</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-primary-foreground hover:bg-white/10">
          {isSidebarOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-100 shadow-2xl transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-700 bg-slate-950">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-primary rounded-lg">
                <School className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-display font-bold text-xl leading-none">Rise & Shine</h1>
                <p className="text-xs text-slate-400 mt-1">High School</p>
              </div>
            </div>
          </div>

          <div className="flex-1 py-6 px-4 space-y-1">
            <div className="mb-6 px-2">
              <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">Menu</p>
              {navItems.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-all duration-200 group",
                        isActive 
                          ? "bg-primary text-white shadow-lg shadow-primary/25 font-medium" 
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", isActive ? "text-secondary" : "group-hover:text-white")} />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="p-4 bg-slate-950 border-t border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-slate-500 truncate capitalize">{user.role}</p>
              </div>
            </div>
            <Button 
              variant="destructive" 
              className="w-full justify-start gap-2 bg-red-900/20 text-red-400 hover:bg-red-900/40 hover:text-red-300 border border-red-900/50"
              onClick={() => logout()}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50/50">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shadow-sm z-10">
          <h2 className="text-xl font-display font-semibold text-slate-800 hidden md:block">
            {isTeacher ? "Teacher Portal" : "Student Portal"}
          </h2>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-600 ml-auto bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="tabular-nums">
              {format(currentTime, "EEEE, d MMMM yyyy | h:mm:ss a")}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
