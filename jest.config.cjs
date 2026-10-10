module.exports = {
  testEnvironment: 'jsdom',
  transform: { '^.+\\.[tj]sx?$': '<rootDir>/test-transform.cjs' },
  transformIgnorePatterns: ['/node_modules/'],
  moduleNameMapper: { '^src/(.*)$': '<rootDir>/src/$1' },
};
