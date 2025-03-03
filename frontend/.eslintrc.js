const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const prettier = require("eslint-plugin-prettier");
const jest = require("eslint-plugin-jest");
const react = require("eslint-plugin-react");
const tsParser = require("@typescript-eslint/parser");
const path = require("path");

module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
    "plugin:jest/recommended",
    "plugin:react/recommended",
  ],
  plugins: ["@typescript-eslint", "prettier", "jest", "react"],
  parser: tsParser,
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    browser: true,
    node: true,
    jest: true,
  },
  rules: {
    "prettier/prettier": ["error", { endOfLine: "auto" }],
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "off",
    "prefer-const": "error",
    eqeqeq: "error",
    "consistent-return": "error",
    "max-len": ["error", { code: 120, ignoreComments: true }],
    "no-console": "warn",
    "no-plusplus": ["error", { allowForLoopAfterthoughts: true }],
    "linebreak-style": "off",
    "prefer-destructuring": "off",
    "react/prop-types": "off",
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};
