module.exports = {
  testEnvironment: 'jsdom',
  transform: { '^.+\\.[tj]sx?$': '<rootDir>/test-transform.cjs' },
  transformIgnorePatterns: [],
  moduleNameMapper: { '^src/(.*)$': '<rootDir>/src/$1' },
};
