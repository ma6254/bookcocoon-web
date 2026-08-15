import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ExternalLink, FolderOpen, ImagePlus, Link2, Loader2, Paperclip, Save, Upload } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { createBook, importBookFromDouban, importWebNovelFromUrl } from '@/services/book'
import { uploadFile } from '@/services/upload'
import UploadFileSelectDialog from '@/components/UploadFileSelectDialog'

const READING_STATUSES = [
  { value: 'wishlist', label: '想读' },
  { value: 'reading', label: '在读' },
  { value: 'finished', label: '已读' },
]

const WEB_PLATFORMS = ['起点中文网', '晋江文学城', '番茄小说', '长佩文学', '其他']
const WEB_GENRES = ['玄幻', '都市', '言情', '科幻', '悬疑', '历史', '其他']
const SERIAL_STATUSES = [
  { value: 'ongoing', label: '连载中' },
  { value: 'completed', label: '已完结' },
]
const DOUJIN_KINDS = ['漫画', '小说', '插画', '其他']
const IMAGE_FORMATS = ['JPG', 'PNG', '压缩包', '其他']
const BOOK_CATEGORIES = ['文学', '科技', '历史', '经济', '心理', '传记', '其他']

function FieldLabel({ htmlFor, required, children }) {
  return (
    <Label htmlFor={htmlFor}>
      <span>
        {children}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
    </Label>
  )
}

function FormFeedback({ errorMessage }) {
  return (
    <>
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>保存失败</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}
    </>
  )
}

function FormActions({ loading }) {
  return (
    <div className="flex justify-end">
      <Button type="submit" disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        {loading ? '保存中…' : '保存'}
      </Button>
    </div>
  )
}

