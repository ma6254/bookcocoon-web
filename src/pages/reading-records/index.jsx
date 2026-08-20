import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, BookText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import BookCover from '@/components/BookCover'
import { getBookList, getChapterInfo, toFrontendType } from '@/services/book'
import { getReadingRecordList } from '@/services/readingRecord'
import { formatDateTime, formatRelativeTime } from '@/lib/formatTime'

const TYPE_LABELS = {
  webnovel: '网文',
  doujinshi: '本子',
  imagepack: '图包',
  book: '出版图书',
}

function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
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

function ReadingRecordsPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState([])
  const [bookMap, setBookMap] = useState({})
  const [chapterTitleMap, setChapterTitleMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    Promise.all([getReadingRecordList(), getBookList()])
      .then(async ([recordList, bookList]) => {
        if (cancelled) return

        const map = {}
        for (const book of Array.isArray(bookList) ? bookList : []) {
          map[String(book.id)] = book
        }

        const list = Array.isArray(recordList) ? recordList : []
        list.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))

        setRecords(list)
        setBookMap(map)

        // 拉取每本书上次读到的章节标题。
        const titles = {}
        await mapWithConcurrency(list, 6, async (record) => {
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
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message || '加载阅读记录失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  function handleRead(record) {
    const book = bookMap[String(record.book_id)]
    const path = isMobileViewport()
      ? `/books/read/m/${record.book_id}`
      : `/books/read/${record.book_id}`
    navigate(path, { state: { name: book?.name, author: book?.author } })
  }

  return (
    <div className="flex flex-col gap-4">
      {loading ? (
        <div className="grid grid-cols-1 gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="flex items-center gap-2 py-1.5 px-3">
                <div className="aspect-[3/4] w-16 shrink-0 rounded-md bg-muted sm:w-20" />
                <div className="flex min-w-0 flex-1 flex-col gap-1 py-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
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
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <BookOpen className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">暂无阅读记录，去书架挑本书开始阅读吧</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/books')}>
            前往书架
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {records.map((record) => {
            const book = bookMap[String(record.book_id)]
            const frontendType = book ? toFrontendType(book.type) : 'webnovel'
            const chapterTitle = chapterTitleMap[`${record.book_id}:${record.book_index}`]

            return (
              <Card key={record.book_id}>
                <CardContent className="flex items-center gap-2 py-1.5 px-3">
                  <div className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-md border bg-muted sm:w-20">
                    <BookCover
                      bookId={record.book_id}
                      fallbackCover={book?.cover}
                      alt={book?.name || '封面'}
                      className="size-full"
                      iconClassName="size-7"
                    />
                    <Badge variant="secondary" className="absolute right-1 top-1 px-1 py-0.5">
                      {TYPE_LABELS[frontendType] ?? frontendType}
                    </Badge>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1 justify-between">
                    <div className="flex min-w-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRead(record)}
                        className="min-w-0 truncate text-left text-base font-semibold hover:underline"
                      >
                        {book?.name || `书籍 #${record.book_id}`}
                      </button>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{book?.author || '未知作者'}</p>
                    {book?.created_at ? (
                      <p className="truncate text-xs text-muted-foreground">
                        创建于 {formatDateTime(book.created_at)}
                      </p>
                    ) : null}
                    <p
                      className="truncate text-xs text-muted-foreground"
                      title={record.updated_at || undefined}
                    >
                      读到{chapterTitle ? `「${chapterTitle}」` : `第 ${record.book_index + 1} 章`}
                      {record.updated_at ? ` · ${formatRelativeTime(record.updated_at)}` : ''}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => handleRead(record)}>
                    <BookText className="size-4" />
                    继续阅读
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ReadingRecordsPage
