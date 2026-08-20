import { useEffect, useMemo, useRef, useState } from 'react'
import { checkBookRaw, getBookChapters, getBookList, getChapterContent } from '@/services/book'
import {
  createReadingRecord,
  getReadingRecord,
  updateReadingRecord,
} from '@/services/readingRecord'

// 章节内容字符数阈值：超出后不再渲染，改为弹窗提示，避免浏览器卡死。
export const MAX_CHAPTER_CHARS = 100000

// 阅读页共享逻辑：书籍信息、章节列表、章节内容与上下章定位。
export default function useReader(bookId, initialBook) {
  const [book, setBook] = useState(() =>
    initialBook?.name ? { name: initialBook.name, author: initialBook.author } : null,
  )
  const [chapters, setChapters] = useState([])
  const [chaptersLoading, setChaptersLoading] = useState(true)
  const [chaptersError, setChaptersError] = useState('')

  const [currentIndex, setCurrentIndex] = useState(null)
  const [content, setContent] = useState('')
  const [contentLoading, setContentLoading] = useState(false)
  const [contentError, setContentError] = useState('')
  const [contentTooLarge, setContentTooLarge] = useState(false)
  const [rawExists, setRawExists] = useState(null) // null=未知/未检查
  const [readingRecord, setReadingRecord] = useState(undefined) // undefined=未加载, null=无记录, object=记录
  const [resumed, setResumed] = useState(false)
  const readingRecordRef = useRef(readingRecord)
  readingRecordRef.current = readingRecord

  // 回填书名/作者（直接刷新页面时 location.state 为空，从书籍列表解析）。
  useEffect(() => {
    if (book) return undefined

    let cancelled = false
    getBookList()
      .then((list) => {
        if (cancelled) return
        const found = (Array.isArray(list) ? list : []).find((item) => String(item.id) === bookId)
        if (found) setBook({ name: found.name, author: found.author })
      })
      .catch(() => {
        // 解析失败时保留默认标题
      })

    return () => {
      cancelled = true
    }
  }, [book, bookId])

  // 拉取章节列表。
  useEffect(() => {
    let cancelled = false
    setChaptersLoading(true)
    setChaptersError('')

    getBookChapters(bookId)
      .then((list) => {
        if (cancelled) return
        setChapters(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        if (cancelled) return
        setChaptersError(err?.message || '加载章节失败')
        setChapters([])
        setCurrentIndex(null)
      })
      .finally(() => {
        if (!cancelled) setChaptersLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [bookId])

  // 拉取阅读记录（用于恢复上次阅读位置）。
  useEffect(() => {
    let cancelled = false

    getReadingRecord(bookId)
      .then((record) => {
        if (!cancelled) setReadingRecord(record)
      })
      .catch(() => {
        if (!cancelled) setReadingRecord(null)
      })

    return () => {
      cancelled = true
    }
  }, [bookId])

  // 章节列表与阅读记录都就绪后，确定初始章节（恢复进度或第一章）。
  useEffect(() => {
    if (resumed) return undefined
    if (chaptersLoading || readingRecord === undefined) return undefined

    setResumed(true)

    if (chapters.length === 0) {
      setCurrentIndex(null)
      return undefined
    }

    let target = chapters[0].index
    if (readingRecord && readingRecord.book_index != null) {
      const exists = chapters.some((chapter) => chapter.index === readingRecord.book_index)
      if (exists) target = readingRecord.book_index
    }

    setCurrentIndex(target)
    return undefined
  }, [chaptersLoading, readingRecord, chapters, resumed])

  // 章节为空时，检查原文是否已上传，用于提示是否需要预处理。
  useEffect(() => {
    if (chaptersLoading) return undefined
    if (chapters.length > 0) {
      setRawExists(null)
      return undefined
    }

    let cancelled = false
    setRawExists(null)

    checkBookRaw(bookId)
      .then((exists) => {
        if (!cancelled) setRawExists(exists)
      })
      .catch(() => {
        if (!cancelled) setRawExists(false)
      })

    return () => {
      cancelled = true
    }
  }, [bookId, chaptersLoading, chapters.length])

  // 拉取当前章节内容。
  useEffect(() => {
    if (currentIndex == null) return undefined

    let cancelled = false
    setContentLoading(true)
    setContentError('')
    setContentTooLarge(false)

    getChapterContent(bookId, currentIndex)
      .then((text) => {
        if (cancelled) return
        const value = text ?? ''
        if (value.length > MAX_CHAPTER_CHARS) {
          setContent('')
          setContentTooLarge(true)
        } else {
          setContent(value)
          setContentTooLarge(false)
        }
      })
      .catch((err) => {
        if (cancelled) return
        setContent('')
        setContentTooLarge(false)
        setContentError(err?.message || '加载章节内容失败')
      })
      .finally(() => {
        if (!cancelled) setContentLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [bookId, currentIndex])

  // 保存阅读进度：章节变化时更新阅读记录（无记录则先创建）。
  useEffect(() => {
    if (!resumed || currentIndex == null) return undefined

    async function save() {
      try {
        if (readingRecordRef.current == null) {
          try {
            const created = await createReadingRecord(bookId)
            setReadingRecord(created)
            readingRecordRef.current = created
          } catch {
            // 可能已存在（409），忽略，继续尝试更新
          }
        }
        await updateReadingRecord(bookId, currentIndex)
      } catch {
        // 忽略阅读进度保存失败
      }
    }

    save()
    return undefined
  }, [currentIndex, resumed, bookId])

  const currentPosition = useMemo(
    () => chapters.findIndex((chapter) => chapter.index === currentIndex),
    [chapters, currentIndex],
  )

  const currentChapter = currentPosition >= 0 ? chapters[currentPosition] : null
  const prevChapter = currentPosition > 0 ? chapters[currentPosition - 1] : null
  const nextChapter =
    currentPosition >= 0 && currentPosition < chapters.length - 1 ? chapters[currentPosition + 1] : null

  return {
    book,
    chapters,
    chaptersLoading,
    chaptersError,
    currentIndex,
    setCurrentIndex,
    content,
    contentLoading,
    contentError,
    contentTooLarge,
    dismissContentTooLarge: () => setContentTooLarge(false),
    rawExists,
    currentChapter,
    prevChapter,
    nextChapter,
  }
}
