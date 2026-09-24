import { feedbackSchema, googleGroupUrlSchema, optInUrlFor, PACKAGE_NAME_REGEX, saveAppSchema, testerSetupSchema } from '../validators';

describe('package names', () => {
  it.each(['com.example.app', 'io.x9.My_App', 'a.b'])('accepts %s', (p) => {
    expect(PACKAGE_NAME_REGEX.test(p)).toBe(true);
  });
  it.each(['example', 'com..app', '1com.app', 'com.1app', 'com.app.', 'com app'])('rejects %s', (p) => {
    expect(PACKAGE_NAME_REGEX.test(p)).toBe(false);
  });
  it('builds the opt-in link', () => {
    expect(optInUrlFor('com.example.app')).toBe('https://play.google.com/apps/testing/com.example.app');
  });
});

describe('schemas', () => {
  const app = {
    name: 'Pocket Budget',
    shortDescription: 'A tiny envelope-budgeting app.',
    category: 'finance',
    packageName: 'com.example.pocket',
    optInUrl: optInUrlFor('com.example.pocket'),
    googleGroupUrl: null,
    iconFileId: null,
    minReputation: 0,
    minAndroidVersion: 0,
    generalInstructions: '',
    plan: [],
  };

  it('validates a new app', () => {
    expect(saveAppSchema.safeParse(app).success).toBe(true);
    expect(saveAppSchema.safeParse({ ...app, packageName: 'bad' }).success).toBe(false);
    expect(saveAppSchema.safeParse({ ...app, optInUrl: 'http://insecure.example' }).success).toBe(false);
  });

  it('only accepts Google Groups links for the group', () => {
    expect(googleGroupUrlSchema.safeParse('https://groups.google.com/g/testers').success).toBe(true);
    expect(googleGroupUrlSchema.safeParse('https://example.com/group').success).toBe(false);
  });

  it('never lets the client send privileged fields through setup', () => {
    const parsed = testerSetupSchema.parse({
      displayName: 'Asha',
      deviceModel: 'Pixel 8',
      androidVersion: 14,
      country: 'India',
      languages: ['English'],
      maxActiveTests: 3,
      credits: 9999,
      reputation: 100,
    });
    expect(parsed).not.toHaveProperty('credits');
    expect(parsed).not.toHaveProperty('reputation');
  });

  it('caps feedback attachments', () => {
    const base = { appId: 'a1', taskId: null, type: 'bug', severity: 'low', title: 'Crash on save', body: 'It crashes when I tap save.', deviceInfo: null };
    expect(feedbackSchema.safeParse({ ...base, attachmentFileIds: ['1', '2', '3', '4'] }).success).toBe(true);
    expect(feedbackSchema.safeParse({ ...base, attachmentFileIds: ['1', '2', '3', '4', '5'] }).success).toBe(false);
  });
});
