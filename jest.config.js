/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  moduleNameMapper: {
    // Resolve @/ path alias to src/
    '^@/(.*)$': '<rootDir>/src/$1',
    // Stub out native/Expo modules that can't run in Node
    '^react-native$': '<rootDir>/src/__tests__/__mocks__/react-native.js',
    '^expo-secure-store$': '<rootDir>/src/__tests__/__mocks__/expo-module.js',
    '^expo-image-manipulator$': '<rootDir>/src/__tests__/__mocks__/expo-module.js',
    '^expo-image-picker$': '<rootDir>/src/__tests__/__mocks__/expo-module.js',
    '^expo-.*$': '<rootDir>/src/__tests__/__mocks__/expo-module.js',
    '^@expo/.*$': '<rootDir>/src/__tests__/__mocks__/expo-module.js',
    '^react-native-.*$': '<rootDir>/src/__tests__/__mocks__/expo-module.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/src/__tests__/__mocks__/expo-module.js',
    '^react-native-get-random-values$': '<rootDir>/src/__tests__/__mocks__/expo-module.js',
    '^react-native-url-polyfill/auto$': '<rootDir>/src/__tests__/__mocks__/expo-module.js',
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
        diagnostics: false,
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  transformIgnorePatterns: ['node_modules/'],
};
