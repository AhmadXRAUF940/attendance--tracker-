import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUser } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import Login from "@/pages/Login";
import TeacherDashboard from "@/pages/teacher/Dashboard";
import ClassView from "@/pages/teacher/ClassView";
import StudentDashboard from "@/pages/student/Dashboard";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/Layout";

function ProtectedRoute({ 
  component: Component, 
  allowedRole 
}: { 
  component: React.ComponentType<any>, 
  allowedRole?: "teacher" | "student" 
}) {
  const { data: user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (allowedRole && user.role !== allowedRole) {
    // Redirect to their appropriate dashboard if they try to access wrong role page
    return <Redirect to={user.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard"} />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  const { data: user, isLoading } = useUser();

  // Handle root redirect based on auth status
  if (!isLoading && !user && window.location.pathname === "/") {
    return <Redirect to="/login" />;
  }
  
  if (!isLoading && user && window.location.pathname === "/") {
     return <Redirect to={user.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard"} />;
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Teacher Routes */}
      <Route path="/teacher/dashboard">
        <ProtectedRoute component={TeacherDashboard} allowedRole="teacher" />
      </Route>
      <Route path="/teacher/classes/:sectionId">
        <ProtectedRoute component={ClassView} allowedRole="teacher" />
      </Route>

      {/* Student Routes */}
      <Route path="/student/dashboard">
        <ProtectedRoute component={StudentDashboard} allowedRole="student" />
      </Route>

      {/* Default redirect for root - handled above but good backup */}
      <Route path="/">
        {user ? (
          <Redirect to={user.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard"} />
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
