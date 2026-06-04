export function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  }
}
