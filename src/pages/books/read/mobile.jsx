import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, List } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import useReader, { MAX_CHAPTER_CHARS } from './useReader'
import ChapterList from './ChapterList'
import ReaderContent from './ReaderContent'

// 移动端阅读页：「目录」抽屉 + 固定底部栏。
function ReaderPageMobile() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const reader = useReader(bookId, location.state)
  const prevLoadingRef = useRef(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  function openChapter(index) {
    reader.setCurrentIndex(index)
    setSheetOpen(false)
  }

  // 章节内容加载完成后，滚动到页面顶部（此时新内容已渲染，位置准确）。
  useEffect(() => {
    const wasLoading = prevLoadingRef.current
    prevLoadingRef.current = reader.contentLoading

    if (wasLoading && !reader.contentLoading && reader.currentIndex != null) {
      window.scrollTo(0, 0)
    }
  }, [reader.contentLoading, reader.currentIndex])

  const displayName = reader.book?.name || '阅读'
  const displayAuthor = reader.book?.author
  const { currentChapter, prevChapter, nextChapter, currentIndex } = reader

  return (
    <div className="flex flex-col gap-4 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/books')} title="返回书架">
            <ArrowLeft />
          </Button>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{displayName}</h2>
            {displayAuthor ? <p className="truncate text-sm text-muted-foreground">{displayAuthor}</p> : null}
          </div>
        </div>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <List className="size-4" />
              目录
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 max-w-[85vw] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{displayName}</SheetTitle>
            </SheetHeader>
            <ChapterList
              chapters={reader.chapters}
              loading={reader.chaptersLoading}
              currentIndex={currentIndex}
              onSelect={openChapter}
              rawExists={reader.rawExists}
            />
          </SheetContent>
        </Sheet>
      </div>

      {reader.chaptersError ? (
        <Alert variant="destructive">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{reader.chaptersError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="min-w-0">
        <div className="border-b pb-3">
          <h3 className="min-w-0 truncate text-base font-semibold">
            {currentChapter?.title || (currentIndex != null ? `第 ${currentIndex + 1} 章` : '正文')}
          </h3>
        </div>

        <div className="pt-3">
          <ReaderContent
            loading={reader.contentLoading}
            error={reader.contentError}
            text={reader.content}
            hasSelection={currentIndex != null}
            tooLarge={reader.contentTooLarge}
            noChapters={!reader.chaptersLoading && reader.chapters.length === 0}
            rawExists={reader.rawExists}
          />
        </div>
      </div>

      {/* 固定底部栏 */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t bg-background/95 px-3 py-2 backdrop-blur"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
      >
        <Button variant="outline" size="sm" className="flex-1" onClick={() => setSheetOpen(true)}>
          <List className="size-4" />
          目录
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={!prevChapter}
          onClick={() => prevChapter && openChapter(prevChapter.index)}
        >
          <ChevronLeft className="size-4" />
          上一章
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={!nextChapter}
          onClick={() => nextChapter && openChapter(nextChapter.index)}
        >
          下一章
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <Dialog
        open={reader.contentTooLarge}
        onOpenChange={(open) => {
          if (!open) reader.dismissContentTooLarge()
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>章节内容过大</DialogTitle>
            <DialogDescription>
              本章正文超过 {MAX_CHAPTER_CHARS.toLocaleString()} 字符，为避免浏览器卡顿已停止加载。可返回书架重新「预处理」分章后再试。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                reader.dismissContentTooLarge()
                navigate('/books')
              }}
            >
              知道了
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ReaderPageMobile
