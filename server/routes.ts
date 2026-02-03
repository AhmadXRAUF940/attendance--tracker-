import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { api } from "@shared/routes";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { users } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // 1. Setup Auth
  setupAuth(app);

  // 2. Setup WebSocket
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  
  // Track connections (simple broadcast for this scope)
  const clients = new Set<WebSocket>();

  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => {
      clients.delete(ws);
    });
  });

  function broadcastAttendanceUpdate(sectionId: number) {
    const message = JSON.stringify({
      type: "attendance_update",
      payload: { sectionId }
    });
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  // 3. Helper: Seed Data
  // Running this on every startup for demo purposes, checking if data exists
  const seedData = async () => {
    const existingUser = await storage.getUserByInstitutionId("TCH-1001");
    if (existingUser) return; // Already seeded

    console.log("Seeding database...");
    const hash = await bcrypt.hash("Teach@1234", 10);
    const studentHash = await bcrypt.hash("Stud@1234", 10);

    // Teachers
    const t1 = await storage.createUser({
      institutionId: "TCH-1001",
      password: hash,
      role: "teacher",
      firstName: "Ayesha",
      lastName: "Khan",
      rank: "Assistant Teacher"
    });
    
    const t2 = await storage.createUser({
      institutionId: "TCH-1002",
      password: hash,
      role: "teacher",
      firstName: "Imran",
      lastName: "Ali",
      rank: "Senior Teacher"
    });

    // Grades & Sections
    const g1 = await storage.createGrade("Grade 1");
    const g2 = await storage.createGrade("Grade 2");
    
    const s1A = await storage.createSection(g1.id, "1-A");
    const s1B = await storage.createSection(g1.id, "1-B");
    const s2A = await storage.createSection(g2.id, "2-A");

    // Allocations
    await storage.createAllocation(t1.id, g1.id, s1A.id);
    await storage.createAllocation(t1.id, g1.id, s1B.id);
    await storage.createAllocation(t2.id, g2.id, s2A.id);

    // Students
    const studentUsers = [
      { id: "STD-2001", name: "Ali", last: "Khan", roll: 1 },
      { id: "STD-2002", name: "Zara", last: "Bibi", roll: 2 },
      { id: "STD-2003", name: "Bilal", last: "Ahmad", roll: 3 }
    ];

    for (const s of studentUsers) {
      const u = await storage.createUser({
        institutionId: s.id,
        password: studentHash,
        role: "student",
        firstName: s.name,
        lastName: s.last
      });
      await storage.createStudent(u.id, s.roll, s1A.id);
    }
    
    console.log("Seeding complete.");
  };
  
  // Run seed (async, don't await block server start)
  seedData().catch(console.error);

  // 4. API Routes

  // --- Teacher Routes ---
  app.get(api.teacher.getAllocations.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'teacher') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const allocations = await storage.getTeacherAllocations(req.user.id);
    
    // Group by Grade
    // Need to transform flat list to hierarchical
    const grouped = new Map<number, { gradeId: number, gradeName: string, sections: {id: number, name: string}[] }>();
    
    for (const alloc of allocations) {
      if (!grouped.has(alloc.grade.id)) {
        grouped.set(alloc.grade.id, {
          gradeId: alloc.grade.id,
          gradeName: alloc.grade.name,
          sections: []
        });
      }
      grouped.get(alloc.grade.id)?.sections.push({
        id: alloc.section.id,
        name: alloc.section.name
      });
    }
    
    res.json(Array.from(grouped.values()));
  });

  app.get(api.teacher.getClassData.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'teacher') {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const sectionId = parseInt(req.params.sectionId);
    // TODO: Verify teacher has access to this section (security requirement)
    // const allocations = await storage.getTeacherAllocations(req.user.id);
    // if (!allocations.find(a => a.section.id === sectionId)) return res.status(403)...

    const section = await storage.getSection(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });
    
    const grade = await storage.getGrade(section.gradeId);
    if (!grade) return res.status(404).json({ message: "Grade not found" });

    const students = await storage.getStudentsBySection(sectionId);
    const month = req.query.month as string | undefined; // YYYY-MM
    const attendanceRecords = await storage.getAttendanceForSection(sectionId, month);

    // Merge student data with user data
    const fullStudentList = await Promise.all(students.map(async (s) => {
      const u = await storage.getUser(s.userId);
      if (!u) return null;
      
      // Calculate stats from attendanceRecords for this student
      const studentRecords = attendanceRecords.filter(a => a.studentId === s.id);
      const stats = {
        present: studentRecords.filter(a => a.status === 'P').length,
        absent: studentRecords.filter(a => a.status === 'A').length,
        late: studentRecords.filter(a => a.status === 'L').length,
        excused: studentRecords.filter(a => a.status === 'E').length,
        percentage: 0
      };
      const total = stats.present + stats.absent + stats.late + stats.excused;
      stats.percentage = total > 0 ? Math.round(((stats.present + stats.late) / total) * 100) : 0;

      // Attendance map
      const attendanceMap: Record<string, string> = {};
      studentRecords.forEach(r => attendanceMap[r.date] = r.status);

      return {
        id: s.id,
        rollNo: s.rollNo,
        userId: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        attendance: attendanceMap,
        stats
      };
    }));

    res.json({
      section,
      grade,
      students: fullStudentList.filter(s => s !== null)
    });
  });

  app.post(api.teacher.markAttendance.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'teacher') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const input = api.teacher.markAttendance.input.parse(req.body);
    
    // Add markedBy to records
    const records = input.records.map(r => ({
      ...r,
      date: input.date,
      markedBy: req.user.id
    }));
    
    await storage.markAttendance(records);
    
    // Broadcast update
    broadcastAttendanceUpdate(input.sectionId);
    
    res.json({ message: "Attendance marked successfully", updatedCount: records.length });
  });

  // --- Student Routes ---
  app.get(api.student.getAttendance.path, async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== 'student') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const studentData = await storage.getStudentWithDetails(req.user.id);
    if (!studentData) return res.status(404).json({ message: "Student profile not found" });
    
    const month = req.query.month as string | undefined;
    const records = await storage.getAttendanceForStudent(studentData.student.id, month);
    
    const stats = {
      present: records.filter(a => a.status === 'P').length,
      absent: records.filter(a => a.status === 'A').length,
      late: records.filter(a => a.status === 'L').length,
      excused: records.filter(a => a.status === 'E').length,
      percentage: 0,
      totalDays: records.length
    };
    stats.percentage = stats.totalDays > 0 ? Math.round(((stats.present + stats.late) / stats.totalDays) * 100) : 0;

    res.json({
      student: {
        firstName: studentData.user.firstName,
        lastName: studentData.user.lastName,
        rollNo: studentData.student.rollNo,
        sectionName: studentData.section.name,
        gradeName: studentData.grade.name
      },
      attendance: records,
      stats
    });
  });

  return httpServer;
}
