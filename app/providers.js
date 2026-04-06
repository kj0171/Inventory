'use client'

import { MantineProvider, createTheme } from '@mantine/core'
import { AuthProvider } from '../frontend/shared/auth'

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  headings: {
    fontWeight: '600',
    sizes: {
      h3: { fontSize: '1.15rem' },
    },
  },
  components: {
    Modal: {
      styles: {
        title: { fontWeight: 700, fontSize: '1.1rem', color: '#1a1a1a' },
      },
    },
    Table: {
      styles: {
        th: { fontWeight: 700, color: '#333', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.3px' },
      },
    },
    Badge: {
      styles: {
        root: { textTransform: 'none' },
      },
    },
  },
})

export default function Providers({ children }) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <AuthProvider>
        {children}
      </AuthProvider>
    </MantineProvider>
  )
}
