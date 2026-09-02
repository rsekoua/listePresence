import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MantineProvider } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { Notifications } from '@mantine/notifications'
import { ModalsProvider } from '@mantine/modals'

// Styles Mantine (l'ordre compte : core en premier)
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/notifications/styles.css'
import 'mantine-datatable/styles.css'
import '@fontsource-variable/inter'
import 'dayjs/locale/fr'

import './index.css'
import { theme, cssVariablesResolver } from './theme'
import { AuthProvider } from './auth/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, staleTime: 30_000 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MantineProvider
        theme={theme}
        cssVariablesResolver={cssVariablesResolver}
        defaultColorScheme="light"
      >
        <DatesProvider settings={{ locale: 'fr', firstDayOfWeek: 1 }}>
          <Notifications position="top-right" autoClose={3500} limit={3} />
          <ModalsProvider>
            <NotificationProvider>
              <AuthProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </AuthProvider>
            </NotificationProvider>
          </ModalsProvider>
        </DatesProvider>
      </MantineProvider>
    </QueryClientProvider>
  </StrictMode>,
)
