import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { PressableScale } from '@/components/motion/PressableScale';
import { Card, Header, Icon, Screen, Text, type IconName } from '@/components/ui';
import { useDomainConfig } from '@/features/config/configApi';
import { space } from '@/theme/tokens';

interface Section {
  icon: IconName;
  title: string;
  points: string[];
}

function sections(testers: number, days: number): Section[] {
  return [
    {
      icon: 'flag-outline',
      title: 'Why this requirement exists',
      points: [
        `New personal developer accounts must run a closed test with at least ${testers} opted-in testers for ${days} days in a row before applying for production.`,
        'The goal is real-world usage and feedback before the public sees your app. Treat it as a proper beta, not a box to tick.',
      ],
    },
    {
      icon: 'construct-outline',
      title: 'Set up your closed testing track',
      points: [
        'In Play Console, open Testing → Closed testing and create a track (or use the default one).',
        'Upload a build and roll it out to the track. The testing link only works once the release is reviewed and live.',
        'Add testers: either an email list, or a Google Group that anyone can join without approval. Enable joining on the web.',
        'Copy the opt-in link (it looks like play.google.com/apps/testing/<your.package>) — you’ll paste it when listing your app here.',
      ],
    },
    {
      icon: 'people-outline',
      title: 'Using a Google Group',
      points: [
        'Create a group at groups.google.com and set “Who can join” to anyone on the web.',
        'Add the group’s email address as the tester list of your closed track.',
        'Paste the group link in the listing so testers join it before opting in.',
      ],
    },
    {
      icon: 'warning-outline',
      title: 'Mistakes that reset or stall your 14 days',
      points: [
        'Testers who opt out, uninstall or leave the group may stop counting — keep a spare buffer (we reserve 2 extra slots).',
        'Removing testers from the list or switching the tester list type mid-test.',
        'Letting the track go unpublished or pausing it.',
        'Starting with fewer testers than required and hoping to catch up later — the continuous days start once you’re above the bar.',
      ],
    },
    {
      icon: 'chatbubbles-outline',
      title: 'Make the most of testers',
      points: [
        'Write a real 14-day plan: onboarding, core flows, settings, edge cases. Vary the days.',
        'Ask one short question on key days — answers are gold for your production questionnaire.',
        'Rate feedback quality. It rewards careful testers and helps everyone.',
        'Ship at least one update to the closed track based on what you learn.',
      ],
    },
    {
      icon: 'rocket-outline',
      title: 'Applying for production access',
      points: [
        'Describe how you recruited testers, how they used the app and what feedback you received.',
        'Explain what you changed because of testing, and why your app is ready for a wider audience.',
        'Be specific and honest — short vague answers are a common reason for rejection.',
      ],
    },
    {
      icon: 'information-circle-outline',
      title: 'Important',
      points: [
        '12Testers helps you meet the testing requirement and collect feedback. Google alone decides whether production access is granted, and policies can change — always check the current Play Console Help Center.',
      ],
    },
  ];
}

function GuideSection({ section, initiallyOpen }: { section: Section; initiallyOpen: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <Animated.View layout={LinearTransition.springify().damping(20)}>
      <Card>
        <PressableScale onPress={() => setOpen(!open)} haptic="select" accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.head}>
          <Icon name={section.icon} size={20} color="accent" />
          <Text variant="h3" style={{ flex: 1 }}>
            {section.title}
          </Text>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color="textFaint" />
        </PressableScale>
        {open ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.body}>
            {section.points.map((p) => (
              <View key={p} style={styles.point}>
                <Text variant="bodySm" color="accent">
                  •
                </Text>
                <Text variant="bodySm" color="textMuted" style={{ flex: 1 }}>
                  {p}
                </Text>
              </View>
            ))}
          </Animated.View>
        ) : null}
      </Card>
    </Animated.View>
  );
}

export default function Guide() {
  const cfg = useDomainConfig();
  return (
    <Screen>
      <Header title="Closed testing guide" back subtitle="Practical notes for getting through the test" />
      {sections(cfg.TESTERS_REQUIRED, cfg.TEST_DAYS).map((s, i) => (
        <GuideSection key={s.title} section={s} initiallyOpen={i === 0} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 32 },
  body: { gap: space.sm, marginTop: space.md },
  point: { flexDirection: 'row', gap: space.sm },
});
