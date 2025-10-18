import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from './page'
import { signIn } from 'next-auth/react'

const mockPush = jest.fn()
const mockRefresh = jest.fn()
const mockSearchParamsGet = jest.fn((_: string) => null as string | null)

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => ({
    get: mockSearchParamsGet,
  }),
}))

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParamsGet.mockReturnValue(null)
  })

  it('submits credentials and redirects on success', async () => {
    ;(signIn as jest.Mock).mockResolvedValue({ ok: true, error: null })
    
    // Mock the fetch call to /api/auth/session
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ user: { role: 'patient' } }),
    })

    const user = userEvent.setup()

    render(<LoginPage />)

    await user.type(screen.getByLabelText(/adresse email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/mot de passe/i), 'VerySecurePass1')

    await user.click(screen.getByRole('button', { name: /se connecter/i }))

    expect(signIn).toHaveBeenCalledWith('credentials', {
      email: 'user@example.com',
      password: 'VerySecurePass1',
      redirect: false,
    })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/patient')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('shows error message when credentials are invalid', async () => {
    ;(signIn as jest.Mock).mockResolvedValue({ ok: false, error: 'CredentialsSignin' })
    const user = userEvent.setup()

    render(<LoginPage />)

    await user.type(screen.getByLabelText(/adresse email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/mot de passe/i), 'VerySecurePass1')

    await user.click(screen.getByRole('button', { name: /se connecter/i }))

    await waitFor(() => {
      expect(screen.getByText(/Email ou mot de passe incorrect/i)).toBeInTheDocument()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })
})
