const BOOKS_KEY = 'bookcocoon_books'

// 读取本地已保存的书籍列表（供「书架」等页面复用）。
export function getBooks() {
  try {
    return JSON.parse(localStorage.getItem(BOOKS_KEY)) ?? []
  } catch {
    localStorage.removeItem(BOOKS_KEY)
    return []
  }
}

// 创建书籍。
// 注意：后端目前尚未提供书籍接口，此处先模拟请求并写入 localStorage。
// 接入真实后端时，替换为 fetch('/api/books', { method: 'POST', body: ... }) 等真实调用。
export async function createBook(payload) {
  await new Promise((resolve) => setTimeout(resolve, 600))

  const book = {
    id: `${Date.now()}`,
    ...payload,
    created_at: new Date().toISOString(),
  }

  const books = getBooks()
  books.unshift(book)
  localStorage.setItem(BOOKS_KEY, JSON.stringify(books))

  return book
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
