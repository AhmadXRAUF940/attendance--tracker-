import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';

export function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 text-primary font-mono text-sm bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
      <Clock className="w-3.5 h-3.5" />
      <span>{format(time, 'HH:mm:ss')}</span>
    </div>
  );
}
