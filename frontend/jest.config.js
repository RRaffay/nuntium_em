const babelJest = require('babel-jest');

module.exports = {
    roots: ['<rootDir>/src'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    moduleDirectories: ['node_modules', 'src'],
    transform: {
        '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
        '^.+\\.mjs$': 'babel-jest',
    },
    transformIgnorePatterns: [
        '/node_modules/(?!(unist-util-visit-parents|unist-util-visit|mdast-util-to-hast|remark-rehype|react-markdown)/)'
    ],
    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.json',
        },
    },
};