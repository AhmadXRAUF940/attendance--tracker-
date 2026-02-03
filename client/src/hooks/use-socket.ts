import { useEffect } from 'react';
import io from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { WS_EVENTS } from '@shared/routes';
import { api } from '@shared/routes';

export function useSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = io(window.location.origin);

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on(WS_EVENTS.ATTENDANCE_UPDATE, () => {
      // Invalidate student attendance queries when teacher marks attendance
      queryClient.invalidateQueries({ queryKey: [api.student.getAttendance.path] });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);
}
