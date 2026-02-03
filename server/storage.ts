import { db } from "./db";
import { eq, and, sql, inArray } from "drizzle-orm";
import { 
  users, students, grades, sections, teacherAllocations, attendance,
  type User, type Student, type Grade, type Section, type Attendance, type TeacherAllocation,
  type InsertUser, ATTENDANCE_STATUS
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  sessionStore: session.Store;
  
  // User & Auth
  getUser(id: number): Promise<User | undefined>;
  getUserByInstitutionId(institutionId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Teacher Operations
  getTeacherAllocations(teacherUserId: number): Promise<{
    grade: Grade;
    section: Section;
  }[]>;
  getStudentsBySection(sectionId: number): Promise<Student[]>;
  getSection(sectionId: number): Promise<Section | undefined>;
  getGrade(gradeId: number): Promise<Grade | undefined>;
  
  // Student Operations
  getStudentByUserId(userId: number): Promise<Student | undefined>;
  getStudentWithDetails(userId: number): Promise<{
    student: Student;
    user: User;
    section: Section;
    grade: Grade;
  } | undefined>;

  // Attendance
  getAttendanceForSection(sectionId: number, month?: string): Promise<Attendance[]>;
  getAttendanceForStudent(studentId: number, month?: string): Promise<Attendance[]>;
  markAttendance(records: { studentId: number; date: string; status: string; markedBy: number }[]): Promise<void>;
  
  // Seeding helpers
  createGrade(name: string): Promise<Grade>;
  createSection(gradeId: number, name: string): Promise<Section>;
  createStudent(userId: number, rollNo: number, sectionId: number): Promise<Student>;
  createAllocation(teacherUserId: number, gradeId: number, sectionId: number): Promise<TeacherAllocation>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  // --- User ---
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByInstitutionId(institutionId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.institutionId, institutionId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // --- Teacher ---
  async getTeacherAllocations(teacherUserId: number): Promise<{ grade: Grade; section: Section }[]> {
    const results = await db
      .select({
        grade: grades,
        section: sections
      })
      .from(teacherAllocations)
      .innerJoin(grades, eq(teacherAllocations.gradeId, grades.id))
      .innerJoin(sections, eq(teacherAllocations.sectionId, sections.id))
      .where(eq(teacherAllocations.teacherUserId, teacherUserId));
    
    return results;
  }

  async getStudentsBySection(sectionId: number): Promise<Student[]> {
    return await db.select().from(students).where(eq(students.sectionId, sectionId)).orderBy(students.rollNo);
  }

  async getSection(sectionId: number): Promise<Section | undefined> {
    const [section] = await db.select().from(sections).where(eq(sections.id, sectionId));
    return section;
  }

  async getGrade(gradeId: number): Promise<Grade | undefined> {
    const [grade] = await db.select().from(grades).where(eq(grades.id, gradeId));
    return grade;
  }

  // --- Student ---
  async getStudentByUserId(userId: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.userId, userId));
    return student;
  }

  async getStudentWithDetails(userId: number): Promise<{ student: Student; user: User; section: Section; grade: Grade } | undefined> {
    const [result] = await db
      .select({
        student: students,
        user: users,
        section: sections,
        grade: grades
      })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .innerJoin(sections, eq(students.sectionId, sections.id))
      .innerJoin(grades, eq(sections.gradeId, grades.id))
      .where(eq(students.userId, userId));
    
    return result;
  }

  // --- Attendance ---
  async getAttendanceForSection(sectionId: number, month?: string): Promise<Attendance[]> {
    // month format YYYY-MM
    let query = db
      .select({
        attendance: attendance
      })
      .from(attendance)
      .innerJoin(students, eq(attendance.studentId, students.id))
      .where(eq(students.sectionId, sectionId));
      
    if (month) {
      // Very basic string prefix match for date YYYY-MM
      // Since date is stored as string YYYY-MM-DD
      const records = await query;
      return records.map(r => r.attendance).filter(a => a.date.startsWith(month));
    }
    
    return (await query).map(r => r.attendance);
  }

  async getAttendanceForStudent(studentId: number, month?: string): Promise<Attendance[]> {
    let query = db.select().from(attendance).where(eq(attendance.studentId, studentId));
    
    if (month) {
       const records = await query;
       return records.filter(a => a.date.startsWith(month));
    }
    
    return await query;
  }

  async markAttendance(records: { studentId: number; date: string; status: string; markedBy: number }[]): Promise<void> {
    // Process one by one or bulk. Bulk upsert is cleaner but sqlite/pg differences exist.
    // For simplicity and safety, we'll iterate. It's not huge volume.
    // Actually, we can use ON CONFLICT DO UPDATE
    
    for (const record of records) {
      // check if exists
      const existing = await db.select().from(attendance).where(
        and(
          eq(attendance.studentId, record.studentId),
          eq(attendance.date, record.date)
        )
      );

      if (existing.length > 0) {
        await db.update(attendance)
          .set({ status: record.status as any, markedBy: record.markedBy, markedAt: new Date() })
          .where(eq(attendance.id, existing[0].id));
      } else {
        await db.insert(attendance).values({
          studentId: record.studentId,
          date: record.date,
          status: record.status as any,
          markedBy: record.markedBy,
          markedAt: new Date()
        });
      }
    }
  }

  // --- Seeding ---
  async createGrade(name: string): Promise<Grade> {
    const [grade] = await db.insert(grades).values({ name }).returning();
    return grade;
  }
  async createSection(gradeId: number, name: string): Promise<Section> {
    const [section] = await db.insert(sections).values({ gradeId, name }).returning();
    return section;
  }
  async createStudent(userId: number, rollNo: number, sectionId: number): Promise<Student> {
    const [student] = await db.insert(students).values({ userId, rollNo, sectionId }).returning();
    return student;
  }
  async createAllocation(teacherUserId: number, gradeId: number, sectionId: number): Promise<TeacherAllocation> {
    const [alloc] = await db.insert(teacherAllocations).values({ teacherUserId, gradeId, sectionId }).returning();
    return alloc;
  }
}

export const storage = new DatabaseStorage();
