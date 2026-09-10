import { useEffect, useState } from "react";

export interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isExpired: boolean;
  isUrgent: boolean;
}

export function useCountdown(deadline: Date): CountdownResult {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [deadline.getTime()]);

  const totalMs = deadline.getTime() - now;
  const isExpired = totalMs <= 0;
  const isUrgent = !isExpired && totalMs < 24 * 60 * 60 * 1000;

  if (isExpired) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
      isExpired: true,
      isUrgent: false,
    };
  }

  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((totalMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((totalMs / (1000 * 60)) % 60);
  const seconds = Math.floor((totalMs / 1000) % 60);

  return { days, hours, minutes, seconds, totalMs, isExpired, isUrgent };
}

export function formatCountdown(c: CountdownResult): string {
  if (c.isExpired) return "Closed";
  if (c.days > 0) return `${c.days}d ${c.hours}h`;
  if (c.hours > 0) return `${c.hours}h ${c.minutes}m`;
  return `${c.minutes}m ${c.seconds}s`;
}
