import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, BookPlus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getBooks } from '@/services/book'

const TYPE_LABELS = {
  webnovel: '网文',
  doujinshi: '本子',
  imagepack: '图包',
  book: '出版图书',
}

const READING_STATUS_LABELS = {
  wishlist: '想读',
  reading: '在读',
  finished: '已读',
}

function getSubtitle(book) {
  const parts = []

  if (book.type === 'webnovel') {
    if (book.platform) parts.push(book.platform)
    if (book.genre) parts.push(book.genre)
    if (book.status === 'ongoing') parts.push('连载中')
    else if (book.status === 'completed') parts.push('已完结')
  } else if (book.type === 'doujinshi') {
    if (book.kind) parts.push(book.kind)
    if (book.origin) parts.push(book.origin)
    if (book.pages) parts.push(`${book.pages}P`)
  } else if (book.type === 'imagepack') {
    if (book.format) parts.push(book.format)
    if (book.origin) parts.push(book.origin)
    if (book.image_count) parts.push(`${book.image_count} 张`)
  } else if (book.type === 'book') {
    if (book.publisher) parts.push(book.publisher)
    if (book.publish_year) parts.push(book.publish_year)
    if (book.category) parts.push(book.category)
  }

  return parts.join(' · ')
}

function BookshelfPage() {
  const navigate = useNavigate()
  const [books] = useState(() => getBooks())
  const [type, setType] = useState('all')
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('bookcocoon-shelf-mode') === 'grid' ? 'grid' : 'list'
  })

  function handleModeChange(value) {
    setMode(value)
    localStorage.setItem('bookcocoon-shelf-mode', value)
  }

  const filtered = type === 'all' ? books : books.filter((book) => book.type === type)

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

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <BookOpen className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {type === 'all' ? '书架还是空的，添加第一本书吧' : `暂无「${TYPE_LABELS[type]}」书籍`}
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate('/books/create')}>
            <BookPlus />
            添加书籍
          </Button>
        </div>
      ) : mode === 'list' ? (
        <div className="grid gap-3">
          {filtered.map((book) => {
            const subtitle = getSubtitle(book)

            return (
              <Card key={book.id}>
                <CardContent className="flex items-start justify-between gap-3 py-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-semibold">{book.title || '未命名'}</h3>
                      <Badge variant="secondary">{TYPE_LABELS[book.type] ?? book.type}</Badge>
                    </div>
                    {book.author ? <p className="text-sm text-muted-foreground">{book.author}</p> : null}
                    {subtitle ? <p className="text-sm text-muted-foreground/80">{subtitle}</p> : null}
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {READING_STATUS_LABELS[book.reading_status] ?? '想读'}
                  </Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {filtered.map((book) => (
            <div key={book.id} className="flex flex-col gap-2">
              <div className="aspect-[3/4] overflow-hidden rounded-lg border bg-muted">
                {book.cover ? (
                  <img src={book.cover} alt={book.title || '封面'} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted-foreground/50">
                    <BookOpen className="size-8" />
                  </div>
                )}
              </div>
              <div className="min-w-0 px-0.5">
                <p className="truncate text-sm font-medium">{book.title || '未命名'}</p>
                {book.author ? (
                  <p className="truncate text-xs text-muted-foreground">{book.author}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default BookshelfPage
