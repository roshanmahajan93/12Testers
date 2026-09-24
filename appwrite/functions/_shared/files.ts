import { Permission, Role } from 'node-appwrite';

import { BUCKETS } from '../../../src/lib/domain/resources';

import { FnError, type Admin } from './runtime';

/**
 * Verify the caller uploaded `fileId` to `bucket`, then share it read-only with extra users
 * (e.g. the developer of the app being tested). Clients can't grant access to other users.
 */
export async function shareOwnedFile(
  admin: Admin,
  bucket: keyof typeof BUCKETS,
  fileId: string,
  ownerId: string,
  shareWith: string[],
): Promise<void> {
  const bucketId = BUCKETS[bucket];
  let file;
  try {
    file = await admin.storage.getFile({ bucketId, fileId });
  } catch {
    throw new FnError('invalid_file', 'That upload could not be found. Please try again.');
  }
  const ownerRead = Permission.read(Role.user(ownerId));
  if (!file.$permissions.includes(ownerRead)) throw new FnError('forbidden', 'You can only attach your own uploads.', 403);
  const permissions = [
    ownerRead,
    Permission.delete(Role.user(ownerId)),
    ...shareWith.filter((u) => u !== ownerId).map((u) => Permission.read(Role.user(u))),
  ];
  await admin.storage.updateFile({ bucketId, fileId, permissions });
}

export async function deleteFileQuietly(admin: Admin, bucket: keyof typeof BUCKETS, fileId: string | null | undefined): Promise<void> {
  if (!fileId) return;
  try {
    await admin.storage.deleteFile({ bucketId: BUCKETS[bucket], fileId });
  } catch {
    // already gone
  }
}
