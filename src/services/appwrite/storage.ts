import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { ID, Permission, Role } from 'react-native-appwrite';

import { env } from '@/lib/env';

import { storage } from './client';
import { BUCKETS, type BucketKey } from './ids';

export interface LocalImage {
  uri: string;
  width?: number;
  height?: number;
}

/** Downscale to ~1080px on the long edge and re-encode as JPEG before upload. */
export async function compressImage(image: LocalImage, maxEdge = 1080, quality = 0.72): Promise<string> {
  const w = image.width ?? maxEdge;
  const h = image.height ?? maxEdge;
  const ctx = ImageManipulator.manipulate(image.uri);
  if (Math.max(w, h) > maxEdge) {
    ctx.resize(w >= h ? { width: maxEdge } : { height: maxEdge });
  }
  const rendered = await ctx.renderAsync();
  const saved = await rendered.saveAsync({ compress: quality, format: SaveFormat.JPEG });
  return saved.uri;
}

async function fileSize(uri: string): Promise<number> {
  const blob = await (await fetch(uri)).blob();
  return blob.size;
}

/**
 * Upload an image the current user owns. Other readers (e.g. the developer of an app a tester
 * is testing) are granted server-side by the function that consumes the file.
 */
export async function uploadImage(
  bucket: BucketKey,
  image: LocalImage,
  opts: { publicToUsers?: boolean; maxEdge?: number } = {},
): Promise<string> {
  const uri = await compressImage(image, opts.maxEdge);
  const size = await fileSize(uri);
  const permissions = opts.publicToUsers ? [Permission.read(Role.users())] : undefined;
  const file = await storage.createFile({
    bucketId: BUCKETS[bucket],
    fileId: ID.unique(),
    file: { name: `${bucket}-${Date.now()}.jpg`, type: 'image/jpeg', size, uri },
    permissions,
  });
  return file.$id;
}

export async function deleteOwnFile(bucket: BucketKey, fileId: string): Promise<void> {
  await storage.deleteFile({ bucketId: BUCKETS[bucket], fileId });
}

/** Preview URL (resized server-side). Requires auth headers for private files — see useFileImage. */
export function filePreviewUrl(bucket: BucketKey, fileId: string, width = 400): string {
  const base = env.appwriteEndpoint.replace(/\/$/, '');
  const params = new URLSearchParams({ project: env.appwriteProjectId, width: String(width), quality: '80' });
  return `${base}/storage/buckets/${BUCKETS[bucket]}/files/${fileId}/preview?${params.toString()}`;
}

export function fileViewUrl(bucket: BucketKey, fileId: string): string {
  const base = env.appwriteEndpoint.replace(/\/$/, '');
  return `${base}/storage/buckets/${BUCKETS[bucket]}/files/${fileId}/view?project=${env.appwriteProjectId}`;
}
