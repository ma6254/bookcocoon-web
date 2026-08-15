import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Download, FileText, Loader2, RefreshCw, Upload } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getUploadList, readUploadFile, uploadFile } from '@/services/upload'

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

function formatHash(hash) {
  if (!hash) return '-'
  if (hash.length <= 20) return hash
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`
}

function UploadFilesPage() {
  const inputRef = useRef(null)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [downloadingId, setDownloadingId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const totalSize = files.reduce((sum, item) => sum + (item.size || 0), 0)

  async function fetchList() {
    setLoading(true)
    try {
      const rows = await getUploadList()
      setFiles(Array.isArray(rows) ? rows : [])
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '获取列表失败')
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
  }, [])

  async function handleSelect(event) {
    const selectedFiles = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (selectedFiles.length === 0) return

    setUploading(true)
    setErrorMessage('')

    const errors = []

    for (const file of selectedFiles) {
      try {
        await uploadFile(file)
      } catch (error) {
        errors.push(`${file.name}：${error instanceof Error ? error.message : '上传失败'}`)
      }
    }

    await fetchList()
    setUploading(false)

    if (errors.length > 0) {
      setErrorMessage(errors.join('\n'))
    }
  }

  async function handleDownload(file) {
    const fileId = String(file.file_id)
    setDownloadingId(fileId)

    try {
      const blob = await readUploadFile(file.file_id)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = file.name || 'download'
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '下载失败')
    } finally {
      setDownloadingId('')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          共 {files.length} 个文件 · 总大小 {formatSize(totalSize)}
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={fetchList} disabled={loading || uploading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            刷新
          </Button>
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {uploading ? '上传中…' : '上传文件'}
          </Button>
        </div>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={handleSelect} />
      </div>

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>操作失败</AlertTitle>
          <AlertDescription className="whitespace-pre-line">{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <FileText className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">还没有上传文件</p>
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload />
            上传文件
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {files.map((file) => {
            const fileId = String(file.file_id)

            return (
              <Card key={file.file_id}>
                <CardContent className="flex items-start justify-between gap-3 py-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <h3 className="truncate font-semibold">{file.name || '-'}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatSize(file.size)}</p>
                    <p className="truncate text-xs text-muted-foreground/80" title={file.hash}>
                      SHA256：{formatHash(file.hash)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatTime(file.uploaded_at || file.created_at)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(file)}
                      disabled={downloadingId === fileId}
                      aria-label="下载"
                      title="下载"
                    >
                      {downloadingId === fileId ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default UploadFilesPage