function CoverUpload({ cover, onChange }) {
  const inputRef = useRef(null)

  function handleFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => onChange(reader.result)
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex items-center gap-4 rounded-lg border border-dashed p-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted"
      >
        {cover ? (
          <img src={cover} alt="封面预览" className="size-full object-cover" />
        ) : (
          <ImagePlus className="size-6 text-muted-foreground" />
        )}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm font-medium">上传封面</p>
        <p className="text-xs text-muted-foreground">支持 JPG / PNG，点击左侧区域选择图片</p>
        <div className="mt-1">
          {cover ? (
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

function FileUpload({ file, onChange, accept, hint = '支持电子书、压缩包等文件' }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  async function handleFile(event) {
    const selectedFile = event.target.files?.[0]
    event.target.value = ''

    if (!selectedFile) return

    setUploading(true)
    setError('')

    try {
      const info = await uploadFile(selectedFile)
      onChange({
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        file_id: info.file_id,
        hash: info.hash,
      })
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : '上传失败，请稍后重试')
    } finally {
      setUploading(false)
    }
  }

  function handleRemove() {
    onChange(null)
    setError('')
  }

  function handleSelectUploaded(uploadedFile) {
    onChange({
      name: uploadedFile.name,
      size: uploadedFile.size,
      file_id: uploadedFile.file_id,
      hash: uploadedFile.hash,
    })
    setError('')
    setDialogOpen(false)
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className="flex items-center gap-4 rounded-lg border border-dashed p-4">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-md border bg-muted">
        {uploading ? (
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        ) : (
          <Paperclip className="size-6 text-muted-foreground" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm font-medium">上传文件</p>
        {uploading ? (
          <p className="text-xs text-muted-foreground">正在上传…</p>
        ) : error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : file ? (
          <p className="truncate text-xs text-muted-foreground">
            {file.name}（{formatSize(file.size)}）· 已上传
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {file ? (
            <Button type="button" variant="outline" size="sm" onClick={handleRemove}>
              移除
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                <Upload />
                选择文件
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(true)}
                disabled={uploading}
              >
                <FolderOpen />
                已上传文件
              </Button>
            </>
          )}
        </div>
      </div>

      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />

      <UploadFileSelectDialog open={dialogOpen} onOpenChange={setDialogOpen} onSelect={handleSelectUploaded} />
    </div>
  )
}

/* ---------------- 网文 ---------------- */

const EMPTY_WEB = {
  author: '',
  platform: '',
  genre: '',
  status: 'ongoing',
  url: '',
  readingStatus: 'wishlist',
  description: '',
}

function WebNovelForm({ cover, title, onTitleChange, onAutoFilled, onSaved }) {
  const [file, setFile] = useState(null)
  const [form, setForm] = useState(EMPTY_WEB)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')

  const autoTitle = file?.name?.toLowerCase().endsWith('.txt') ? file.name.replace(/\.txt$/i, '') : ''

  useEffect(() => {
    if (autoTitle) {
      onTitleChange(autoTitle)
      onAutoFilled?.()
    }
  }, [autoTitle])

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleImport() {
    const url = importUrl.trim()

    if (!url) {
      setImportError('请输入链接')
      return
    }

    try {
      setImporting(true)
      setImportError('')

      const data = await importWebNovelFromUrl(url)

      onTitleChange(data.title)
      updateField('author', data.author)
      updateField('platform', data.platform)
      updateField('genre', data.genre)
      updateField('url', data.url)
      updateField('description', data.description)

      setImportOpen(false)
      setImportUrl('')
    } catch (error) {
      setImportError(error instanceof Error ? error.message : '导入失败，请稍后重试')
    } finally {
      setImporting(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const trimmedTitle = title.trim()
    const author = form.author.trim()

    if (!trimmedTitle) {
      setErrorMessage('请输入书名')
      return
    }

    try {
      setLoading(true)
      setErrorMessage('')

      await createBook({
        type: 'webnovel',
        cover,
        file,
        title: trimmedTitle,
        author,
        platform: form.platform,
        genre: form.genre,
        status: form.status,
        url: form.url.trim(),
        reading_status: form.readingStatus,
        description: form.description.trim(),
      })

      setForm({ ...EMPTY_WEB })
      setFile(null)
      onSaved?.()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '保存失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FormFeedback errorMessage={errorMessage} />

      <FileUpload file={file} onChange={setFile} accept=".txt" hint="仅支持 txt 文件" />

      <div>
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <Link2 />
              从网站导入信息
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>从网站导入信息</DialogTitle>
              <DialogDescription>粘贴网文链接，自动填充作品信息。</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="import-url">链接</Label>
              <Input
                id="import-url"
                type="url"
                placeholder="https://example.com/book/123"
                value={importUrl}
                onChange={(event) => setImportUrl(event.target.value)}
                disabled={importing}
              />
            </div>
            {importError ? <p className="text-sm text-destructive">{importError}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setImportOpen(false)} disabled={importing}>
                取消
              </Button>
              <Button type="button" onClick={handleImport} disabled={importing}>
                {importing ? <Loader2 className="animate-spin" /> : null}
                {importing ? '导入中…' : '导入'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="web-author">作者</FieldLabel>
          <Input
            id="web-author"
            value={form.author}
            onChange={(event) => updateField('author', event.target.value)}
            placeholder="请输入作者（可选）"
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="web-platform">平台</Label>
          <Select
            value={form.platform || undefined}
            onValueChange={(value) => updateField('platform', value)}
            disabled={loading}
          >
            <SelectTrigger id="web-platform" className="w-full">
              <SelectValue placeholder="选择平台（可选）" />
            </SelectTrigger>
            <SelectContent>
              {WEB_PLATFORMS.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="web-genre">题材</Label>
          <Select
            value={form.genre || undefined}
            onValueChange={(value) => updateField('genre', value)}
            disabled={loading}
          >
            <SelectTrigger id="web-genre" className="w-full">
              <SelectValue placeholder="选择题材（可选）" />
            </SelectTrigger>
            <SelectContent>
              {WEB_GENRES.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="web-status">连载状态</Label>
          <Select value={form.status} onValueChange={(value) => updateField('status', value)} disabled={loading}>
            <SelectTrigger id="web-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SERIAL_STATUSES.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="web-url">链接</Label>
          <Input
            id="web-url"
            value={form.url}
            onChange={(event) => updateField('url', event.target.value)}
            placeholder="如阅读页链接（可选）"
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="web-reading">阅读状态</Label>
          <Select
            value={form.readingStatus}
            onValueChange={(value) => updateField('readingStatus', value)}
            disabled={loading}
          >
            <SelectTrigger id="web-reading" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {READING_STATUSES.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="web-desc">简介</Label>
        <Textarea
          id="web-desc"
          value={form.description}
          onChange={(event) => updateField('description', event.target.value)}
          placeholder="简单介绍一下这部作品（可选）"
          rows={4}
          disabled={loading}
        />
      </div>

      <FormActions loading={loading} />
    </form>
  )
}

/* ---------------- 本子 ---------------- */

const EMPTY_DOUJIN = {
  author: '',
  origin: '',
  kind: '',
  pages: '',
  releaseDate: '',
  readingStatus: 'wishlist',
  description: '',
}

function DoujinshiForm({ cover, title, onTitleChange, onSaved }) {
  const [file, setFile] = useState(null)
  const [form, setForm] = useState(EMPTY_DOUJIN)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const trimmedTitle = title.trim()
    const author = form.author.trim()
    const pages = form.pages.trim()

    if (!trimmedTitle) {
      setErrorMessage('请输入书名')
      return
    }
    if (!author) {
      setErrorMessage('请输入作者/社团')
      return
    }
    if (pages && !/^\d+$/.test(pages)) {
      setErrorMessage('页数需为数字')
      return
    }

    try {
      setLoading(true)
      setErrorMessage('')

      await createBook({
        type: 'doujinshi',
        cover,
        file,
        title: trimmedTitle,
        author,
        origin: form.origin.trim(),
        kind: form.kind,
        pages,
        release_date: form.releaseDate.trim(),
        reading_status: form.readingStatus,
        description: form.description.trim(),
      })

      setForm({ ...EMPTY_DOUJIN })
      setFile(null)
      onSaved?.()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '保存失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FormFeedback errorMessage={errorMessage} />

      <FileUpload file={file} onChange={setFile} />

      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="doujin-author" required>作者/社团</FieldLabel>
          <Input
            id="doujin-author"
            value={form.author}
            onChange={(event) => updateField('author', event.target.value)}
            placeholder="请输入作者或社团"
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="doujin-origin">原作</Label>
          <Input
            id="doujin-origin"
            value={form.origin}
            onChange={(event) => updateField('origin', event.target.value)}
            placeholder="如原作作品名（可选）"
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="doujin-kind">类型</Label>
          <Select
            value={form.kind || undefined}
            onValueChange={(value) => updateField('kind', value)}
            disabled={loading}
          >
            <SelectTrigger id="doujin-kind" className="w-full">
              <SelectValue placeholder="选择类型（可选）" />
            </SelectTrigger>
            <SelectContent>
              {DOUJIN_KINDS.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="doujin-pages">页数</Label>
          <Input
            id="doujin-pages"
            value={form.pages}
            onChange={(event) => updateField('pages', event.target.value)}
            placeholder="如 32"
            inputMode="numeric"
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="doujin-release">发售时间</Label>
          <Input
            id="doujin-release"
            value={form.releaseDate}
            onChange={(event) => updateField('releaseDate', event.target.value)}
            placeholder="如 2024-08（可选）"
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="doujin-reading">阅读状态</Label>
          <Select
            value={form.readingStatus}
            onValueChange={(value) => updateField('readingStatus', value)}
            disabled={loading}
          >
            <SelectTrigger id="doujin-reading" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {READING_STATUSES.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="doujin-desc">简介</Label>
        <Textarea
          id="doujin-desc"
          value={form.description}
          onChange={(event) => updateField('description', event.target.value)}
          placeholder="简单介绍一下这本本子（可选）"
          rows={4}
          disabled={loading}
        />
      </div>

      <FormActions loading={loading} />
    </form>
  )
}

/* ---------------- 图包 ---------------- */

const EMPTY_IMAGEPACK = {
  author: '',
  origin: '',
  format: '',
  imageCount: '',
  date: '',
  readingStatus: 'wishlist',
  description: '',
}

function ImagePackForm({ cover, title, onTitleChange, onSaved }) {
  const [file, setFile] = useState(null)
  const [form, setForm] = useState(EMPTY_IMAGEPACK)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const trimmedTitle = title.trim()
    const author = form.author.trim()
    const imageCount = form.imageCount.trim()

    if (!trimmedTitle) {
      setErrorMessage('请输入书名')
      return
    }
    if (!author) {
      setErrorMessage('请输入画师/作者')
      return
    }
    if (imageCount && !/^\d+$/.test(imageCount)) {
      setErrorMessage('图片张数需为数字')
      return
    }

    try {
      setLoading(true)
      setErrorMessage('')

      await createBook({
        type: 'imagepack',
        cover,
        file,
        title: trimmedTitle,
        author,
        origin: form.origin.trim(),
        format: form.format,
        image_count: imageCount,
        acquired_date: form.date.trim(),
        reading_status: form.readingStatus,
        description: form.description.trim(),
      })

      setForm({ ...EMPTY_IMAGEPACK })
      setFile(null)
      onSaved?.()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '保存失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FormFeedback errorMessage={errorMessage} />

      <FileUpload file={file} onChange={setFile} accept=".zip,.rar" hint="仅支持 zip / rar 文件" />

      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="imagepack-author" required>画师/作者</FieldLabel>
          <Input
            id="imagepack-author"
            value={form.author}
            onChange={(event) => updateField('author', event.target.value)}
            placeholder="请输入画师或作者"
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="imagepack-origin">原作/主题</Label>
          <Input
            id="imagepack-origin"
            value={form.origin}
            onChange={(event) => updateField('origin', event.target.value)}
            placeholder="如原作作品名或主题（可选）"
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="imagepack-format">格式</Label>
          <Select
            value={form.format || undefined}
            onValueChange={(value) => updateField('format', value)}
            disabled={loading}
          >
            <SelectTrigger id="imagepack-format" className="w-full">
              <SelectValue placeholder="选择格式（可选）" />
            </SelectTrigger>
            <SelectContent>
              {IMAGE_FORMATS.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="imagepack-count">图片张数</Label>
          <Input
            id="imagepack-count"
            value={form.imageCount}
            onChange={(event) => updateField('imageCount', event.target.value)}
            placeholder="如 100"
            inputMode="numeric"
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="imagepack-date">获取时间</Label>
          <Input
            id="imagepack-date"
            value={form.date}
            onChange={(event) => updateField('date', event.target.value)}
            placeholder="如 2024-08（可选）"
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="imagepack-reading">阅读状态</Label>
          <Select
            value={form.readingStatus}
            onValueChange={(value) => updateField('readingStatus', value)}
            disabled={loading}
          >
            <SelectTrigger id="imagepack-reading" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {READING_STATUSES.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="imagepack-desc">简介</Label>
        <Textarea
          id="imagepack-desc"
          value={form.description}
          onChange={(event) => updateField('description', event.target.value)}
          placeholder="简单介绍一下这个图包（可选）"
          rows={4}
          disabled={loading}
        />
      </div>

      <FormActions loading={loading} />
    </form>
  )
}

/* ---------------- 出版图书 ---------------- */

const EMPTY_BOOK = {
  author: '',
  isbn: '',
  publisher: '',
  publishYear: '',
  category: '',
  readingStatus: 'wishlist',
  description: '',
}

function PublishedBookForm({ cover, title, onTitleChange, onSaved }) {
  const [file, setFile] = useState(null)
  const [form, setForm] = useState(EMPTY_BOOK)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleImport() {
    const url = importUrl.trim()

    if (!url) {
      setImportError('请输入豆瓣链接')
      return
    }

    try {
      setImporting(true)
      setImportError('')

      const data = await importBookFromDouban(url)

      onTitleChange(data.title)
      updateField('author', data.author)
      updateField('isbn', data.isbn)
      updateField('publisher', data.publisher)
      updateField('publishYear', data.publish_year)
      updateField('category', data.category)
      updateField('description', data.description)

      setImportOpen(false)
      setImportUrl('')
    } catch (error) {
      setImportError(error instanceof Error ? error.message : '导入失败，请稍后重试')
    } finally {
      setImporting(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const trimmedTitle = title.trim()
    const author = form.author.trim()
    const publishYear = form.publishYear.trim()

    if (!trimmedTitle) {
      setErrorMessage('请输入书名')
      return
    }
    if (!author) {
      setErrorMessage('请输入作者')
      return
    }
    if (publishYear && !/^\d{4}$/.test(publishYear)) {
      setErrorMessage('出版年份需为 4 位数字')
      return
    }

    try {
      setLoading(true)
      setErrorMessage('')

      await createBook({
        type: 'book',
        cover,
        file,
        title: trimmedTitle,
        author,
        isbn: form.isbn.trim(),
        publisher: form.publisher.trim(),
        publish_year: publishYear,
        category: form.category,
        reading_status: form.readingStatus,
        description: form.description.trim(),
      })

      setForm({ ...EMPTY_BOOK })
      setFile(null)
      onSaved?.()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '保存失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FormFeedback errorMessage={errorMessage} />

      <FileUpload file={file} onChange={setFile} />

      <div className="flex flex-wrap items-center gap-2">
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <Link2 />
              从豆瓣导入
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>从豆瓣导入</DialogTitle>
              <DialogDescription>粘贴豆瓣图书链接，自动填充书籍信息。</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="douban-url">豆瓣链接</Label>
              <Input
                id="douban-url"
                type="url"
                placeholder="https://book.douban.com/subject/1234567/"
                value={importUrl}
                onChange={(event) => setImportUrl(event.target.value)}
                disabled={importing}
              />
            </div>
            {importError ? <p className="text-sm text-destructive">{importError}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setImportOpen(false)} disabled={importing}>
                取消
              </Button>
              <Button type="button" onClick={handleImport} disabled={importing}>
                {importing ? <Loader2 className="animate-spin" /> : null}
                {importing ? '导入中…' : '导入'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button asChild variant="outline" size="sm">
          <a href="https://book.douban.com/" target="_blank" rel="noreferrer noopener">
            <ExternalLink />
            跳转豆瓣
          </a>
        </Button>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="book-author" required>作者</FieldLabel>
          <Input
            id="book-author"
            value={form.author}
            onChange={(event) => updateField('author', event.target.value)}
            placeholder="请输入作者"
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="book-isbn">ISBN</Label>
          <Input
            id="book-isbn"
            value={form.isbn}
            onChange={(event) => updateField('isbn', event.target.value)}
            placeholder="请输入 ISBN"
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="book-publisher">出版社</Label>
          <Input
            id="book-publisher"
            value={form.publisher}
            onChange={(event) => updateField('publisher', event.target.value)}
            placeholder="请输入出版社"
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="book-year">出版年份</Label>
          <Input
            id="book-year"
            value={form.publishYear}
            onChange={(event) => updateField('publishYear', event.target.value)}
            placeholder="如 2024"
            inputMode="numeric"
            maxLength={4}
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="book-category">分类</Label>
          <Select
            value={form.category || undefined}
            onValueChange={(value) => updateField('category', value)}
            disabled={loading}
          >
            <SelectTrigger id="book-category" className="w-full">
              <SelectValue placeholder="选择分类（可选）" />
            </SelectTrigger>
            <SelectContent>
              {BOOK_CATEGORIES.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="book-reading">阅读状态</Label>
          <Select
            value={form.readingStatus}
            onValueChange={(value) => updateField('readingStatus', value)}
            disabled={loading}
          >
            <SelectTrigger id="book-reading" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {READING_STATUSES.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="book-desc">简介</Label>
        <Textarea
          id="book-desc"
          value={form.description}
          onChange={(event) => updateField('description', event.target.value)}
          placeholder="简单介绍一下这本书（可选）"
          rows={4}
          disabled={loading}
        />
      </div>

      <FormActions loading={loading} />
    </form>
  )
}

/* ---------------- 页面 ---------------- */

const TAB_ORDER = ['webnovel', 'doujinshi', 'imagepack', 'book']

function AddBookPage() {
  const navigate = useNavigate()
  const [type, setType] = useState('webnovel')
  const [title, setTitle] = useState('')
  const [autoFilled, setAutoFilled] = useState(false)
  const [cover, setCover] = useState(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const index = TAB_ORDER.indexOf(type)

  function handleSaved() {
    setTitle('')
    setCover(null)
    setAutoFilled(false)
    setSuccessOpen(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">添加书籍</CardTitle>
        <CardDescription>选择类型后录入对应信息。</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="shared-title" required>书名</FieldLabel>
          <Input
            id="shared-title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              setAutoFilled(false)
            }}
            placeholder="请输入书名"
          />
          {autoFilled ? (
            <p className="text-xs text-muted-foreground">已自动填入</p>
          ) : null}
        </div>

        <CoverUpload cover={cover} onChange={setCover} />

        <Tabs value={type} onValueChange={setType}>
          <TabsList className="w-full">
            <TabsTrigger value="webnovel" className="px-2 sm:px-3">网文</TabsTrigger>
            <TabsTrigger value="doujinshi" className="px-2 sm:px-3">本子</TabsTrigger>
            <TabsTrigger value="imagepack" className="px-2 sm:px-3">图包</TabsTrigger>
            <TabsTrigger value="book" className="px-2 sm:px-3">出版图书</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            <div className="w-full shrink-0" inert={type !== 'webnovel'}>
              <WebNovelForm cover={cover} title={title} onTitleChange={setTitle} onAutoFilled={() => setAutoFilled(true)} onSaved={handleSaved} />
            </div>
            <div className="w-full shrink-0" inert={type !== 'doujinshi'}>
              <DoujinshiForm cover={cover} title={title} onTitleChange={setTitle} onSaved={handleSaved} />
            </div>
            <div className="w-full shrink-0" inert={type !== 'imagepack'}>
              <ImagePackForm cover={cover} title={title} onTitleChange={setTitle} onSaved={handleSaved} />
            </div>
            <div className="w-full shrink-0" inert={type !== 'book'}>
              <PublishedBookForm cover={cover} title={title} onTitleChange={setTitle} onSaved={handleSaved} />
            </div>
          </div>
        </div>

        <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>保存成功</DialogTitle>
              <DialogDescription>书籍已添加到书架。</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSuccessOpen(false)}>
                继续添加
              </Button>
              <Button type="button" onClick={() => navigate('/books')}>
                查看书架
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export default AddBookPage
