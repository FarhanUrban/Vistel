/** Returns true when mock services should be used instead of Firebase. Defaults to true unless VITE_USE_MOCK_SERVICES=false. */
export function useMockServices(): boolean {
  const value = import.meta.env.VITE_USE_MOCK_SERVICES
  if (value === 'false') return false
  return true
}
