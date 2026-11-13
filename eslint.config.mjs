// ESLint (config plana). Mesmas regras de antes: next/core-web-vitals.
// O backend (Deno) tem checagem própria em backend/ (deno check).
import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  { ignores: ["backend/**", ".next/**", "node_modules/**", "public/**", "next-env.d.ts"] },
  {
    // Regras novas do eslint-config-next 16 voltadas ao React Compiler, que o projeto não usa.
    // Ficam desligadas para manter o mesmo conjunto de regras de antes da atualização do Next;
    // adotá-las é refatoração à parte (ver backend/docs/RELATORIO-FINAL.md, recomendações).
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },
];

export default config;
