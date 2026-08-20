import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Download, ImagePlus, Loader2, Save, Upload } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import BookCover from '@/components/BookCover'
import {
  buildRawDownloadName,
  fetchBookRaw,
  toFrontendType,
  updateBook,
  uploadBookCover,
  uploadBookRaw,
} from '@/services/book'

const TYPE_OPTIONS = [
  { value: 'webnovel', label: '网文' },
  { value: 'doujinshi', label: '本子' },
  { value: 'imagepack', label: '图包' },
  { value: 'book', label: '出版图书' },
]

// 封面选择器：未选择新文件时展示当前封面（文件封面，带 token 拉取），
// 选择新文件后展示本地预览，保存时以文件形式上传。
function CoverPicker({ file, onChange, bookId, fallbackCover }) {
  const inputRef = useRef(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return undefined
    }

    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function handleFile(event) {
    const selected = event.target.files?.[0]
    event.target.value = ''
    if (selected) onChange(selected)
  }

  return (
    <div className="flex items-center gap-4 rounded-lg border border-dashed p-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted"
      >
        {file ? (
          <img src={previewUrl} alt="封面预览" className="size-full object-cover" />
        ) : (
          <BookCover
            bookId={bookId}
            fallbackCover={fallbackCover}
            alt="当前封面"
            className="size-full"
            iconClassName="size-6"
          />
        )}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm font-medium">封面</p>
        <p className="text-xs text-muted-foreground">点击左侧区域或下方按钮选择图片</p>
        <div className="mt-1">
          {file ? (
            <Button type="button" variant="outline" size="sm" onClick={() => onChange(null)}>
              移除
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              <ImagePlus />
              选择图片
            </Button>
          )}
        </div>
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}

// 原始文件管理（仅网文支持 .txt）：下载或上传替换。
function RawFileSection({ book }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  async function handleDownload() {
    setDownloading(true)
    setError('')

    try {
      const blob = await fetchBookRaw(book.id)
      if (!blob) {
        setError('暂无原始文件')
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
      setError(err?.message || '下载失败')
    } finally {
      setDownloading(false)
    }
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    setUploading(true)
    setError('')

    try {
      await uploadBookRaw(book.id, file)
    } catch (err) {
      setError(err?.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="grid gap-2">
      <Label>原始文件</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={downloading || uploading}
        >
          {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          {downloading ? '下载中…' : '下载'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || downloading}
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {uploading ? '上传中…' : '上传替换'}
        </Button>
        <input ref={inputRef} type="file" accept=".txt" className="hidden" onChange={handleUpload} />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

// 书籍信息编辑对话框：编辑名称、作者、类型与封面，封面以文件上传保存。
export default function BookEditDialog({ book, open, onOpenChange, onSaved }) {
  const [name, setName] = useState('')
  const [author, setAuthor] = useState('')
  const [type, setType] = useState('webnovel')
  const [coverFile, setCoverFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 打开对话框时，用当前书籍数据回填表单。
  useEffect(() => {
    if (!open || !book) return

    setName(book.name || '')
    setAuthor(book.author || '')
    setType(toFrontendType(book.type))
    setCoverFile(null)
    setError('')
    setLoading(false)
  }, [open, book])

  async function handleSave(event) {
    event.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('请输入书籍名称')
      return
    }

    setLoading(true)
    setError('')

    try {
      const updated = await updateBook(book.id, {
        title: trimmedName,
        author: author.trim(),
        type,
      })

      if (coverFile) {
        await uploadBookCover(book.id, coverFile)
      }

      onSaved?.(updated, { coverChanged: !!coverFile })
      onOpenChange(false)
    } catch (err) {
      setError(err?.message || '保存失败')
    } finally {
      setLoading(false)
    }
  }

  if (!book) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle>编辑书籍信息</DialogTitle>
            <DialogDescription>修改书籍名称、作者、类型或封面。</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-book-name">
                书籍名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-book-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="请输入书籍名称"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-book-author">作者</Label>
              <Input
                id="edit-book-author"
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                placeholder="请输入作者名称"
              />
            </div>

            <div className="grid gap-2">
              <Label>类型</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>封面</Label>
              <CoverPicker
                file={coverFile}
                onChange={setCoverFile}
                bookId={book.id}
                fallbackCover={book.cover}
              />
            </div>

            {type === 'webnovel' ? <RawFileSection book={book} /> : null}

            {error ? (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>保存失败</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {loading ? '保存中…' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
