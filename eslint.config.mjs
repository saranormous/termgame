import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Browser globals for src/
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        navigator: "readonly",
        AudioContext: "readonly",
        webkitAudioContext: "readonly",
        URLSearchParams: "readonly",
        requestAnimationFrame: "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }]
    }
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        // Node globals for tests/
        require: "readonly",
        process: "readonly",
        console: "readonly",
        __dirname: "readonly"
      }
    }
  }
];
