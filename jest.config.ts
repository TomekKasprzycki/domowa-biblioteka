import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "./test/tsconfig.json" }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["<rootDir>/test/**/*.spec.ts", "<rootDir>/test/**/*.spec.tsx"],
  modulePathIgnorePatterns: ["<rootDir>/.open-next/"],
  setupFiles: ["<rootDir>/test/setup.ts"],
};

export default config;
