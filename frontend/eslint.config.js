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
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
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
