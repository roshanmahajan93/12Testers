import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { PressableScale } from '@/components/motion/PressableScale';
import { Button, Icon, Input, Sheet, Text, Toggle } from '@/components/ui';
import { useHaptics } from '@/hooks/useMotion';
import { GENERIC_INSTRUCTION, sameTaskEveryDay, templatePlan, type PlanDayDraft } from '@/lib/domain/testPlan';
import { useTheme } from '@/theme/ThemeProvider';
import { springs } from '@/theme/motion';
import { radii, space } from '@/theme/tokens';

const ROW_H = 76;
const GAP = 8;
const SLOT = ROW_H + GAP;

interface Item extends PlanDayDraft {
  key: string;
}

let keySeq = 0;
const withKeys = (plan: PlanDayDraft[]): Item[] => plan.map((d) => ({ ...d, key: `d${++keySeq}` }));

type Positions = Record<string, number>;

function PlanRow({
  item,
  index,
  positions,
  count,
  onDrop,
  onEdit,
  onMove,
}: {
  item: Item;
  index: number;
  positions: SharedValue<Positions>;
  count: number;
  onDrop: (order: Positions) => void;
  onEdit: () => void;
  onMove: (delta: -1 | 1) => void;
}) {
  const { colors, accent } = useTheme();
  const fire = useHaptics();
  const top = useSharedValue(index * SLOT);
  const dragging = useSharedValue(false);
  const startTop = useSharedValue(0);

  // Follow position changes made by other rows while not being dragged.
  useAnimatedReaction(
    () => positions.get()[item.key] ?? index,
    (pos) => {
      if (!dragging.get()) top.set(withSpring(pos * SLOT, springs.gentle));
    },
  );

  const pan = Gesture.Pan()
    .onStart(() => {
      dragging.set(true);
      startTop.set(top.get());
      scheduleOnRN(fire, 'select');
    })
    .onUpdate((e) => {
      top.set(startTop.get() + e.translationY);
      const to = Math.max(0, Math.min(count - 1, Math.round(top.get() / SLOT)));
      const from = positions.get()[item.key] ?? 0;
      if (to !== from) {
        const next: Positions = { ...positions.get() };
        for (const k of Object.keys(next)) {
          const p = next[k]!;
          if (from < to && p > from && p <= to) next[k] = p - 1;
          if (from > to && p >= to && p < from) next[k] = p + 1;
        }
        next[item.key] = to;
        positions.set(next);
      }
    })
    .onEnd(() => {
      top.set(withSpring((positions.get()[item.key] ?? 0) * SLOT, springs.gentle));
      dragging.set(false);
      scheduleOnRN(onDrop, positions.get());
    });

  const style = useAnimatedStyle(() => ({
    top: top.value,
    zIndex: dragging.value ? 10 : 1,
    transform: [{ scale: withSpring(dragging.value ? 1.03 : 1, springs.snappy) }],
    shadowOpacity: withSpring(dragging.value ? 0.25 : 0),
  }));

  return (
    <Animated.View style={[styles.rowWrap, style]}>
      <View
        style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
        accessible
        accessibilityLabel={`Day ${index + 1}: ${item.title}. ${item.instruction}`}
        accessibilityActions={[{ name: 'activate' }, { name: 'moveUp', label: 'Move up' }, { name: 'moveDown', label: 'Move down' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'activate') onEdit();
          if (e.nativeEvent.actionName === 'moveUp') onMove(-1);
          if (e.nativeEvent.actionName === 'moveDown') onMove(1);
        }}
      >
        <PressableScale onPress={onEdit} haptic="select" style={styles.rowMain}>
          <View style={[styles.dayChip, { backgroundColor: accent.soft }]}>
            <Text variant="caption" color="accent">
              {index + 1}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {item.title || `Day ${index + 1}`}
            </Text>
            <Text variant="caption" color="textMuted" numberOfLines={1}>
              {item.instruction || GENERIC_INSTRUCTION}
            </Text>
          </View>
          {item.requiresScreenshot ? <Icon name="camera-outline" size={16} color="textFaint" /> : null}
          {item.question ? <Icon name="help-circle-outline" size={16} color="textFaint" /> : null}
        </PressableScale>
        <GestureDetector gesture={pan}>
          <View style={styles.handle} accessibilityElementsHidden>
            <Icon name="reorder-three" size={24} color="textFaint" />
          </View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
}

export interface PlanEditorProps {
  value: PlanDayDraft[];
  onChange: (plan: PlanDayDraft[]) => void;
  days: number;
}

/** 14-day plan editor: tap a day to edit, drag the handle to reorder, quick-fill templates. */
export function PlanEditor({ value, onChange, days }: PlanEditorProps) {
  const [items, setItems] = useState<Item[]>(() => withKeys(value.length ? value : templatePlan(days)));
  const positions = useSharedValue<Positions>(Object.fromEntries(items.map((it, i) => [it.key, i])));
  const [editing, setEditing] = useState<Item | null>(null);
  const [sameOpen, setSameOpen] = useState(false);
  const [sameText, setSameText] = useState('');
  const emitted = useRef(false);

  // Seed the form with the template if it arrived empty.
  useEffect(() => {
    if (!emitted.current && value.length === 0) {
      emitted.current = true;
      onChange(items.map(({ key: _k, ...d }) => d));
    }
  }, [value.length, items, onChange]);

  const commit = (next: Item[]) => {
    const numbered = next.map((d, i) => ({ ...d, dayNumber: i + 1 }));
    setItems(numbered);
    positions.set(Object.fromEntries(numbered.map((it, i) => [it.key, i])));
    onChange(numbered.map(({ key: _k, ...d }) => d));
  };

  const onDrop = (order: Positions) => {
    commit([...items].sort((a, b) => (order[a.key] ?? 0) - (order[b.key] ?? 0)));
  };

  const move = (idx: number, delta: -1 | 1) => {
    const to = idx + delta;
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [it] = next.splice(idx, 1);
    if (it) next.splice(to, 0, it);
    commit(next);
  };

  const saveEdit = (updated: Item) => {
    commit(items.map((it) => (it.key === updated.key ? updated : it)));
    setEditing(null);
  };

  return (
    <View style={{ gap: space.md }}>
      <View style={styles.quick}>
        <Button label="Use template" icon="sparkles-outline" size="sm" variant="secondary" fullWidth={false} onPress={() => commit(withKeys(templatePlan(days)))} />
        <Button label="Same task every day" icon="copy-outline" size="sm" variant="secondary" fullWidth={false} onPress={() => setSameOpen(true)} />
      </View>
      <Text variant="caption" color="textFaint">
        Tap a day to edit it. Drag ≡ to reorder. Empty days use: “{GENERIC_INSTRUCTION}”
      </Text>
      <View style={{ height: items.length * SLOT }}>
        {items.map((item, i) => (
          <PlanRow
            key={item.key}
            item={item}
            index={i}
            count={items.length}
            positions={positions}
            onDrop={onDrop}
            onEdit={() => setEditing(item)}
            onMove={(d) => move(i, d)}
          />
        ))}
      </View>

      <DayEditorSheet item={editing} onClose={() => setEditing(null)} onSave={saveEdit} />

      <Sheet visible={sameOpen} onClose={() => setSameOpen(false)} title="Same task every day">
        <Input
          label="Daily instruction"
          multiline
          placeholder="e.g. Open the app, add one entry and check it syncs."
          value={sameText}
          onChangeText={setSameText}
        />
        <Button
          label={`Apply to all ${days} days`}
          onPress={() => {
            commit(withKeys(sameTaskEveryDay(days, sameText)));
            setSameOpen(false);
          }}
        />
      </Sheet>
    </View>
  );
}

function DayEditorSheet({ item, onClose, onSave }: { item: Item | null; onClose: () => void; onSave: (i: Item) => void }) {
  const [draft, setDraft] = useState<Item | null>(item);
  const [lastKey, setLastKey] = useState<string | null>(item?.key ?? null);
  // Reset the draft when a different day is opened (state adjustment during render).
  if ((item?.key ?? null) !== lastKey) {
    setLastKey(item?.key ?? null);
    setDraft(item);
  }
  return (
    <Sheet visible={!!item} onClose={onClose} title={item ? `Day ${item.dayNumber}` : ''}>
      {draft ? (
        <View style={{ gap: space.md }}>
          <Input label="Title" value={draft.title} maxLength={60} onChangeText={(title) => setDraft({ ...draft, title })} />
          <Input
            label="What should testers do?"
            multiline
            maxLength={500}
            value={draft.instruction}
            placeholder={GENERIC_INSTRUCTION}
            onChangeText={(instruction) => setDraft({ ...draft, instruction })}
          />
          <Input
            label="Question (optional)"
            hint="Testers must answer it to complete the day."
            maxLength={200}
            value={draft.question ?? ''}
            onChangeText={(q) => setDraft({ ...draft, question: q || null })}
          />
          <View style={styles.toggleRow}>
            <Text variant="bodyStrong" style={{ flex: 1 }}>
              Require a screenshot
            </Text>
            <Toggle label="Require a screenshot" value={draft.requiresScreenshot} onChange={(v) => setDraft({ ...draft, requiresScreenshot: v })} />
          </View>
          <Button label="Save day" onPress={() => onSave(draft)} />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  quick: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  rowWrap: { position: 'absolute', left: 0, right: 0, height: ROW_H, shadowColor: '#000', shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: radii.lg, borderWidth: 1, paddingLeft: space.md },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, height: '100%' },
  dayChip: { width: 32, height: 32, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 48, height: '100%', alignItems: 'center', justifyContent: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
