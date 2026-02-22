export function getAccessTokenFromLocalStorage() {
  return localStorage.getItem('access_token') || ''
}
