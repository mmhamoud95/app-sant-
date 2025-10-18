import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterPage from './page'

const mockPush = jest.fn()
const mockAxiosPost = jest.fn()
const mockIsAxiosError = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: (...args: unknown[]) => mockAxiosPost(...args),
    isAxiosError: (value: unknown) => mockIsAxiosError(value),
  },
}))

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsAxiosError.mockReturnValue(false)
    process.env.NEXT_PUBLIC_API_BASE = 'http://localhost:8000/api/v1'
  })

  const completePatientFlow = async () => {
    const user = userEvent.setup()

    render(<RegisterPage />)

  const patientOptions = screen.getAllByText(/Patient/i)
  await user.click(patientOptions[0])
    await user.click(screen.getByRole('button', { name: 'Suivant' }))

  const textInputs = await screen.findAllByRole('textbox')
  const firstNameField = textInputs.find((input) => input.getAttribute('name') === 'firstName')
  const lastNameField = textInputs.find((input) => input.getAttribute('name') === 'lastName')
  const emailField = textInputs.find((input) => input.getAttribute('name') === 'email')
  const phoneField = textInputs.find((input) => input.getAttribute('name') === 'phone')

  expect(firstNameField).toBeDefined()
  expect(lastNameField).toBeDefined()
  expect(emailField).toBeDefined()
  expect(phoneField).toBeDefined()

  await user.type(firstNameField as HTMLInputElement, 'Jane')
  await user.type(lastNameField as HTMLInputElement, 'Doe')
  await user.type(emailField as HTMLInputElement, 'jane@example.com')
  await user.type(phoneField as HTMLInputElement, '0102030405')

    await user.click(screen.getByRole('button', { name: 'Suivant' }))

  const passwordField = document.querySelector('input[name="password"]') as HTMLInputElement | null
  const confirmField = document.querySelector('input[name="passwordConfirm"]') as HTMLInputElement | null

  expect(passwordField).not.toBeNull()
  expect(confirmField).not.toBeNull()

  await user.type(passwordField as HTMLInputElement, 'UltraSecurePwd1')
  await user.type(confirmField as HTMLInputElement, 'UltraSecurePwd1')
  await user.click(screen.getByRole('checkbox', { name: /conditions d'utilisation/i }))

    await user.click(screen.getByRole('button', { name: /Créer mon compte/i }))
  }

  it('submits patient registration data and redirects to login', async () => {
    mockAxiosPost.mockResolvedValue({ data: {} })

    await completePatientFlow()

    await waitFor(() => {
      expect(mockAxiosPost).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/auth/patient/register',
        {
          email: 'jane@example.com',
          password: 'UltraSecurePwd1',
          first_name: 'Jane',
          last_name: 'Doe',
          phone: '0102030405',
          preferred_language: 'fr',
        },
        expect.objectContaining({ headers: expect.any(Object) })
      )
      expect(mockPush).toHaveBeenCalledWith('/auth/login?registered=success')
    })
  })

  it('shows duplicate email error returned by backend', async () => {
    const error = {
      response: {
        status: 400,
        data: { detail: 'Email already registered' },
      },
    }
    mockAxiosPost.mockRejectedValue(error)
    mockIsAxiosError.mockReturnValue(true)

    await completePatientFlow()

    await waitFor(() => {
      expect(
        screen.getByText(/Cet email est déjà utilisé\. Veuillez vous connecter ou utiliser un autre email\./i)
      ).toBeInTheDocument()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })
})
