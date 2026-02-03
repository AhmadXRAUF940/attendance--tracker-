import { pgTable, text, serial, integer, timestamp, boolean, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Enums ---
export const USER_ROLES = {
  TEACHER: 'teacher',
  STUDENT: 'student'
} as const;

export const ATTENDANCE_STATUS = {
  PRESENT: 'P',
  ABSENT: 'A',
  LATE: 'L',
  EXCUSED: 'E'
} as const;

// --- Tables ---

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  institutionId: text("institution_id").notNull().unique(), // TCH-XXXX or STD-XXXX
  password: text("password").notNull(),
  role: text("role", { enum: ["teacher", "student"] }).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  rank: text("rank"), // For teachers: Assistant Teacher, etc.
});

export const grades = pgTable("grades", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // Grade 1, Grade 2
});

export const sections = pgTable("sections", {
  id: serial("id").primaryKey(),
  gradeId: integer("grade_id").notNull(),
  name: text("name").notNull(), // 1-A, 1-B
});

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(), // Link to users table
  rollNo: integer("roll_no").notNull(),
  sectionId: integer("section_id").notNull(),
});

// Which teachers teach which sections (Teacher -> Grade -> Section)
export const teacherAllocations = pgTable("teacher_allocations", {
  id: serial("id").primaryKey(),
  teacherUserId: integer("teacher_user_id").notNull(),
  gradeId: integer("grade_id").notNull(),
  sectionId: integer("section_id").notNull(),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  status: text("status", { enum: ["P", "A", "L", "E"] }).notNull(),
  markedBy: integer("marked_by"), // Teacher User ID
  markedAt: timestamp("marked_at").defaultNow(),
});

// --- Relations ---

export const usersRelations = relations(users, ({ one, many }) => ({
  studentProfile: one(students, {
    fields: [users.id],
    references: [students.userId],
  }),
  allocations: many(teacherAllocations, { relationName: "teacher" }),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  user: one(users, {
    fields: [students.userId],
    references: [users.id],
  }),
  section: one(sections, {
    fields: [students.sectionId],
    references: [sections.id],
  }),
  attendanceRecords: many(attendance),
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  grade: one(grades, {
    fields: [sections.gradeId],
    references: [grades.id],
  }),
  students: many(students),
  allocations: many(teacherAllocations),
}));

export const gradesRelations = relations(grades, ({ many }) => ({
  sections: many(sections),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  student: one(students, {
    fields: [attendance.studentId],
    references: [students.id],
  }),
}));

export const teacherAllocationsRelations = relations(teacherAllocations, ({ one }) => ({
  teacher: one(users, {
    fields: [teacherAllocations.teacherUserId],
    references: [users.id],
    relationName: "teacher"
  }),
  grade: one(grades, {
    fields: [teacherAllocations.gradeId],
    references: [grades.id],
  }),
  section: one(sections, {
    fields: [teacherAllocations.sectionId],
    references: [sections.id],
  }),
}));

// --- Zod Schemas ---

export const insertUserSchema = createInsertSchema(users);
export const insertAttendanceSchema = createInsertSchema(attendance);

// --- Types ---
export type User = typeof users.$inferSelect;
export type Student = typeof students.$inferSelect;
export type Grade = typeof grades.$inferSelect;
export type Section = typeof sections.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type TeacherAllocation = typeof teacherAllocations.$inferSelect;
