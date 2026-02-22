export async function apiGet(path, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  const resp = await fetch(path, { headers })
  const data = await resp.json()
  return { data }
}

export async function apiPost(path, body = {}, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const resp = await fetch(path, { method: 'POST', headers, body: JSON.stringify(body) })
  const data = await resp.json()
  return { data }
}
