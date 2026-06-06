import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [".next/**", "JobPilot/.next/**", "node_modules/**", "output/**", ".playwright-cli/**"],
  },
  ...nextVitals,
];

export default eslintConfig;
