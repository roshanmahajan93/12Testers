import { friendlyMessage } from '@/lib/errors';

import { EmptyState } from './EmptyState';

/** Inline error for a failed query, with retry. */
export function ErrorState({ error, onRetry, title = 'Couldn’t load this' }: { error: unknown; onRetry?: () => void; title?: string }) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title={title}
      message={friendlyMessage(error)}
      actionLabel={onRetry ? 'Try again' : undefined}
      onAction={onRetry}
    />
  );
}
