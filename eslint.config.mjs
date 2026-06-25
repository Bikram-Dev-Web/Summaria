import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import eslintPluginPrettier from "eslint-plugin-prettier"; // 1. Import the plugin

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.config({
    extends: [
      'next/core-web-vitals', 
      'next/typescript', 
      'prettier', 
    ],
  }),
  {
    rules: {
      'react/no-escape-entities': 'off',
    }
  }
];

export default eslintConfig;