module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleFileExtensions: ['ts', 'js'],
    testMatch: ['**/test/*.test.(ts|js)'],
    globals: {
        'ts-jest': {
        tsconfig: 'tsconfig.json',
        },
    },
};