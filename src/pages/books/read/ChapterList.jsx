import { BookOpen } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function ChapterList({ chapters, loading, currentIndex, onSelect, rawExists }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="px-2 py-1 text-xs text-muted-foreground">
        {loading ? '加载章节…' : `共 ${chapters.length} 章`}
      </p>

      {loading ? (
        <div className="flex flex-col gap-2 p-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-6 w-full" />
          ))}
        </div>
      ) : chapters.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-3 py-8 text-center">
          <BookOpen className="size-6 text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">
            {rawExists
              ? '原文已上传但未分章，请返回书架点击「预处理」'
              : rawExists === false
                ? '暂无章节，请先上传原文'
                : '暂无章节'}
          </p>
        </div>
      ) : (
        <div className="flex max-h-[70vh] flex-col gap-0.5 overflow-y-auto pr-1">
          {chapters.map((chapter, index) => (
            <button
              key={chapter.index}
              type="button"
              onClick={() => onSelect(chapter.index)}
              className={cn(
                'flex items-baseline gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent',
                chapter.index === currentIndex ? 'bg-accent font-medium' : 'text-muted-foreground',
              )}
            >
              <span className="shrink-0 text-xs tabular-nums opacity-60">{index + 1}</span>
              <span className="min-w-0 truncate">{chapter.title || `第 ${index + 1} 章`}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ChapterList
