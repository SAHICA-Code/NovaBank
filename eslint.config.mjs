// eslint.config.mjs — ESLint 9 (Flat Config) con Next + TS
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  // Ignora carpetas generadas
  { ignores: ["node_modules", ".next", "dist", ".vercel"] },

  // Reglas recomendadas de Next + Core Web Vitals (traducidas a Flat)
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin
    },
    rules: {
      // Equivalente a:
      // "extends": ["next", "next/core-web-vitals"]
      ...(nextPlugin.configs.recommended?.rules ?? {}),
      ...(nextPlugin.configs["core-web-vitals"]?.rules ?? {})
    }
  },

  // Reglas para TypeScript
  ...tseslint.config({
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parser: tseslint.parser },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      // No bloquees por 'any' mientras tipamos con calma
      "@typescript-eslint/no-explicit-any": "off",
      // Aviso (no error) para vars no usadas; permite prefijo "_"
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }
      ]
    }
  })
];
