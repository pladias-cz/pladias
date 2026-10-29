import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // eslint-plugin-react-hooks v7: nová "compiler" pravidla zatím jen jako
      // varování – v kódu je ~30 zásahů ve 25 souborech. Postupně opravovat
      // a poté tento override odebrat (pravidla se vrátí na error dle presetu).
      'react-hooks/static-components': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/void-use-memo': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/globals': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/error-boundaries': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-render': 'warn',
      'react-hooks/config': 'warn',
      'react-hooks/gating': 'warn',
      // Konvence `_` prefixu pro záměrně nepoužité parametry/proměnné
      // (adaptery vrstev `_definition`, `_url`, …) – sekce B.2 refactor.md.
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      // Jednotné uvozovky (improvements.md §2.8): single v TS kódu (většinové
      // nastavení), double v JSX atributech (jsx-quotes); avoidEscape dovolí
      // dvojité uvozovky pro řetězce obsahující apostrof.
      'quotes': ['error', 'single', {avoidEscape: true}],
      'jsx-quotes': ['error', 'prefer-double'],
      // Zákaz require() v src/ (improvements.md §4) – kód je ESM-only.
      '@typescript-eslint/no-require-imports': 'error',
    },
  },
  {
    // Kontexty legitimně exportují hooky (useUser, useInstanceConfig, …) vedle
    // Provider komponent – known false-positive react-refresh/only-export-components.
    files: ['src/context/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
