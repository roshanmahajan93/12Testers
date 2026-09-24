import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/motion/PressableScale';
import type { BucketKey } from '@/services/appwrite/ids';
import { useFileImageSource } from '@/services/appwrite/useFileImage';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

import { IconButton } from './Header';
import { Skeleton } from './Skeleton';

/** Private Appwrite image thumbnail; tap to view full screen. */
export function FileImage({
  bucket,
  fileId,
  style,
  width = 400,
  label = 'Screenshot',
}: {
  bucket: BucketKey;
  fileId: string;
  style?: StyleProp<ViewStyle>;
  width?: number;
  label?: string;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const thumb = useFileImageSource(bucket, fileId, width);
  const full = useFileImageSource(bucket, fileId);
  const [open, setOpen] = useState(false);

  return (
    <>
      <PressableScale onPress={() => setOpen(true)} accessibilityLabel={`Open ${label}`} style={[styles.thumb, { backgroundColor: colors.surfaceAlt }, style]}>
        {thumb ? (
          <Image source={thumb} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} recyclingKey={fileId} />
        ) : (
          <Skeleton width="100%" height={400} radius={0} />
        )}
      </PressableScale>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <View style={styles.viewer}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Close" />
          {full ? <Image source={full} style={styles.full} contentFit="contain" accessibilityLabel={label} /> : null}
          <View style={[styles.close, { top: insets.top + 12 }]}>
            <IconButton icon="close" label="Close" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  thumb: { borderRadius: radii.md, overflow: 'hidden' },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', justifyContent: 'center' },
  full: { width: '100%', height: '80%' },
  close: { position: 'absolute', right: 16 },
});
