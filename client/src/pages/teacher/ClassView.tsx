import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useClassData, useMarkAttendance } from "@/hooks/use-teacher";
import { format, subMonths, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight, Save, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function ClassView() {
  const [, params] = useRoute("/teacher/classes/:sectionId");
  const [, setLocation] = useLocation();
  const sectionId = parseInt(params?.sectionId || "0");
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily");

  const formattedMonth = format(currentDate, "yyyy-MM");
  
  const { data, isLoading } = useClassData(sectionId, formattedMonth);
  const { mutate: markAttendance, isPending: isSaving } = useMarkAttendance();

  // Local state for attendance marking
  const [attendanceBuffer, setAttendanceBuffer] = useState<Record<number, "P" | "A" | "L" | "E">>({});

  if (isLoading || !data) {
    return (
      <div className="h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { section, grade, students } = data;
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const handleStatusChange = (studentId: number, status: "P" | "A" | "L" | "E") => {
    setAttendanceBuffer(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSave = () => {
    if (Object.keys(attendanceBuffer).length === 0) return;

    const records = Object.entries(attendanceBuffer).map(([sid, status]) => ({
      studentId: parseInt(sid),
      status
    }));

    markAttendance({
      sectionId,
      date: format(currentDate, "yyyy-MM-dd"), // For daily view
      records
    }, {
      onSuccess: () => {
        setAttendanceBuffer({});
      }
    });
  };
  
  // For monthly view, we just show data, no editing (simplification for UI space)
  // For daily view, we show a list of students and radio buttons for today's status

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/teacher/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">
            {grade.name} - Section {section.name}
          </h1>
          <p className="text-slate-500 text-sm">Attendance Register</p>
        </div>
        
        <div className="ml-auto flex items-center gap-3">
           <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily View</SelectItem>
              <SelectItem value="monthly">Monthly View</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <Button 
          variant="ghost" 
          onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          className="hover:bg-slate-100"
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Prev Month
        </Button>
        <h2 className="text-lg font-semibold text-slate-800 tabular-nums">
          {format(currentDate, "MMMM yyyy")}
        </h2>
        <Button 
          variant="ghost" 
          onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          className="hover:bg-slate-100"
        >
          Next Month <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {viewMode === "monthly" ? (
        <Card className="border-none shadow-md overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[200px] sticky left-0 bg-slate-50 z-20 font-semibold text-slate-900">Student Name</TableHead>
                    {daysInMonth.map(day => (
                      <TableHead key={day.toISOString()} className="w-[40px] text-center p-0">
                        <div className="flex flex-col items-center justify-center py-2 h-full">
                          <span className="text-[10px] uppercase font-medium text-slate-400">{format(day, "EEEEE")}</span>
                          <span className={cn(
                            "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mt-1",
                            isSameDay(day, new Date()) ? "bg-primary text-white" : "text-slate-700"
                          )}>{format(day, "d")}</span>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center bg-slate-50 font-semibold text-slate-900">Stats</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map(student => (
                    <TableRow key={student.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div>
                          <p className="text-slate-900">{student.firstName} {student.lastName}</p>
                          <p className="text-xs text-slate-500">Roll: {student.rollNo}</p>
                        </div>
                      </TableCell>
                      {daysInMonth.map(day => {
                        const dateKey = format(day, "yyyy-MM-dd");
                        const status = student.attendance[dateKey];
                        const isWeekend = getDay(day) === 0 || getDay(day) === 6; // Sun/Sat

                        if (isWeekend) {
                          return <TableCell key={dateKey} className="p-0 bg-slate-50/50"></TableCell>;
                        }

                        return (
                          <TableCell key={dateKey} className="text-center p-1">
                            {status ? (
                              <Tooltip>
                                <TooltipTrigger>
                                  <div className={cn(
                                    "w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold mx-auto transition-all cursor-default",
                                    status === "P" && "bg-green-100 text-green-700",
                                    status === "A" && "bg-red-100 text-red-700",
                                    status === "L" && "bg-yellow-100 text-yellow-700",
                                    status === "E" && "bg-blue-100 text-blue-700",
                                  )}>
                                    {status}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{status === "P" ? "Present" : status === "A" ? "Absent" : status === "L" ? "Late" : "Excused"}</p>
                                  <p className="text-xs text-slate-400">{dateKey}</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <div className="w-1.5 h-1.5 bg-slate-200 rounded-full mx-auto" />
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center font-semibold text-slate-700">
                        {Math.round(student.stats.percentage)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Daily / Marking View */
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
             <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">Marking for:</span>
                <input 
                  type="date" 
                  value={format(currentDate, "yyyy-MM-dd")}
                  onChange={(e) => setCurrentDate(new Date(e.target.value))}
                  className="border border-slate-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
             </div>
             <Button 
              onClick={handleSave} 
              disabled={isSaving || Object.keys(attendanceBuffer).length === 0}
              className="shadow-lg shadow-primary/20"
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
             </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {students.map(student => {
              const dateKey = format(currentDate, "yyyy-MM-dd");
              // Use buffered status first, then persisted status from server
              const currentStatus = attendanceBuffer[student.id] || student.attendance[dateKey];
              
              return (
                <motion.div layout key={student.id}>
                  <Card className={cn(
                    "border transition-all duration-200", 
                    currentStatus === "A" ? "border-red-200 bg-red-50/30" : "border-slate-200 bg-white"
                  )}>
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-semibold text-slate-600 border border-slate-200">
                          {student.firstName[0]}{student.lastName[0]}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{student.firstName} {student.lastName}</h3>
                          <p className="text-xs text-slate-500">Roll No: {student.rollNo}</p>
                        </div>
                      </div>

                      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                        {(["P", "L", "E", "A"] as const).map((status) => (
                          <button
                            key={status}
                            onClick={() => handleStatusChange(student.id, status)}
                            className={cn(
                              "w-8 h-8 rounded-md text-sm font-bold transition-all flex items-center justify-center",
                              currentStatus === status 
                                ? status === "P" ? "bg-green-500 text-white shadow-md"
                                : status === "L" ? "bg-yellow-500 text-white shadow-md"
                                : status === "E" ? "bg-blue-500 text-white shadow-md"
                                : "bg-red-500 text-white shadow-md"
                                : "text-slate-400 hover:bg-white hover:text-slate-600"
                            )}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
