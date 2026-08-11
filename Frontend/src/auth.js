export function getToken() {
  return localStorage.getItem('token')
}

export function getUser() {
  const raw = localStorage.getItem('user')
  return raw ? JSON.parse(raw) : null
}

export function setSession(token, user) {
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
}

export function isAdmin() {
  return getUser()?.role === 'admin'
}

export function clearSession() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}