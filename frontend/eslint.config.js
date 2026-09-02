import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Règle advisory (perf) introduite par react-hooks v7. Plusieurs usages
      // légitimes ici suivent le pattern documenté par React (création d'object
      // URL avec nettoyage, réinitialisation d'état à l'ouverture d'un dialog,
      // pré-remplissage d'un formulaire d'édition). On la garde visible en
      // avertissement plutôt que bloquante.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
