import { useMemo } from 'react';

import { friendlyMessage } from '@/lib/errors';
import { useAppDispatch } from '@/store/hooks';

import { toastShown } from './uiSlice';

export function useToast() {
  const dispatch = useAppDispatch();
  return useMemo(
    () => ({
      success: (message: string) => dispatch(toastShown('success', message)),
      info: (message: string) => dispatch(toastShown('info', message)),
      error: (e: unknown) => dispatch(toastShown('error', typeof e === 'string' ? e : friendlyMessage(e))),
    }),
    [dispatch],
  );
}
