import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const customRules = {
  "react-hooks/exhaustive-deps": "warn",
  "react-hooks/set-state-in-effect": "warn",
  "@typescript-eslint/no-unused-vars": "warn",
  "@typescript-eslint/no-explicit-any": "warn",
  "@typescript-eslint/no-require-imports": "warn",
  "react-hooks/immutability": "warn",
};

const eslintConfig = [
  ...nextVitals.map(c => ({ ...c, rules: { ...c.rules, ...customRules } })),
  ...nextTs.map(c => ({ ...c, rules: { ...c.rules, ...customRules } })),
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
