import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchBookCover } from '@/services/book'

// 书籍封面：带 Authorization 头拉取文件封面（GET /book/cover/{id}），
// 封面不存在时回退到 fallbackCover（老数据的 base64 字符串），都没有则显示占位图标。
export default function BookCover({
  bookId,
  fallbackCover,
  alt,
  className,
  iconClassName = 'size-8',
  refreshKey = 0,
}) {
  const [src, setSrc] = useState(null)

  useEffect(() => {
    let cancelled = false
    let objectUrl = null

    async function load() {
      let nextSrc = null

      try {
        const blob = await fetchBookCover(bookId)
        if (cancelled) return

        if (blob) {
          objectUrl = URL.createObjectURL(blob)
          nextSrc = objectUrl
        } else if (fallbackCover) {
          nextSrc = fallbackCover
        }
      } catch {
        if (!cancelled && fallbackCover) {
          nextSrc = fallbackCover
        }
      }

      if (!cancelled) {
        setSrc(nextSrc)
      }
    }

    setSrc(null)
    load()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [bookId, fallbackCover, refreshKey])

  if (src) {
    return <img src={src} alt={alt} className={cn('object-cover', className)} />
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center bg-muted text-muted-foreground/50',
        className,
      )}
    >
      <BookOpen className={iconClassName} />
    </div>
  )
}
