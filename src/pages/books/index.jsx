import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, BookPlus, Download, Loader2, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import PicViewer from '@/components/PicViewer'
import BookEditDialog from '@/components/BookEditDialog'
import {
  buildRawDownloadName,
  fetchBookCover,
  fetchBookRaw,
  getBookList,
  toFrontendType,
} from '@/services/book'

const TYPE_LABELS = {
  webnovel: '网文',
  doujinshi: '本子',
  imagepack: '图包',
  book: '出版图书',
}

// 「无作者」筛选项的哨兵值（Radix Select 的 value 不能为空字符串）。
const NO_AUTHOR = '__no_author__'

// 拉取封面 Blob：优先文件封面，缺失时回退到老数据的 base64 封面。
async function fetchCover(book) {
  const blob = await fetchBookCover(book.id)
  if (blob) return blob

  if (book.cover) {
    try {
      const res = await fetch(book.cover)
      if (res.ok) return await res.blob()
    } catch {
      // 忽略老数据封面拉取失败
    }
  }

  return null
}

function CoverFallback({ iconClassName = 'size-8' }) {
  return (
    <div className="flex size-full items-center justify-center bg-muted text-muted-foreground/50">
      <BookOpen className={iconClassName} />
    </div>
  )
}

function CoverLoading() {
  return <div className="size-full bg-muted" />
}

function BookshelfPage() {
  const navigate = useNavigate()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [type, setType] = useState('all')
  const [author, setAuthor] = useState('all')
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('bookcocoon-shelf-mode') === 'grid' ? 'grid' : 'list'
  })
  const [editingBook, setEditingBook] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [coverVersion, setCoverVersion] = useState(0)
  const [downloadingId, setDownloadingId] = useState(null)
  const [notice, setNotice] = useState('')
  const noticeTimer = useRef(null)

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    getBookList()
      .then((list) => {
        if (cancelled) return
        setBooks(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message || '加载书籍失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  function handleModeChange(value) {
    setMode(value)
    localStorage.setItem('bookcocoon-shelf-mode', value)
  }

  function handleEdit(book) {
    setEditingBook(book)
    setEditOpen(true)
  }

  function handleSaved(updated) {
    if (!updated) return
    setBooks((prev) => prev.map((book) => (book.id === updated.id ? updated : book)))
    // 封面已改为文件存储，保存后刷新封面（重新拉取文件封面）。
    setCoverVersion((version) => version + 1)
  }

  function showNotice(message) {
    setNotice(message)
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(''), 3000)
  }

  async function handleDownloadRaw(book) {
    setDownloadingId(book.id)

    try {
      const blob = await fetchBookRaw(book.id)
      if (!blob) {
        showNotice(`「${book.name || '未命名'}」暂无原文`)
        return
      }

      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = buildRawDownloadName(book)
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      showNotice(err?.message || '下载原文失败')
    } finally {
      setDownloadingId(null)
    }
  }

  // 从当前书籍中提取去重后的作者列表（按中文排序）。
  const authors = [...new Set(books.map((book) => book.author).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'zh-Hans-CN'),
  )

  // 是否存在未填写作者的书籍。
  const hasNoAuthor = books.some((book) => !book.author)

  const filtered = books.filter((book) => {
    const matchType = type === 'all' || toFrontendType(book.type) === type
    const matchAuthor =
      author === 'all' || (author === NO_AUTHOR ? !book.author : book.author === author)
    return matchType && matchAuthor
  })

  function handleClearFilters() {
    setType('all')
    setAuthor('all')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="webnovel">网文</SelectItem>
              <SelectItem value="doujinshi">本子</SelectItem>
              <SelectItem value="imagepack">图包</SelectItem>
              <SelectItem value="book">出版图书</SelectItem>
            </SelectContent>
          </Select>
          <Select value={author} onValueChange={setAuthor}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="全部作者" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部作者</SelectItem>
              {hasNoAuthor ? <SelectItem value={NO_AUTHOR}>无作者</SelectItem> : null}
              {authors.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">共 {filtered.length} 本</span>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={mode} onValueChange={handleModeChange}>
            <TabsList>
              <TabsTrigger value="list">列表</TabsTrigger>
              <TabsTrigger value="grid">图墙</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" onClick={() => navigate('/books/create')}>
            <BookPlus />
            添加书籍
          </Button>
        </div>
      </div>

      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="py-4">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="mt-2 h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <BookOpen className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            重新加载
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <BookOpen className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {books.length === 0 ? '书架还是空的，添加第一本书吧' : '没有符合条件的书籍，试试调整筛选条件'}
          </p>
          {books.length === 0 ? (
            <Button variant="outline" size="sm" onClick={() => navigate('/books/create')}>
              <BookPlus />
              添加书籍
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              清除筛选
            </Button>
          )}
        </div>
      ) : mode === 'list' ? (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((book) => {
            const frontendType = toFrontendType(book.type)

            return (
              <Card key={book.id}>
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="size-14 shrink-0 overflow-hidden rounded-md border bg-muted">
                      <PicViewer
                        fetcher={() => fetchCover(book)}
                        alt={book.name || '封面'}
                        filePath={book.name || ''}
                        className="size-full"
                        fit="cover"
                        fallback={<CoverFallback iconClassName="size-5" />}
                        loadingFallback={<CoverLoading />}
                        refreshKey={coverVersion}
                      />
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-semibold">{book.name || '未命名'}</h3>
                        <Badge variant="secondary">{TYPE_LABELS[frontendType] ?? frontendType}</Badge>
                      </div>
                      {book.author ? <p className="text-sm text-muted-foreground">{book.author}</p> : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {frontendType === 'webnovel' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadRaw(book)}
                        disabled={downloadingId === book.id}
                        title="下载原文"
                      >
                        {downloadingId === book.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Download className="size-4" />
                        )}
                        原文
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(book)}
                      title="编辑"
                    >
                      <Pencil />
                      <span className="sr-only">编辑</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {filtered.map((book) => (
            <div key={book.id} className="flex flex-col gap-2">
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg border bg-muted">
                <PicViewer
                  fetcher={() => fetchCover(book)}
                  alt={book.name || '封面'}
                  filePath={book.name || ''}
                  className="size-full"
                  fit="cover"
                  fallback={<CoverFallback iconClassName="size-8" />}
                  loadingFallback={<CoverLoading />}
                  refreshKey={coverVersion}
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2 size-8 opacity-90"
                  onClick={() => handleEdit(book)}
                  title="编辑"
                >
                  <Pencil />
                  <span className="sr-only">编辑</span>
                </Button>
                {toFrontendType(book.type) === 'webnovel' ? (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute bottom-2 right-2 size-8 opacity-90"
                    onClick={() => handleDownloadRaw(book)}
                    disabled={downloadingId === book.id}
                    title="下载原文"
                  >
                    {downloadingId === book.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Download className="size-4" />
                    )}
                    <span className="sr-only">下载原文</span>
                  </Button>
                ) : null}
              </div>
              <div className="min-w-0 px-0.5">
                <p className="truncate text-sm font-medium">{book.name || '未命名'}</p>
                {book.author ? (
                  <p className="truncate text-xs text-muted-foreground">{book.author}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <BookEditDialog
        book={editingBook}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={handleSaved}
      />
    </div>
  )
}

export default BookshelfPage
