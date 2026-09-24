import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { useFileImageSource } from '@/services/appwrite/useFileImage';
import type { BucketId } from '@/services/appwrite/ids';
import { useTheme } from '@/theme/ThemeProvider';

import { Text } from './Text';

export interface AvatarProps {
  name: string;
  fileId?: string | null;
  bucket?: BucketId;
  size?: number;
  rounded?: 'full' | 'squircle';
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : (parts[0]?.[1] ?? '');
  return (first + second).toUpperCase();
}

/** Image avatar with gradient-initials fallback. Also used for app icons (squircle). */
export function Avatar({ name, fileId, bucket = 'avatars', size = 40, rounded = 'full' }: AvatarProps) {
  const { accent } = useTheme();
  const source = useFileImageSource(bucket, fileId, size * 3);
  const radius = rounded === 'full' ? size / 2 : size * 0.28;
  return (
    <View
      style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden' }}
      accessibilityLabel={name}
      accessible
    >
      <LinearGradient colors={accent.gradient} style={[StyleSheet.absoluteFill, styles.center]}>
        <Text variant="bodyStrong" style={{ color: accent.onPrimary, fontSize: size * 0.38, lineHeight: size * 0.46 }}>
          {initials(name)}
        </Text>
      </LinearGradient>
      {source ? (
        <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} recyclingKey={fileId ?? undefined} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
