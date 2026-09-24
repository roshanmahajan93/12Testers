import { homeHrefFor } from '../guards';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('@/store/hooks', () => ({ useAppSelector: jest.fn() }));

const seen = { developer: true, tester: true };
const base = { status: 'signedIn' as const, role: null, needsTesterSetup: false, intendedRole: null };

describe('homeHrefFor (role-based redirect)', () => {
  it('sends signed-out users to the welcome screen', () => {
    expect(homeHrefFor({ ...base, status: 'signedOut' }, seen)).toBe('/welcome');
  });

  it('new accounts without a role go back to role choice or sign-in', () => {
    expect(homeHrefFor(base, seen)).toBe('/welcome');
    expect(homeHrefFor({ ...base, intendedRole: 'tester' }, seen)).toBe('/sign-in');
  });

  it('testers finish setup first', () => {
    expect(homeHrefFor({ ...base, role: 'tester', needsTesterSetup: true }, seen)).toBe('/tester-setup');
  });

  it('shows onboarding once per role', () => {
    expect(homeHrefFor({ ...base, role: 'developer' }, { developer: false, tester: true })).toBe('/onboarding');
  });

  it('lands each role in its own experience regardless of the entry used', () => {
    expect(homeHrefFor({ ...base, role: 'developer', intendedRole: 'tester' }, seen)).toBe('/dashboard');
    expect(homeHrefFor({ ...base, role: 'tester', intendedRole: 'developer' }, seen)).toBe('/today');
  });
});
