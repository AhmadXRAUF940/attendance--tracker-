import { useTeacherAllocations } from "@/hooks/use-teacher";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Users, ArrowRight, BookOpen, GraduationCap } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function TeacherDashboard() {
  const { data: allocations, isLoading } = useTeacherAllocations();

  if (isLoading) {
    return (
      <div className="h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Group sections by grade
  const grades = allocations || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-2">Manage your assigned classes and attendance.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Summary Card */}
        <Card className="bg-gradient-to-br from-primary to-slate-800 text-white border-none shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <BookOpen className="h-8 w-8 text-secondary" />
              </div>
              <div>
                <p className="text-slate-200 text-sm font-medium">Assigned Grades</p>
                <h3 className="text-3xl font-bold mt-1">{grades.length}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
             <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 rounded-xl">
                <Users className="h-8 w-8 text-indigo-600" />
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">Total Sections</p>
                <h3 className="text-3xl font-bold mt-1 text-slate-900">
                  {grades.reduce((acc, g) => acc + g.sections.length, 0)}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          My Classes
        </h2>
        
        {grades.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-500">No classes assigned to you yet.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {grades.map((grade) => (
              grade.sections.map((section) => (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link href={`/teacher/classes/${section.id}`}>
                    <Card className="h-full hover:border-primary/50 cursor-pointer group bg-white">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardDescription className="font-medium text-slate-500">{grade.gradeName}</CardDescription>
                            <CardTitle className="text-2xl font-bold text-slate-900 mt-1">Section {section.name}</CardTitle>
                          </div>
                          <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                            <ArrowRight className="h-5 w-5" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-slate-500 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          View Attendance Register
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
