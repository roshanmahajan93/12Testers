import * as ImagePicker from 'expo-image-picker';

import type { LocalImage } from '@/services/appwrite/storage';

/** Pick (or shoot) one image. Returns null if cancelled or permission denied. */
export async function pickImage(source: 'library' | 'camera', opts: { square?: boolean } = {}): Promise<LocalImage | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.9,
    allowsEditing: !!opts.square,
    aspect: opts.square ? [1, 1] : undefined,
  };
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
  }
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? null : result.assets[0];
  return asset ? { uri: asset.uri, width: asset.width, height: asset.height } : null;
}
