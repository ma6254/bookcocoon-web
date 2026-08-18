import { getStoredToken } from './auth'

// 前端类型 → 后端类型常量
const TO_BACKEND_TYPE = {
  webnovel: 'web_novel',
  doujinshi: 'comic',
  imagepack: 'pic_pack',
  book: 'publishing',
}

// 后端类型常量 → 前端类型
const TO_FRONTEND_TYPE = {
  web_novel: 'webnovel',
  comic: 'doujinshi',
  pic_pack: 'imagepack',
  publishing: 'book',
}

export function toBackendType(type) {
  return TO_BACKEND_TYPE[type] ?? type
}

export function toFrontendType(type) {
  return TO_FRONTEND_TYPE[type] ?? type
}

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

// 创建书籍。
// 注意：后端书籍模型目前只保存 name/author/type；封面改为通过 uploadBookCover
// 单独上传为文件。其余富字段（平台、题材、状态、ISBN、出版社、简介等）暂不持久化。
export async function createBook(payload) {
  const { title, author, type } = payload

  return apiFetch('/api/book/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: title,
      author: author || '',
      type: toBackendType(type),
    }),
  })
}

// 获取书籍列表（后端直接返回 Book[]，无需解包）。
export async function getBookList() {
  return apiFetch('/api/book/list')
}

// 更新书籍（仅名称/作者/类型）。
export async function updateBook(bookId, payload) {
  const { title, author, type } = payload

  return apiFetch(`/api/book/update/${bookId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: title,
      author: author || '',
      type: toBackendType(type),
    }),
  })
}

// 上传书籍封面：POST /api/book/cover/{book_id}（multipart，字段 file）。
// 成功时后端返回 200 空 body。
export async function uploadBookCover(bookId, file) {
  const token = getStoredToken()
  if (!token) {
    throw new Error('登录状态已过期，请重新登录')
  }

  const formData = new FormData()
  formData.append('file', file)

  let response
  try {
    response = await fetch(`/api/book/cover/${bookId}`, {
      method: 'POST',
      headers: { Authorization: token },
      body: formData,
    })
  } catch {
    throw new Error('网络错误，请稍后重试')
  }

  if (response.status === 401) {
    throw new Error('登录状态已过期，请重新登录')
  }

  if (!response.ok) {
    let message = `上传封面失败（${response.status}）`
    try {
      const text = (await response.text()).trim()
      if (text) message = text
    } catch {
      // 读取错误信息失败时使用默认文案
    }
    throw new Error(message)
  }

  return true
}

// 获取书籍封面：GET /api/book/cover/{book_id}，返回 Blob；封面不存在（404）时返回 null。
export async function fetchBookCover(bookId) {
  const token = getStoredToken()
  if (!token) {
    throw new Error('登录状态已过期，请重新登录')
  }

  let response
  try {
    response = await fetch(`/api/book/cover/${bookId}`, {
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
    throw new Error(`获取封面失败（${response.status}）`)
  }

  return response.blob()
}

// 上传书籍原始文件：POST /api/book/raw/{book_id}（multipart，字段 file）。
// 成功时后端返回 200 空 body。
export async function uploadBookRaw(bookId, file) {
  const token = getStoredToken()
  if (!token) {
    throw new Error('登录状态已过期，请重新登录')
  }

  const formData = new FormData()
  formData.append('file', file)

  let response
  try {
    response = await fetch(`/api/book/raw/${bookId}`, {
      method: 'POST',
      headers: { Authorization: token },
      body: formData,
    })
  } catch {
    throw new Error('网络错误，请稍后重试')
  }

  if (response.status === 401) {
    throw new Error('登录状态已过期，请重新登录')
  }

  if (!response.ok) {
    let message = `上传原始文件失败（${response.status}）`
    try {
      const text = (await response.text()).trim()
      if (text) message = text
    } catch {
      // 读取错误信息失败时使用默认文案
    }
    throw new Error(message)
  }

  return true
}

// 获取书籍原始文件：GET /api/book/raw/{book_id}，返回 Blob；不存在（404）时返回 null。
export async function fetchBookRaw(bookId) {
  const token = getStoredToken()
  if (!token) {
    throw new Error('登录状态已过期，请重新登录')
  }

  let response
  try {
    response = await fetch(`/api/book/raw/${bookId}`, {
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
    throw new Error(`获取原始文件失败（${response.status}）`)
  }

  return response.blob()
}

// 生成原始文件下载名：书名-作者.txt（无作者时仅书名）。
export function buildRawDownloadName(book) {
  const name = (book?.name || 'raw').trim()
  const author = (book?.author || '').trim()
  return author ? `${name}-${author}.txt` : `${name}.txt`
}

// 模拟从网站导入网文信息：接入真实后端/爬虫接口时替换为真实调用。
export async function importWebNovelFromUrl(url) {
  await new Promise((resolve) => setTimeout(resolve, 800))

  const host = (() => {
    try {
      return new URL(url).hostname
    } catch {
      return ''
    }
  })()

  let platform = '其他'
  if (host.includes('jjwxc')) platform = '晋江文学城'
  else if (host.includes('qidian')) platform = '起点中文网'
  else if (host.includes('fanqie')) platform = '番茄小说'
  else if (host.includes('gongzicp') || host.includes('changpei')) platform = '长佩文学'

  return {
    title: '示例作品名（请核对修改）',
    author: '示例作者（请核对修改）',
    platform,
    genre: '',
    url,
    description: '由链接导入的示例简介，请根据实际情况修改。',
  }
}

// 模拟从豆瓣导入出版图书信息：接入真实后端/爬虫接口时替换为真实调用。
export async function importBookFromDouban(url) {
  await new Promise((resolve) => setTimeout(resolve, 800))

  return {
    title: '示例书名（请核对修改）',
    author: '示例作者（请核对修改）',
    isbn: '',
    publisher: '',
    publish_year: '',
    category: '',
    description: '由豆瓣链接导入的示例简介，请根据实际情况修改。',
  }
}
