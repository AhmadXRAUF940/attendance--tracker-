import { z } from "zod";
import { insertUserSchema, insertAttendanceSchema, attendance, users, grades, sections, students } from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// Response Shapes
export const UserResponseSchema = z.object({
  id: z.number(),
  institutionId: z.string(),
  role: z.enum(["teacher", "student"]),
  firstName: z.string(),
  lastName: z.string(),
  rank: z.string().nullable().optional(),
});

export const StudentListSchema = z.array(z.object({
  id: z.number(), // Student ID
  rollNo: z.number(),
  userId: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  attendance: z.record(z.string(), z.string()), // date -> status map for efficient lookup
  stats: z.object({
    present: z.number(),
    absent: z.number(),
    late: z.number(),
    excused: z.number(),
    percentage: z.number()
  })
}));

export const AllocationSchema = z.array(z.object({
  gradeId: z.number(),
  gradeName: z.string(),
  sections: z.array(z.object({
    id: z.number(),
    name: z.string()
  }))
}));

// API Contract
export const api = {
  auth: {
    login: {
      method: "POST" as const,
      path: "/api/auth/login",
      input: z.object({
        institutionId: z.string().min(1, "Institution ID is required"),
        password: z.string().min(1, "Password is required"),
      }),
      responses: {
        200: UserResponseSchema,
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: "POST" as const,
      path: "/api/auth/logout",
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: {
      method: "GET" as const,
      path: "/api/auth/me",
      responses: {
        200: UserResponseSchema.nullable(),
      },
    },
  },
  teacher: {
    getAllocations: {
      method: "GET" as const,
      path: "/api/teacher/allocations",
      responses: {
        200: AllocationSchema,
      }
    },
    getClassData: {
      method: "GET" as const,
      path: "/api/teacher/class/:sectionId", // Query param ?month=YYYY-MM
      input: z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/, "Format must be YYYY-MM").optional(),
      }).optional(),
      responses: {
        200: z.object({
          section: z.custom<typeof sections.$inferSelect>(),
          grade: z.custom<typeof grades.$inferSelect>(),
          students: StudentListSchema,
        }),
        404: errorSchemas.notFound,
      }
    },
    markAttendance: {
      method: "POST" as const,
      path: "/api/teacher/attendance",
      input: z.object({
        sectionId: z.number(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
        records: z.array(z.object({
          studentId: z.number(),
          status: z.enum(["P", "A", "L", "E"])
        }))
      }),
      responses: {
        200: z.object({ message: z.string(), updatedCount: z.number() }),
      }
    }
  },
  student: {
    getAttendance: {
      method: "GET" as const,
      path: "/api/student/attendance", // Query param ?month=YYYY-MM
      input: z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/, "Format must be YYYY-MM").optional(),
      }).optional(),
      responses: {
        200: z.object({
          student: z.object({
             firstName: z.string(),
             lastName: z.string(),
             rollNo: z.number(),
             sectionName: z.string(),
             gradeName: z.string(),
          }),
          attendance: z.array(z.custom<typeof attendance.$inferSelect>()),
          stats: z.object({
            present: z.number(),
            absent: z.number(),
            late: z.number(),
            excused: z.number(),
            percentage: z.number(),
            totalDays: z.number(),
          })
        })
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// WS Types
export const WS_EVENTS = {
  ATTENDANCE_UPDATE: 'attendance_update',
} as const;
