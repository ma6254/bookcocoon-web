import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, BookPlus, BookText, CircleAlert, Download, Loader2, MoreHorizontal, Pencil, RefreshCw, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import PicViewer from '@/components/PicViewer'
import BookEditDialog from '@/components/BookEditDialog'
import {
  buildRawDownloadName,
  checkBookRaw,
  fetchBookCover,
  fetchBookRaw,
  getBookChapters,
  getBookList,
  getChapterContent,
  getChapterInfo,
  preprocessBookRaw,
  toFrontendType,
} from '@/services/book'
import { getReadingRecordList } from '@/services/readingRecord'
import { formatDateTime, formatRelativeTime } from '@/lib/formatTime'

const TYPE_LABELS = {
  webnovel: '网文',
  doujinshi: '本子',
  imagepack: '图包',
  book: '出版图书',
}

// 「无作者」筛选项的哨兵值（Radix Select 的 value 不能为空字符串）。
const NO_AUTHOR = '__no_author__'

// 统计 UTF-8 字符数（按 Unicode 码点计数，排除空白字符）。
function countChars(text) {
  let count = 0
  for (const ch of text) {
    if (!/\s/.test(ch)) count += 1
  }
  return count
}

// 以有限并发执行异步任务，返回与输入顺序一致的结果数组。
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length)
  let cursor = 0

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await fn(items[index], index)
    }
  })

  await Promise.all(workers)
  return results
}

// 是否处于移动端视口（与 Tailwind 的 md 断点一致，768px）。
function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
}

