import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

type MarkAttendanceInput = z.infer<typeof api.teacher.markAttendance.input>;

export function useTeacherAllocations() {
  return useQuery({
    queryKey: [api.teacher.getAllocations.path],
    queryFn: async () => {
      const res = await fetch(api.teacher.getAllocations.path);
      if (!res.ok) throw new Error("Failed to fetch allocations");
      return api.teacher.getAllocations.responses[200].parse(await res.json());
    },
  });
}

export function useClassData(sectionId: number, month?: string) {
  return useQuery({
    queryKey: [api.teacher.getClassData.path, sectionId, month],
    queryFn: async () => {
      const url = buildUrl(api.teacher.getClassData.path, { sectionId });
      const query = month ? `?month=${month}` : "";
      const res = await fetch(url + query);
      if (!res.ok) throw new Error("Failed to fetch class data");
      return api.teacher.getClassData.responses[200].parse(await res.json());
    },
    enabled: !!sectionId,
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: MarkAttendanceInput) => {
      const res = await fetch(api.teacher.markAttendance.path, {
        method: api.teacher.markAttendance.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to mark attendance");
      return api.teacher.markAttendance.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant class data queries
      queryClient.invalidateQueries({
        queryKey: [api.teacher.getClassData.path, variables.sectionId],
      });
      toast({
        title: "Attendance Marked",
        description: `Successfully updated ${variables.records.length} records.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
