import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { Provider } from 'react-redux';

import settingsReducer, { motionPrefChanged } from '@/features/settings/settingsSlice';

import { CardStack } from '../CardStack';

function makeStore(motion: 'reduced' | 'full') {
  const store = configureStore({ reducer: { settings: settingsReducer } });
  store.dispatch(motionPrefChanged(motion));
  return store;
}

const ITEMS = ['Alpha', 'Bravo', 'Charlie', 'Delta'];

async function renderStack(motion: 'reduced' | 'full', props: Partial<React.ComponentProps<typeof CardStack<string>>> = {}) {
  const onSwipe = jest.fn();
  const onRemoved = jest.fn();
  await render(
    <Provider store={makeStore(motion)}>
      <CardStack
        items={ITEMS}
        keyOf={(s) => s}
        onSwipe={onSwipe}
        onRemoved={onRemoved}
        renderCard={(s, isTop) => (
          <Pressable accessibilityRole="button" onPress={() => onSwipe('left')}>
            <Text>{`${s}${isTop ? ' (top)' : ''}`}</Text>
          </Pressable>
        )}
        {...props}
      />
    </Provider>,
  );
  return { onSwipe, onRemoved };
}

describe('CardStack', () => {
  it('renders at most three stacked cards with the first on top', async () => {
    await renderStack('full');
    expect(screen.getByText('Alpha (top)')).toBeTruthy();
    expect(screen.getByText('Bravo', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('Charlie', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText('Delta', { includeHiddenElements: true })).toBeNull();
  });

  it('hides cards behind the top one from screen readers', async () => {
    await renderStack('full');
    expect(screen.queryByText('Bravo')).toBeNull();
    expect(screen.queryByText('Charlie')).toBeNull();
  });

  it('becomes a simple list with every card when reduced motion is on', async () => {
    await renderStack('reduced');
    for (const s of ['Alpha (top)', 'Bravo', 'Charlie', 'Delta']) expect(screen.getByText(s)).toBeTruthy();
  });

  it('lets the card content drive navigation (button fallback)', async () => {
    const { onSwipe } = await renderStack('reduced');
    await fireEvent.press(screen.getByText('Alpha (top)'));
    expect(onSwipe).toHaveBeenCalledWith('left');
  });
});