// 拉取封面 Blob：优先文件封面，缺失或拉取失败时回退到老数据的 base64 封面。
async function fetchCover(book) {
  try {
    const blob = await fetchBookCover(book.id)
    if (blob) return blob
  } catch {
    // 文件封面拉取失败（网络错误等）时继续尝试老数据封面
  }

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

function BookActionsMenu({ book, onRead, onPreprocess, onDownloadRaw, onEdit, downloading, triggerClassName }) {
  const isWebNovel = toFrontendType(book.type) === 'webnovel'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="操作" className={triggerClassName}>
          <MoreHorizontal />
          <span className="sr-only">操作</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isWebNovel ? (
          <DropdownMenuItem onClick={() => onRead(book)}>
            <BookText className="size-4" />
            阅读
          </DropdownMenuItem>
        ) : null}
        {isWebNovel ? (
          <DropdownMenuItem onClick={() => onPreprocess(book)}>
            <RefreshCw className="size-4" />
            预处理章节
          </DropdownMenuItem>
        ) : null}
        {isWebNovel ? (
          <DropdownMenuItem onClick={() => onDownloadRaw(book)} disabled={downloading}>
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            下载原文
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={() => onEdit(book)}>
          <Pencil className="size-4" />
          编辑
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ChapterHint({ status }) {
  if (!status || status.chapterCount !== 0) return null

  let icon = null
  let label = ''

  if (status.rawExists === true) {
    icon = <TriangleAlert className="size-4 text-amber-500" />
    label = '已上传原文，未预处理'
  } else if (status.rawExists === false) {
    icon = <CircleAlert className="size-4 text-muted-foreground" />
    label = '未上传原文'
  }

  if (!icon) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function BookshelfPage() {
  const navigate = useNavigate()
  const [books, setBooks] = useState([])
  const [readingRecordMap, setReadingRecordMap] = useState({})
  const [chapterTitleMap, setChapterTitleMap] = useState({})
  const [bookStatusMap, setBookStatusMap] = useState({})
  const [statusVersion, setStatusVersion] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [type, setType] = useState('all')
  const [author, setAuthor] = useState('all')
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('bookcocoon-shelf-mode') === 'grid' ? 'grid' : 'list'
  })
  const [editingBook, setEditingBook] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [coverRefreshMap, setCoverRefreshMap] = useState({})
  const [downloadingId, setDownloadingId] = useState(null)
  const [notice, setNotice] = useState('')
  const noticeTimer = useRef(null)
  const [preprocessOpen, setPreprocessOpen] = useState(false)
  const [preprocessTarget, setPreprocessTarget] = useState(null)
  const [preprocessPhase, setPreprocessPhase] = useState('confirm') // confirm | processing | result | error
  const [preprocessChapters, setPreprocessChapters] = useState([])
  const [preprocessError, setPreprocessError] = useState('')

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

    // 拉取阅读记录，用于在书架显示阅读进度。
    getReadingRecordList()
      .then((list) => {
        if (cancelled) return
        const map = {}
        for (const record of Array.isArray(list) ? list : []) {
          map[String(record.book_id)] = record
        }
        setReadingRecordMap(map)
      })
      .catch(() => {
        // 阅读记录拉取失败不影响书架展示
      })

    return () => {
      cancelled = true
    }
  }, [])

  // 拉取网文的章节数与原文状态，用于 0 章节提示。
  useEffect(() => {
    const webNovels = books.filter((book) => toFrontendType(book.type) === 'webnovel')
    if (webNovels.length === 0) return undefined

    let cancelled = false

    async function load() {
      await mapWithConcurrency(webNovels, 4, async (book) => {
        try {
          const chapters = await getBookChapters(book.id)
          if (cancelled) return
          const count = Array.isArray(chapters) ? chapters.length : 0

          setBookStatusMap((prev) => ({
            ...prev,
            [String(book.id)]: { ...prev[String(book.id)], chapterCount: count },
          }))

          if (count === 0) {
            const exists = await checkBookRaw(book.id)
            if (cancelled) return
            setBookStatusMap((prev) => ({
              ...prev,
              [String(book.id)]: { ...prev[String(book.id)], rawExists: exists },
            }))
          } else {
            setBookStatusMap((prev) => ({
              ...prev,
              [String(book.id)]: { ...prev[String(book.id)], rawExists: null },
            }))
          }
        } catch {
          // 忽略单本书状态拉取失败
        }
      })
    }

    load()

    return () => {
      cancelled = true
    }
  }, [books, statusVersion])

  // 拉取每本书上次读到的章节标题。
  useEffect(() => {
    const records = Object.values(readingRecordMap)
    if (records.length === 0) return undefined

    let cancelled = false

    async function load() {
      const titles = {}
      await mapWithConcurrency(records, 6, async (record) => {
        try {
          const info = await getChapterInfo(record.book_id, record.book_index)
          if (!cancelled && info) {
            titles[`${record.book_id}:${record.book_index}`] = info.title
          }
        } catch {
          // 忽略单条章节信息拉取失败
        }
      })
      if (!cancelled) setChapterTitleMap(titles)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [readingRecordMap])

  function handleModeChange(value) {
    setMode(value)
    localStorage.setItem('bookcocoon-shelf-mode', value)
  }

  function handleEdit(book) {
    setEditingBook(book)
    setEditOpen(true)
  }

  function handleRead(book) {
    const path = isMobileViewport() ? `/books/read/m/${book.id}` : `/books/read/${book.id}`
    navigate(path, { state: { name: book.name, author: book.author } })
  }

  function handlePreprocess(book) {
    setPreprocessTarget(book)
    setPreprocessPhase('confirm')
    setPreprocessChapters([])
    setPreprocessError('')
    setPreprocessOpen(true)
  }

  async function handleConfirmPreprocess() {
    if (!preprocessTarget) return

    setPreprocessPhase('processing')
    setPreprocessError('')

    try {
      await preprocessBookRaw(preprocessTarget.id)

      // 预处理后刷新书架上的章节状态（0 章节提示）。
      setStatusVersion((version) => version + 1)

      const chapters = await getBookChapters(preprocessTarget.id)
      const list = (Array.isArray(chapters) ? chapters : []).map((chapter) => ({
        ...chapter,
        charCount: null,
      }))

      setPreprocessChapters(list)
      setPreprocessPhase('result')

      // 流式统计：每完成一章就更新该章字数，不等全部完成。
      mapWithConcurrency(list, 6, async (chapter) => {
        let charCount = 0
        try {
          const text = await getChapterContent(preprocessTarget.id, chapter.index)
          charCount = countChars(text ?? '')
        } catch {
          charCount = 0
        }

        setPreprocessChapters((prev) =>
          prev.map((item) => (item.index === chapter.index ? { ...item, charCount } : item)),
        )
      })
    } catch (err) {
      setPreprocessError(err?.message || '预处理失败')
      setPreprocessPhase('error')
    }
  }

  function handleClosePreprocess() {
    setPreprocessOpen(false)
    setPreprocessTarget(null)
    setPreprocessPhase('confirm')
    setPreprocessChapters([])
    setPreprocessError('')
  }

  function handleSaved(updated, options = {}) {
    if (!updated) return
    setBooks((prev) =>
      prev.map((book) =>
        // 后端 update 接口不接收/不返回 cover 字段，用原对象合并响应，保留老 base64 封面数据，
        // 避免编辑书名/作者后书架封面立刻丢失。
        book.id === updated.id ? { ...book, ...updated, cover: book.cover } : book,
      ),
    )
    // 只有确实上传了新封面时才刷新该书的封面，避免书名/作者改动也触发闪烁。
    if (options?.coverChanged) {
      setCoverRefreshMap((prev) => ({ ...prev, [updated.id]: (prev[updated.id] ?? 0) + 1 }))
    }
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
            const readingRecord = readingRecordMap[String(book.id)]
            const status = bookStatusMap[String(book.id)]
            const chapterTitle = readingRecord
              ? chapterTitleMap[`${book.id}:${readingRecord.book_index}`]
              : undefined

            return (
              <Card key={book.id} className="overflow-hidden">
                <CardContent className="flex items-start gap-2 py-1.5 px-3">
                  <div className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-md border bg-muted sm:w-20">
                    <PicViewer
                      fetcher={() => fetchCover(book)}
                      alt={book.name || '封面'}
                      filePath={book.name || ''}
                      className="size-full"
                      fit="contain"
                      fallback={<CoverFallback iconClassName="size-7" />}
                      loadingFallback={<CoverLoading />}
                      refreshKey={coverRefreshMap[book.id] ?? 0}
                    />
                    <Badge variant="secondary" className="absolute right-1 top-1 px-1 py-0.5">
                      {TYPE_LABELS[frontendType] ?? frontendType}
                    </Badge>
                    {status && status.chapterCount === 0 ? (
                      <span className="absolute left-1 top-1 flex size-6 items-center justify-center rounded-md bg-background/70 opacity-90">
                        <ChapterHint status={status} />
                      </span>
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1 justify-between">
                    <div className="flex min-w-0 items-center gap-2">
                      {frontendType === 'webnovel' ? (
                        <button
                          type="button"
                          onClick={() => handleRead(book)}
                          title="阅读"
                          className="min-w-0 truncate text-left text-base font-semibold hover:underline"
                        >
                          {book.name || '未命名'}
                        </button>
                      ) : (
                        <h3 className="min-w-0 truncate text-base font-semibold">{book.name || '未命名'}</h3>
                      )}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{book.author || '未知作者'}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      创建于 {formatDateTime(book.created_at)}
                    </p>
                    {readingRecord ? (
                      <p
                        className="truncate text-xs text-muted-foreground"
                        title={readingRecord.updated_at || undefined}
                      >
                        读到{chapterTitle ? `「${chapterTitle}」` : `第 ${readingRecord.book_index + 1} 章`}
                        {readingRecord.updated_at ? ` · ${formatRelativeTime(readingRecord.updated_at)}` : ''}
                      </p>
                    ) : null}
                  </div>
                  <BookActionsMenu
                    book={book}
                    onRead={handleRead}
                    onPreprocess={handlePreprocess}
                    onDownloadRaw={handleDownloadRaw}
                    onEdit={handleEdit}
                    downloading={downloadingId === book.id}
                  />
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {filtered.map((book) => {
            const status = bookStatusMap[String(book.id)]

            return (
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
                    refreshKey={coverRefreshMap[book.id] ?? 0}
                  />
                  <BookActionsMenu
                    book={book}
                    onRead={handleRead}
                    onPreprocess={handlePreprocess}
                    onDownloadRaw={handleDownloadRaw}
                    onEdit={handleEdit}
                    downloading={downloadingId === book.id}
                    triggerClassName="absolute top-2 right-2 size-8 bg-background/70 opacity-90"
                  />
                  {status && status.chapterCount === 0 ? (
                    <span className="absolute top-2 left-2 flex size-8 items-center justify-center rounded-md bg-background/70 opacity-90">
                      <ChapterHint status={status} />
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0 px-0.5">
                  {toFrontendType(book.type) === 'webnovel' ? (
                    <button
                      type="button"
                      onClick={() => handleRead(book)}
                      title="阅读"
                      className="block w-full truncate text-left text-sm font-medium hover:underline"
                    >
                      {book.name || '未命名'}
                    </button>
                  ) : (
                    <p className="truncate text-sm font-medium">{book.name || '未命名'}</p>
                  )}
                  <p className="truncate text-xs text-muted-foreground">{book.author || '未知作者'}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    创建于 {formatDateTime(book.created_at)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <BookEditDialog
        book={editingBook}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={handleSaved}
      />

      <Dialog
        open={preprocessOpen}
        onOpenChange={(open) => {
          if (open) return
          if (preprocessPhase === 'processing') return // 处理中不允许关闭
          handleClosePreprocess()
        }}
      >
        <DialogContent className="sm:max-w-md">
          {preprocessPhase === 'confirm' ? (
            <>
              <DialogHeader>
                <DialogTitle>预处理章节</DialogTitle>
                <DialogDescription>
                  将对「{preprocessTarget?.name || '未命名'}」的原文重新分章，已存在的章节会被覆盖。是否继续？
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={handleClosePreprocess}>
                  取消
                </Button>
                <Button onClick={handleConfirmPreprocess}>确定</Button>
              </DialogFooter>
            </>
          ) : preprocessPhase === 'processing' ? (
            <>
              <DialogHeader>
                <DialogTitle>正在预处理…</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">正在解析原文并拆分章节…</p>
              </div>
            </>
          ) : preprocessPhase === 'result' ? (
            <>
              <DialogHeader>
                <DialogTitle>预处理完成</DialogTitle>
                <DialogDescription>
                  「{preprocessTarget?.name || '未命名'}」共解析出 {preprocessChapters.length} 章。
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-64 overflow-y-auto rounded-md border">
                {preprocessChapters.length > 0 ? (
                  preprocessChapters.map((chapter, index) => (
                    <div
                      key={chapter.index}
                      className="flex items-baseline gap-2 border-b px-3 py-1.5 text-sm last:border-b-0"
                    >
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                      <span className="min-w-0 flex-1 truncate">{chapter.title || `第 ${index + 1} 章`}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {chapter.charCount == null ? '统计中…' : `${chapter.charCount} 字`}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="px-3 py-8 text-center text-sm text-muted-foreground">未解析出章节</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleClosePreprocess}>
                  知道了
                </Button>
                <Button
                  disabled={preprocessChapters.length === 0}
                  onClick={() => {
                    handleClosePreprocess()
                    handleRead(preprocessTarget)
                  }}
                >
                  立即阅读
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>预处理失败</DialogTitle>
                <DialogDescription>{preprocessError}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={handleClosePreprocess}>关闭</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BookshelfPage
