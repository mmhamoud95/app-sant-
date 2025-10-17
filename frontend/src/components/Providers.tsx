"use client"
import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'
import { ChakraProvider, extendTheme as chakraExtendTheme } from '@chakra-ui/react'
import { StyledEngineProvider, ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { SessionProvider } from 'next-auth/react'
import { ReactNode, useState, useMemo } from 'react'

// Emotion Cache avec préfixe pour éviter les conflits
const emotionCache = createCache({ 
  key: 'mui', 
  prepend: true,
  speedy: true 
})

// Palette de couleurs médicales cohérente
const medicalColors = {
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  secondary: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },
  success: {
    main: '#10B981',
    light: '#34D399',
    dark: '#059669',
  },
  error: {
    main: '#EF4444',
    light: '#F87171',
    dark: '#DC2626',
  },
  warning: {
    main: '#F59E0B',
    light: '#FBBF24',
    dark: '#D97706',
  },
  info: {
    main: '#3B82F6',
    light: '#60A5FA',
    dark: '#2563EB',
  },
}

export default function Providers({ children }: { children: ReactNode }) {
  // React Query Client avec options optimisées
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 10, // 10 minutes (anciennement cacheTime)
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            refetchOnWindowFocus: false,
            refetchOnMount: true,
            refetchOnReconnect: 'always',
          },
          mutations: {
            retry: 1,
            onError: (error) => {
              // Logger les erreurs de mutation
              console.error('Mutation error:', error)
            },
          },
        },
      })
  )

  // Theme MUI personnalisé pour le secteur médical
  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'light',
          primary: {
            main: medicalColors.primary[600],
            light: medicalColors.primary[400],
            dark: medicalColors.primary[700],
            contrastText: '#ffffff',
          },
          secondary: {
            main: medicalColors.secondary[600],
            light: medicalColors.secondary[400],
            dark: medicalColors.secondary[700],
            contrastText: '#ffffff',
          },
          success: medicalColors.success,
          error: medicalColors.error,
          warning: medicalColors.warning,
          info: medicalColors.info,
          background: {
            default: '#F9FAFB',
            paper: '#FFFFFF',
          },
          text: {
            primary: '#111827',
            secondary: '#6B7280',
            disabled: '#9CA3AF',
          },
          divider: '#E5E7EB',
        },
        typography: {
          fontFamily: [
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
            '"Apple Color Emoji"',
            '"Segoe UI Emoji"',
            '"Segoe UI Symbol"',
          ].join(','),
          h1: {
            fontWeight: 700,
            fontSize: '2.5rem',
            lineHeight: 1.2,
          },
          h2: {
            fontWeight: 700,
            fontSize: '2rem',
            lineHeight: 1.3,
          },
          h3: {
            fontWeight: 600,
            fontSize: '1.75rem',
            lineHeight: 1.4,
          },
          h4: {
            fontWeight: 600,
            fontSize: '1.5rem',
            lineHeight: 1.4,
          },
          h5: {
            fontWeight: 600,
            fontSize: '1.25rem',
            lineHeight: 1.5,
          },
          h6: {
            fontWeight: 600,
            fontSize: '1rem',
            lineHeight: 1.5,
          },
          button: {
            textTransform: 'none',
            fontWeight: 600,
          },
        },
        shape: {
          borderRadius: 12,
        },
        shadows: [
          'none',
          '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
          '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          '0 25px 50px -12px rgb(0 0 0 / 0.25)',
          '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        ],
        components: {
          MuiButton: {
            defaultProps: {
              disableElevation: true,
            },
            styleOverrides: {
              root: {
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: '0.875rem',
                fontWeight: 600,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-1px)',
                },
              },
              contained: {
                boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                '&:hover': {
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                },
              },
              outlined: {
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                },
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
              rounded: {
                borderRadius: 12,
              },
              elevation1: {
                boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
              },
              elevation2: {
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              },
              elevation3: {
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                border: '1px solid #E5E7EB',
              },
            },
          },
          MuiTextField: {
            defaultProps: {
              variant: 'outlined',
            },
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: 8,
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: medicalColors.primary[400],
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderWidth: 2,
                    borderColor: medicalColors.primary[600],
                  },
                },
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 6,
                fontWeight: 600,
              },
            },
          },
          MuiAlert: {
            styleOverrides: {
              root: {
                borderRadius: 8,
              },
            },
          },
          MuiDialog: {
            styleOverrides: {
              paper: {
                borderRadius: 16,
              },
            },
          },
          MuiTooltip: {
            styleOverrides: {
              tooltip: {
                backgroundColor: '#1F2937',
                fontSize: '0.75rem',
                borderRadius: 6,
                padding: '6px 12px',
              },
            },
          },
        },
      }),
    []
  )

  // Theme Chakra UI personnalisé (si vous l'utilisez)
  const chakraTheme = useMemo(
    () =>
      chakraExtendTheme({
        colors: {
          primary: medicalColors.primary,
          secondary: medicalColors.secondary,
          success: {
            500: medicalColors.success.main,
          },
          error: {
            500: medicalColors.error.main,
          },
        },
        fonts: {
          heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
        config: {
          initialColorMode: 'light',
          useSystemColorMode: false,
        },
      }),
    []
  )

  return (
    <CacheProvider value={emotionCache}>
      <SessionProvider 
        refetchInterval={5 * 60} // Refresh token every 5 min
        refetchOnWindowFocus={true}
      >
        <ChakraProvider theme={chakraTheme}>
          <StyledEngineProvider injectFirst>
            <MuiThemeProvider theme={muiTheme}>
              <CssBaseline enableColorScheme />
              <QueryClientProvider client={queryClient}>
                {children}
                {/* React Query Devtools - uniquement en développement */}
                {process.env.NODE_ENV === 'development' && (
                  <ReactQueryDevtools 
                    initialIsOpen={false} 
                    buttonPosition="bottom-right"
                  />
                )}
              </QueryClientProvider>
            </MuiThemeProvider>
          </StyledEngineProvider>
        </ChakraProvider>
      </SessionProvider>
    </CacheProvider>
  )
}