// eslint.config.mjs — ESLint 9 (Flat Config)
import next from "eslint-config-next/flat";
import tseslint from "typescript-eslint";

export default [
  // Ignorar carpetas generadas
  { ignores: ["node_modules", ".next", "dist", ".vercel"] },

  // Base de Next.js (flat)
  ...next,

  // Reglas para TypeScript / TSX
  ...tseslint.config({
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parser: tseslint.parser },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }
      ]
    }
  })
];
