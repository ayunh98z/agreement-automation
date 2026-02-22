export function getLoginUserProfile() {
  try {
    const raw = localStorage.getItem('user_data')
    if (!raw) return null
    return JSON.parse(raw)
  } catch (e) {
    return null
  }
}
