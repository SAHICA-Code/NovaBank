// eslint.config.mjs (Flat Config para ESLint 9+)
import next from "eslint-config-next";
import tseslint from "typescript-eslint";

export default [
  // Ignorar carpetas generadas
  {
    ignores: ["node_modules", ".next", "dist", ".vercel"]
  },

  // Config base de Next.js
  ...next,

  // Reglas para TypeScript / TSX
  ...tseslint.config({
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin
    },
    rules: {
      // Relajamos 'any' para que no bloquee build (luego tipamos con calma)
      "@typescript-eslint/no-explicit-any": "off",

      // 'unused vars' en warning, y permite prefijo '_' para silenciarlos
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "ignoreRestSiblings": true }
      ]
    }
  })
];
