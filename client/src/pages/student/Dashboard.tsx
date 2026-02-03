import { useState } from "react";
import { useStudentAttendance } from "@/hooks/use-student";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, getDay, addMonths, subMonths } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, TrendingUp, AlertCircle, Clock, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

export default function StudentDashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const formattedMonth = format(currentDate, "yyyy-MM");
  
  const { data, isLoading } = useStudentAttendance(formattedMonth);

  if (isLoading || !data) {
    return (
      <div className="h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { student, attendance, stats } = data;

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  // Create map for easy lookup
  const attendanceMap = new Map(attendance.map(a => [a.date, a.status]));

  const chartData = [
    { name: 'Present', value: stats.present, color: '#16a34a' },
    { name: 'Late', value: stats.late, color: '#eab308' },
    { name: 'Excused', value: stats.excused, color: '#2563eb' },
    { name: 'Absent', value: stats.absent, color: '#dc2626' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">
            Hello, {student.firstName}
          </h1>
          <p className="text-slate-500 mt-1">
            {student.gradeName} | Section {student.sectionName} | Roll No: {student.rollNo}
          </p>
        </div>
        
        <div className="flex gap-2">
           <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium border border-green-200 flex items-center gap-1.5">
             <CheckCircle2 className="w-4 h-4" />
             {Math.round(stats.percentage)}% Attendance
           </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Stats Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-1 space-y-6"
        >
          <Card className="border-none shadow-lg bg-white overflow-hidden relative">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary" />
             <CardHeader>
               <CardTitle>Overview</CardTitle>
               <CardDescription>Your attendance distribution</CardDescription>
             </CardHeader>
             <CardContent>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-3 mt-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-slate-600">
                      <div className="w-3 h-3 rounded-full bg-green-600" /> Present
                    </span>
                    <span className="font-bold text-slate-900">{stats.present}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-slate-600">
                      <div className="w-3 h-3 rounded-full bg-red-600" /> Absent
                    </span>
                    <span className="font-bold text-slate-900">{stats.absent}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-slate-600">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" /> Late
                    </span>
                    <span className="font-bold text-slate-900">{stats.late}</span>
                  </div>
                </div>
             </CardContent>
          </Card>
        </motion.div>

        {/* Calendar View */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-2"
        >
          <Card className="h-full border-none shadow-lg bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <CardTitle>{format(currentDate, "MMMM yyyy")}</CardTitle>
              </div>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: getDay(startOfMonth(currentDate)) }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                
                {daysInMonth.map(day => {
                   const dateKey = format(day, "yyyy-MM-dd");
                   const status = attendanceMap.get(dateKey);
                   const isToday = isSameDay(day, new Date());
                   const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                   
                   let bgClass = "bg-slate-50 border-slate-100 text-slate-400"; // Default / Future / Weekend
                   
                   if (status === "P") bgClass = "bg-green-50 border-green-200 text-green-700 font-bold";
                   if (status === "A") bgClass = "bg-red-50 border-red-200 text-red-700 font-bold";
                   if (status === "L") bgClass = "bg-yellow-50 border-yellow-200 text-yellow-700 font-bold";
                   if (status === "E") bgClass = "bg-blue-50 border-blue-200 text-blue-700 font-bold";
                   
                   if (isWeekend) bgClass = "bg-slate-50/50 border-slate-100/50 text-slate-300";

                   return (
                     <div 
                      key={dateKey}
                      className={cn(
                        "aspect-square rounded-lg border flex flex-col items-center justify-center p-1 transition-all",
                        bgClass,
                        isToday && "ring-2 ring-primary ring-offset-2"
                      )}
                     >
                       <span className="text-xs sm:text-sm">{format(day, "d")}</span>
                       {status && (
                         <span className="text-[10px] uppercase mt-0.5">{status === "P" ? "Pres" : status === "A" ? "Abs" : status}</span>
                       )}
                     </div>
                   );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
