import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useStudentAttendance(month?: string) {
  return useQuery({
    queryKey: [api.student.getAttendance.path, month],
    queryFn: async () => {
      const query = month ? `?month=${month}` : "";
      const res = await fetch(api.student.getAttendance.path + query);
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return api.student.getAttendance.responses[200].parse(await res.json());
    },
  });
}
