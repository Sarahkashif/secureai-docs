export interface PasswordCheck {
  id: string
  label: string
  passed: boolean
}

export function checkPassword(password: string): PasswordCheck[] {
  return [
    { id: 'len', label: 'At least 10 characters', passed: password.length >= 10 },
    { id: 'lower', label: 'One lowercase letter', passed: /[a-z]/.test(password) },
    { id: 'upper', label: 'One uppercase letter', passed: /[A-Z]/.test(password) },
    { id: 'num', label: 'One number', passed: /\d/.test(password) },
  ]
}

export const isPasswordValid = (password: string) => checkPassword(password).every((c) => c.passed)
