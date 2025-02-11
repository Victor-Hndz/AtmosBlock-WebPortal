import typescriptEslint from "@typescript-eslint/eslint-plugin";
import prettier from "eslint-plugin-prettier";
import jest from "eslint-plugin-jest";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [...compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
    "plugin:jest/recommended",
), {
    plugins: {
        "@typescript-eslint": typescriptEslint,
        prettier,
        jest,
    },

    languageOptions: {
        globals: {
            ...globals.node,
        },

        parser: tsParser,
        ecmaVersion: 12,
        sourceType: "module",
    },

    rules: {
        "prettier/prettier": ["error", {
            endOfLine: "auto",
        }],

        "@typescript-eslint/no-unused-vars": ["warn", {
            argsIgnorePattern: "^_",
        }],

        "@typescript-eslint/no-explicit-any": "off",
        "prefer-const": "error",
        eqeqeq: "error",
        "consistent-return": "error",

        "max-len": ["error", {
            code: 120,
            ignoreComments: true,
        }],

        "no-console": "warn",

        "no-plusplus": ["error", {
            allowForLoopAfterthoughts: true,
        }],

        "linebreak-style": "off",
        "prefer-destructuring": "off",
        "jest/no-disabled-tests": "warn",
        "jest/no-focused-tests": "error",
        "jest/no-identical-title": "error",
        "jest/prefer-to-have-length": "warn",
        "jest/valid-expect": "error",
    },
}, ...compat.extends("plugin:jest/recommended").map(config => ({
    ...config,
    files: ["test/**", "**/*.test.js"],
})), {
    files: ["test/**", "**/*.test.js"],

    plugins: {
        jest,
    },

    rules: {
        "jest/prefer-expect-assertions": "off",
    },
}];