/** Two projects: the RN app (jest-expo) and the Appwrite Functions (plain node). */
const moduleNameMapper = { '^@/(.*)$': '<rootDir>/src/$1' };

module.exports = {
  projects: [
    {
      displayName: 'app',
      preset: 'jest-expo',
      testMatch: ['<rootDir>/src/**/*.test.ts?(x)'],
      setupFiles: ['<rootDir>/jest.setup.ts'],
      moduleNameMapper,
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-.*|@shopify/.*|moti|lottie-react-native|@reduxjs/.*|immer|redux-persist)',
      ],
    },
    {
      displayName: 'functions',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/appwrite/functions/**/*.test.ts'],
      transform: { '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
      moduleNameMapper,
    },
  ],
};
