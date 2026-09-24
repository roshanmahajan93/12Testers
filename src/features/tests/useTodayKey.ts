import { useEffect, useState } from 'react';

import { useDomainConfig } from '@/features/config/configApi';
import { useMyProfile } from '@/features/profile/profileApi';
import { deviceTimeZone } from '@/lib/device';
import { msUntilReset, taskDayKey } from '@/lib/domain/time';

/** Tester's current task day (timezone + reset hour aware) and a live countdown to the next reset. */
export function useTaskDay() {
  const cfg = useDomainConfig();
  const { data: profile } = useMyProfile();
  const tz = profile?.timezone || deviceTimeZone();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  return {
    todayKey: taskDayKey(now, tz, cfg.TASK_DAY_RESET_HOUR),
    msToReset: msUntilReset(now, tz, cfg.TASK_DAY_RESET_HOUR),
    timezone: tz,
  };
}
