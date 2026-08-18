import { useMemo } from 'react'
import { BookOpen } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

// 单个渲染块的最大字符数：过大的文本块会让浏览器一次性排版卡顿。
const MAX_CHUNK_CHARS = 2000

// 把超长段落按固定长度硬切分（避免拆开代理对，如 emoji）。
function splitLong(text, size) {
  const parts = []
  for (let i = 0; i < text.length; ) {
    let end = Math.min(i + size, text.length)

    if (end < text.length) {
      const code = text.charCodeAt(end - 1)
      if (code >= 0xd800 && code <= 0xdbff) end -= 1
    }

    parts.push(text.slice(i, end))
    i = end
  }
  return parts
}

// 先按换行拆段，再把超长段落切成小块，避免单次渲染巨大文本导致页面卡死。
function splitContent(text) {
  const chunks = []
  for (const paragraph of text.split('\n')) {
    if (paragraph.length <= MAX_CHUNK_CHARS) {
      chunks.push(paragraph)
    } else {
      chunks.push(...splitLong(paragraph, MAX_CHUNK_CHARS))
    }
  }
  return chunks
}

function ReaderContent({ loading, error, text, hasSelection, tooLarge, noChapters, rawExists }) {
  const chunks = useMemo(() => (text ? splitContent(text) : []), [text])

  if (loading && !text) {
    return (
      <div className="flex flex-col gap-2 py-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>加载失败</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (tooLarge) {
    return <p className="text-sm text-muted-foreground">本章内容过大，已停止加载</p>
  }

  if (noChapters) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center">
        <BookOpen className="size-8 text-muted-foreground/50" />
        {rawExists ? (
          <>
            <p className="text-sm font-medium">原文已上传，需要预处理</p>
            <p className="text-xs text-muted-foreground">请返回书架点击「预处理」生成章节后再阅读</p>
          </>
        ) : rawExists === false ? (
          <p className="text-sm text-muted-foreground">暂无章节，请先上传原文</p>
        ) : (
          <p className="text-sm text-muted-foreground">正在检查章节…</p>
        )}
      </div>
    )
  }

  if (chunks.length > 0) {
    return (
      <div className="space-y-3">
        {chunks.map((chunk, index) => (
          <p
            key={index}
            className="whitespace-pre-wrap text-base leading-8 [content-visibility:auto] [contain-intrinsic-size:auto_2rem]"
          >
            {chunk}
          </p>
        ))}
      </div>
    )
  }

  if (hasSelection) {
    return <p className="text-sm text-muted-foreground">本章暂无内容</p>
  }

  return <p className="text-sm text-muted-foreground">请选择章节开始阅读</p>
}

export default ReaderContent
