import { getStoredToken } from './auth'

async function apiFetch(url, options = {}) {
  const token = getStoredToken()
  if (!token) {
    throw new Error('登录状态已过期，请重新登录')
  }

  let response
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Authorization: token,
        ...(options.headers || {}),
      },
    })
  } catch {
    throw new Error('网络错误，请稍后重试')
  }

  if (response.status === 401) {
    throw new Error('登录状态已过期，请重新登录')
  }

  if (!response.ok) {
    let message = `请求失败（${response.status}）`
    try {
      const text = (await response.text()).trim()
      if (text) message = text
    } catch {
      // 读取错误信息失败时使用默认文案
    }
    throw new Error(message)
  }

  return response.json()
}

// 创建阅读记录：POST /api/reading_record/create，body { book_id }。
export async function createReadingRecord(bookId) {
  return apiFetch('/api/reading_record/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ book_id: Number(bookId) }),
  })
}

// 获取本用户指定书籍的阅读记录；不存在（404）时返回 null。
export async function getReadingRecord(bookId) {
  const token = getStoredToken()
  if (!token) {
    throw new Error('登录状态已过期，请重新登录')
  }

  let response
  try {
    response = await fetch(`/api/reading_record/${bookId}`, {
      headers: { Authorization: token },
    })
  } catch {
    throw new Error('网络错误，请稍后重试')
  }

  if (response.status === 404) {
    return null
  }

  if (response.status === 401) {
    throw new Error('登录状态已过期，请重新登录')
  }

  if (!response.ok) {
    throw new Error(`获取阅读记录失败（${response.status}）`)
  }

  return response.json()
}

// 更新阅读记录：POST /api/reading_record/{book_id}，body { book_index }。
export async function updateReadingRecord(bookId, bookIndex) {
  return apiFetch(`/api/reading_record/${bookId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ book_index: Number(bookIndex) }),
  })
}

// 获取本用户所有阅读记录：GET /api/reading_record，返回 ReadingRecord[]。
export async function getReadingRecordList() {
  return apiFetch('/api/reading_record')
}
