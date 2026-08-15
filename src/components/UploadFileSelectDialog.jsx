import { useEffect, useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { getUploadList } from '@/services/upload'

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

function formatTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function UploadFileSelectDialog({ open, onOpenChange, onSelect }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setKeyword('')
      setError('')
      loadFiles()
    }
  }, [open])

  async function loadFiles() {
    setLoading(true)
    setError('')

    try {
      const rows = await getUploadList()
      setFiles(Array.isArray(rows) ? rows : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取列表失败')
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  const normalizedKeyword = keyword.trim().toLowerCase()
  const filtered = normalizedKeyword
    ? files.filter((file) => String(file.name ?? '').toLowerCase().includes(normalizedKeyword))
    : files

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>选择已上传文件</DialogTitle>
          <DialogDescription>从已上传的文件中选择一个关联到本书。</DialogDescription>
        </DialogHeader>

        <Input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="搜索文件名"
        />

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : error ? (
          <p className="py-6 text-center text-sm text-destructive">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">暂无文件</p>
        ) : (
          <div className="max-h-72 overflow-y-auto rounded-md border">
            {filtered.map((file) => (
              <button
                key={file.file_id}
                type="button"
                onClick={() => onSelect(file)}
                className="flex w-full items-center gap-3 border-b px-3 py-2.5 text-left last:border-b-0 hover:bg-accent"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name || '-'}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatSize(file.size)} · {formatTime(file.uploaded_at || file.created_at)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default UploadFileSelectDialog
