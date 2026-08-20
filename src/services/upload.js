import { getStoredToken, handleSessionExpired } from './auth'

async function sha256Hex(file) {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function apiFetch(url, options = {}) {
  const token = getStoredToken()
  if (!token) {
    handleSessionExpired()
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
    handleSessionExpired()
  }

  if (!response.ok) {
    let message = `上传失败（${response.status}）`
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

// 上传文件：先创建上传信息（含 SHA256 哈希），再上传文件数据。
export async function uploadFile(file) {
  const hash = await sha256Hex(file)

  const created = await apiFetch('/api/upload/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hash, name: file.name, size: file.size }),
  })

  const formData = new FormData()
  formData.append('file', file)

  const uploaded = await apiFetch(`/api/upload/data/${created.file_id}`, {
    method: 'POST',
    body: formData,
  })

  return uploaded
}

// 获取上传文件列表
export async function getUploadList() {
  return apiFetch('/api/upload/list')
}

// 读取（下载）上传文件，返回 Blob
export async function readUploadFile(fileId) {
  const token = getStoredToken()
  if (!token) {
    handleSessionExpired()
  }

  let response
  try {
    response = await fetch(`/api/upload/data/${fileId}`, {
      headers: { Authorization: token },
    })
  } catch {
    throw new Error('网络错误，请稍后重试')
  }

  if (response.status === 401) {
    handleSessionExpired()
  }

  if (!response.ok) {
    throw new Error(`下载失败（${response.status}）`)
  }

  return response.blob()
}
