import { getStoredToken, handleSessionExpired } from './auth'

async function apiFetch(url) {
  const token = getStoredToken()
  if (!token) {
    handleSessionExpired()
  }

  let response
  try {
    response = await fetch(url, { headers: { Authorization: token } })
  } catch {
    throw new Error('网络错误，请稍后重试')
  }

  if (response.status === 401) {
    handleSessionExpired()
  }

  if (!response.ok) {
    throw new Error(`请求失败（${response.status}）`)
  }

  return response.json()
}

export function getSysInfo() {
  return apiFetch('/api/sys/info')
}

export function getSysState() {
  return apiFetch('/api/sys/state')
}

export function getOsInfo() {
  return apiFetch('/api/os/info')
}

export function getOsState() {
  return apiFetch('/api/os/state')
}
