import { useEffect, useState } from 'react';

import { env, isBackendConfigured } from '@/lib/env';

import { getJwt } from './auth';
import type { BucketKey } from './ids';
import { filePreviewUrl, fileViewUrl } from './storage';

export interface AuthedImageSource {
  uri: string;
  headers: Record<string, string>;
  cacheKey: string;
}

/**
 * expo-image loads through the native HTTP stack, which doesn't share the SDK's session cookie,
 * so private files are fetched with a short-lived JWT header instead.
 */
export function useFileImageSource(
  bucket: BucketKey,
  fileId: string | null | undefined,
  width?: number,
): AuthedImageSource | null {
  const [jwt, setJwt] = useState<string | null>(null);

  useEffect(() => {
    if (!fileId || !isBackendConfigured) return;
    let alive = true;
    getJwt()
      .then((t) => alive && setJwt(t))
      .catch(() => alive && setJwt(null));
    return () => {
      alive = false;
    };
  }, [fileId]);

  if (!fileId || !isBackendConfigured || !jwt) return null;
  const uri = width ? filePreviewUrl(bucket, fileId, Math.min(2000, Math.round(width))) : fileViewUrl(bucket, fileId);
  return {
    uri,
    headers: { 'X-Appwrite-Project': env.appwriteProjectId, 'X-Appwrite-JWT': jwt },
    cacheKey: `${bucket}:${fileId}:${width ?? 'full'}`,
  };
}
