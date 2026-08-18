import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  ArrowDownUp,
  ArrowLeftRight,
  Contrast,
  Download,
  Image as ImageIcon,
  Maximize,
  Palette,
  RotateCcw,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'

/** 格式化文件大小 */
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/** 适屏缩放留白比例，避免图片贴边显示 */
const FIT_TO_VIEW_PADDING_RATIO = 0.92
const MIN_SCALE = 0.05
const MAX_SCALE = 50
const ZOOM_BUTTON_FACTOR = 1.25

function clampScale(value) {
  return Math.min(Math.max(value, MIN_SCALE), MAX_SCALE)
}

function calculateFitScale(containerWidth, containerHeight, imageWidth, imageHeight) {
  if (containerWidth <= 0 || containerHeight <= 0 || imageWidth <= 0 || imageHeight <= 0) {
    return 1
  }

  return clampScale(Math.min(containerWidth / imageWidth, containerHeight / imageHeight) * FIT_TO_VIEW_PADDING_RATIO)
}

function normalizeRotation(degrees) {
  return ((degrees % 360) + 360) % 360
}

function getRotatedBoundingSize(width, height, degrees) {
  const normalized = normalizeRotation(degrees)
  const isQuarterTurn = normalized === 90 || normalized === 270

  return {
    width: isQuarterTurn ? height : width,
    height: isQuarterTurn ? width : height,
  }
}

function getImageExtensionFromMime(mimeType) {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/gif':
      return 'gif'
    case 'image/webp':
      return 'webp'
    case 'image/svg+xml':
      return 'svg'
    case 'image/bmp':
      return 'bmp'
    default:
      return 'png'
  }
}

function resolveDownloadFileName(displayPath, alt, mimeType) {
  const rawName = (displayPath || alt || 'image').split(/[\\/]/).filter(Boolean).at(-1) || 'image'
  const safeName = rawName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim() || 'image'

  if (/\.[a-z0-9]{2,5}$/i.test(safeName)) {
    return safeName
  }

  return `${safeName}.${getImageExtensionFromMime(mimeType)}`
}

/**
 * 通用图片查看器组件
 *
 * - 缩略图模式：显示小图，点击打开预览弹窗
 * - 预览弹窗支持：缩放 / 旋转 / 镜像 / 反色 / 底色 / 拖拽 / 原图尺寸信息 / 下载
 */
function PicViewer({
  fetcher,
  src,
  alt,
  width = 80,
  height = 80,
  className,
  fit = 'contain',
  thumbStyle,
  fallbackText = '-',
  fallback,
  loadingFallback,
  filePath,
  showInfo = true,
  refreshKey = 0,
}) {
  const [fetchedImageUrl, setFetchedImageUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [blobSize, setBlobSize] = useState(0)
  const [blobType, setBlobType] = useState('')
  const [naturalSize, setNaturalSize] = useState(null)
  const objectUrlRef = useRef(null)

  // 预览弹窗状态
  const [previewOpen, setPreviewOpen] = useState(false)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [translateX, setTranslateX] = useState(0)
  const [translateY, setTranslateY] = useState(0)
  const [invert, setInvert] = useState(false)
  const [flipX, setFlipX] = useState(false)
  const [flipY, setFlipY] = useState(false)
  const [bgMode, setBgMode] = useState('dark')

  // 拖拽状态
  const isDragging = useRef(false)
  const [dragging, setDragging] = useState(false)
  const [imageMousePosition, setImageMousePosition] = useState(null)
  const dragStart = useRef({ x: 0, y: 0, translateX: 0, translateY: 0 })
  const containerRef = useRef(null)
  const previewImageRef = useRef(null)
  const naturalSizeRef = useRef({ width: 0, height: 0 })
  const rotationRef = useRef(0)
  const fitFrameRef = useRef(null)
  const fitTimerRef = useRef(null)

  // 让 fetcher 通过 ref 调用，避免内联函数每次渲染都触发重新请求。
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])

  const imageUrl = fetcher ? fetchedImageUrl : (src ?? null)

  // fetcher 模式下拉取 Blob 并创建对象 URL；src 模式直接使用传入地址
  useEffect(() => {
    if (!fetcherRef.current) return undefined

    let cancelled = false
    let createdUrl = null

    async function loadImage() {
      setLoading(true)
      setError(false)
      setFetchedImageUrl(null)
      setBlobSize(0)
      setBlobType('')

      try {
        const blob = await fetcherRef.current()
        if (cancelled) return

        if (!blob || blob.size === 0) {
          setError(true)
          return
        }

        createdUrl = URL.createObjectURL(blob)
        objectUrlRef.current = createdUrl
        setFetchedImageUrl(createdUrl)
        setBlobSize(blob.size)
        setBlobType(blob.type)
      } catch {
        if (!cancelled) {
          setError(true)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadImage()

    return () => {
      cancelled = true
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl)
        if (objectUrlRef.current === createdUrl) {
          objectUrlRef.current = null
        }
      }
    }
  }, [refreshKey])

  // 获取图片原始尺寸
  useEffect(() => {
    if (!imageUrl) return undefined

    let cancelled = false
    const img = new window.Image()
    img.onload = () => {
      if (!cancelled) {
        setNaturalSize({ src: imageUrl, width: img.naturalWidth, height: img.naturalHeight })
      }
    }
    img.onerror = () => {
      if (!cancelled) {
        setNaturalSize({ src: imageUrl, width: 0, height: 0 })
      }
    }
    img.src = imageUrl

    return () => {
      cancelled = true
    }
  }, [imageUrl])

  const displayPath = filePath || alt || src || ''
  const naturalWidth = naturalSize?.src === imageUrl ? naturalSize.width : 0
  const naturalHeight = naturalSize?.src === imageUrl ? naturalSize.height : 0
  naturalSizeRef.current = { width: naturalWidth, height: naturalHeight }
  rotationRef.current = rotation
  const displayBlobSize = fetcher ? blobSize : 0
  const operationHints = [
    '鼠标左键拖动：移动图片',
    '鼠标滚轮：放大 / 缩小',
    '适应屏幕：重置缩放与位置',
    '旋转：逆时针 / 顺时针 90°',
    '水平 / 垂直镜像：翻转图片',
    '反色 / 底色：辅助查看细节',
    '下载：保存当前图片',
    'Esc 或右上角按钮：关闭预览',
  ]

  const resetToFitView = useCallback(() => {
    const container = containerRef.current
    const previewImage = previewImageRef.current
    const actualImageWidth = previewImage?.naturalWidth || naturalSizeRef.current.width
    const actualImageHeight = previewImage?.naturalHeight || naturalSizeRef.current.height

    if (
      !container ||
      actualImageWidth <= 0 ||
      actualImageHeight <= 0 ||
      container.clientWidth <= 0 ||
      container.clientHeight <= 0
    ) {
      return false
    }

    const rotatedSize = getRotatedBoundingSize(actualImageWidth, actualImageHeight, rotationRef.current)

    setScale(calculateFitScale(container.clientWidth, container.clientHeight, rotatedSize.width, rotatedSize.height))
    setTranslateX(0)
    setTranslateY(0)
    return true
  }, [])

  const scheduleFitToView = useCallback(
    (attempt = 0) => {
      if (fitFrameRef.current !== null) {
        window.cancelAnimationFrame(fitFrameRef.current)
      }

      if (fitTimerRef.current !== null) {
        window.clearTimeout(fitTimerRef.current)
        fitTimerRef.current = null
      }

      fitFrameRef.current = window.requestAnimationFrame(() => {
        fitFrameRef.current = null
        const fitted = resetToFitView()

        if ((!fitted || attempt < 2) && attempt < 8) {
          fitTimerRef.current = window.setTimeout(() => scheduleFitToView(attempt + 1), 50)
        }
      })
    },
    [resetToFitView],
  )

  const normalizedRotation = normalizeRotation(rotation)
  const statusItems = [
    { label: '缩放', value: `${scale.toFixed(2)} ×` },
    { label: '坐标', value: imageMousePosition ? `X ${imageMousePosition.x}, Y ${imageMousePosition.y}` : '--' },
    { label: '变换', value: `旋转 ${normalizedRotation}° / 水平 ${flipX ? '开' : '关'} / 垂直 ${flipY ? '开' : '关'}` },
  ]

  // 缩放控制
  const handleZoomIn = () => setScale((s) => clampScale(s * ZOOM_BUTTON_FACTOR))
  const handleZoomOut = () => setScale((s) => clampScale(s / ZOOM_BUTTON_FACTOR))
  const handleFitToScreen = useCallback(() => scheduleFitToView(), [scheduleFitToView])
  const handleDownloadImage = () => {
    if (!imageUrl) return

    const anchor = document.createElement('a')
    anchor.href = imageUrl
    anchor.download = resolveDownloadFileName(displayPath, alt, blobType)
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
  }
  const handleRotateClockwise = () => setRotation((r) => r + 90)
  const handleRotateCounterClockwise = () => setRotation((r) => r - 90)
  const handleInvert = () => setInvert((v) => !v)
  const handleFlipX = () => setFlipX((v) => !v)
  const handleFlipY = () => setFlipY((v) => !v)
  const bgModes = ['dark', 'light', 'grid']
  const bgModeLabels = { dark: '黑色', light: '白色', grid: '网格' }
  const handleBgChange = () => {
    setBgMode((prev) => {
      const idx = bgModes.indexOf(prev)
      return bgModes[(idx + 1) % bgModes.length]
    })
  }

  const bgStyle = useMemo(() => {
    switch (bgMode) {
      case 'dark':
        return {
          backgroundColor: 'rgba(31, 31, 31, 0.68)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }
      case 'light':
        return { backgroundColor: '#f0f0f0' }
      case 'grid':
        return {
          backgroundImage:
            'linear-gradient(45deg, #555 25%, transparent 25%), linear-gradient(-45deg, #555 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #555 75%), linear-gradient(-45deg, transparent 75%, #555 75%)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          backgroundColor: '#1f1f1f',
        }
      default:
        return {}
    }
  }, [bgMode])

  const updateMousePosition = useCallback(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const pointerX = e.clientX - rect.left
      const pointerY = e.clientY - rect.top

      if (naturalWidth <= 0 || naturalHeight <= 0 || scale === 0) {
        setImageMousePosition(null)
        return
      }

      const centerX = rect.width / 2 + translateX
      const centerY = rect.height / 2 + translateY
      const dx = pointerX - centerX
      const dy = pointerY - centerY
      const radians = (-rotation * Math.PI) / 180
      const cos = Math.cos(radians)
      const sin = Math.sin(radians)
      const rotatedX = dx * cos - dy * sin
      const rotatedY = dx * sin + dy * cos
      const scaleX = flipX ? -scale : scale
      const scaleY = flipY ? -scale : scale
      const imageX = rotatedX / scaleX + naturalWidth / 2
      const imageY = rotatedY / scaleY + naturalHeight / 2

      if (imageX < 0 || imageX > naturalWidth || imageY < 0 || imageY > naturalHeight) {
        setImageMousePosition(null)
        return
      }

      setImageMousePosition({
        x: Math.round(imageX),
        y: Math.round(imageY),
      })
    },
    [flipX, flipY, naturalHeight, naturalWidth, rotation, scale, translateX, translateY],
  )

  // 拖拽事件
  const handlePointerDown = (e) => {
    e.preventDefault()
    updateMousePosition(e)
    e.currentTarget.setPointerCapture(e.pointerId)
    isDragging.current = true
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, translateX, translateY }
  }

  const handlePointerMove = (e) => {
    updateMousePosition(e)
    if (!isDragging.current) return
    e.preventDefault()
    setTranslateX(dragStart.current.translateX + e.clientX - dragStart.current.x)
    setTranslateY(dragStart.current.translateY + e.clientY - dragStart.current.y)
  }

  const handlePointerUp = (e) => {
    updateMousePosition(e)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    isDragging.current = false
    setDragging(false)
  }

  // 打开/关闭预览时重置状态
  const openPreview = () => {
    setScale(1)
    setRotation(0)
    setTranslateX(0)
    setTranslateY(0)
    setInvert(false)
    setFlipX(false)
    setFlipY(false)
    setBgMode('dark')
    setPreviewOpen(true)
  }
  const closePreview = () => setPreviewOpen(false)

  useEffect(() => {
    if (!previewOpen) return undefined

    scheduleFitToView()
    window.addEventListener('resize', handleFitToScreen)

    return () => {
      if (fitFrameRef.current !== null) {
        window.cancelAnimationFrame(fitFrameRef.current)
        fitFrameRef.current = null
      }
      if (fitTimerRef.current !== null) {
        window.clearTimeout(fitTimerRef.current)
        fitTimerRef.current = null
      }
      window.removeEventListener('resize', handleFitToScreen)
    }
  }, [handleFitToScreen, previewOpen, scheduleFitToView])

  // 非被动滚轮监听，避免阻止默认滚动失效
  useEffect(() => {
    if (!previewOpen) return undefined

    const el = containerRef.current
    if (!el) return undefined

    const onWheel = (e) => {
      e.preventDefault()
      setScale((s) => clampScale(s - e.deltaY * 0.003))
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [previewOpen])

  // 构建图片信息
  const infoItems = useMemo(() => {
    if (!showInfo) return []

    const items = []
    if (displayPath) {
      items.push({ label: '路径', value: displayPath })
    }
    if (naturalWidth > 0 || naturalHeight > 0) {
      items.push({ label: '尺寸', value: `${naturalWidth} × ${naturalHeight}` })
    }
    if (displayBlobSize > 0) {
      items.push({ label: '大小', value: formatFileSize(displayBlobSize) })
    }
    return items
  }, [displayBlobSize, displayPath, naturalHeight, naturalWidth, showInfo])

  const infoLines = useMemo(() => infoItems.map((item) => `${item.label}: ${item.value}`), [infoItems])

  // --- 状态渲染 ---

  if ((fetcher && error) || (!fetcher && !src)) {
    return fallback ?? <span className="text-muted-foreground">{fallbackText}</span>
  }

  if (fetcher && loading) {
    return loadingFallback ?? <span className="text-muted-foreground">加载中…</span>
  }

  if (!imageUrl) {
    return loadingFallback ?? <span className="text-muted-foreground">加载中…</span>
  }

  const thumbnail = (
    <img
      src={imageUrl}
      alt={alt ?? displayPath}
      width={width}
      height={height}
      className={className}
      style={{ objectFit: fit, cursor: 'pointer', ...(thumbStyle || {}) }}
      title={infoLines.length > 0 ? infoLines.join('\n') : undefined}
      onClick={openPreview}
    />
  )

  return (
    <>
      {thumbnail}

      <DialogPrimitive.Root open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" />
          <DialogPrimitive.Content
            className="fixed left-1/2 z-50 -translate-x-1/2 overflow-hidden rounded-2xl border border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.32)] outline-none"
            style={{
              top: '10vh',
              width: '96vw',
              height: '80vh',
              background: 'rgba(31, 31, 31, 0.72)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
            }}
          >
            <DialogPrimitive.Title className="sr-only">图片查看器</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">图片预览与操作</DialogPrimitive.Description>

            <TooltipProvider>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  boxSizing: 'border-box',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
              >
                {/* 顶部信息栏 */}
                <div
                  style={{
                    width: '100%',
                    flex: '0 0 auto',
                    display: 'flex',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    padding: '8px 72px 8px 12px',
                    flexWrap: 'wrap',
                    gap: 8,
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      marginLeft: 8,
                    }}
                  >
                    <ImageIcon className="size-7" />
                  </span>
                  <span style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>图片查看器</span>
                </div>

                {/* 左侧浮动操作按钮 */}
                <div
                  onMouseDown={(e) => e.preventDefault()}
                  style={{
                    position: 'absolute',
                    left: 12,
                    bottom: '50%',
                    transform: 'translateY(50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    zIndex: 10,
                    background: 'rgba(0,0,0,0.5)',
                    borderRadius: 8,
                    padding: '10px 6px',
                  }}
                >
                  <OpButton label="放大" onClick={handleZoomIn}>
                    <ZoomIn className="size-5" />
                  </OpButton>
                  <OpButton label="缩小" onClick={handleZoomOut}>
                    <ZoomOut className="size-5" />
                  </OpButton>
                  <OpButton label="适应屏幕" onClick={handleFitToScreen}>
                    <Maximize className="size-4" />
                  </OpButton>
                  <OpButton label="逆时针旋转" onClick={handleRotateCounterClockwise}>
                    <RotateCcw className="size-5" />
                  </OpButton>
                  <OpButton label="顺时针旋转" onClick={handleRotateClockwise}>
                    <RotateCw className="size-5" />
                  </OpButton>
                  <OpButton label="水平镜像" active={flipX} onClick={handleFlipX}>
                    <ArrowLeftRight className="size-5" />
                  </OpButton>
                  <OpButton label="垂直镜像" active={flipY} onClick={handleFlipY}>
                    <ArrowDownUp className="size-5" />
                  </OpButton>
                  <OpButton label="反色" active={invert} onClick={handleInvert}>
                    <Contrast className="size-5" />
                  </OpButton>
                  <OpButton label={`底色: ${bgModeLabels[bgMode]}`} onClick={handleBgChange}>
                    <Palette className="size-5" />
                  </OpButton>
                  <OpButton label="下载图片" onClick={handleDownloadImage}>
                    <Download className="size-5" />
                  </OpButton>
                </div>

                {/* 图片容器 */}
                <div
                  ref={containerRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onPointerLeave={() => setImageMousePosition(null)}
                  style={{
                    ...bgStyle,
                    position: 'relative',
                    flex: 1,
                    minHeight: 0,
                    width: '100%',
                    overflow: 'hidden',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    maxHeight: '100%',
                    cursor: dragging ? 'grabbing' : 'grab',
                  }}
                >
                  {/* 左侧信息面板 */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 24,
                      left: 24,
                      bottom: 24,
                      zIndex: 9,
                      width: 420,
                      maxWidth: 'calc(100% - 48px)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                      pointerEvents: 'none',
                    }}
                  >
                    {showInfo && infoItems.length > 0 && (
                      <InfoCard title="文件信息" onMouseDown={(e) => e.stopPropagation()}>
                        {infoItems.map((item) => (
                          <InfoRow key={item.label} label={item.label} value={item.value} />
                        ))}
                      </InfoCard>
                    )}

                    <div style={{ flex: 1, minHeight: 16 }} />

                    <InfoCard title="操作提示" onMouseDown={(e) => e.stopPropagation()}>
                      {operationHints.map((hint) => (
                        <span
                          key={hint}
                          style={{ color: 'rgba(255, 255, 255, 0.72)', fontSize: 12, lineHeight: '18px' }}
                        >
                          {hint}
                        </span>
                      ))}
                    </InfoCard>
                  </div>

                  {/* 右侧状态信息 */}
                  <InfoCard
                    title="状态信息"
                    style={{
                      position: 'absolute',
                      top: 24,
                      right: 24,
                      zIndex: 9,
                      width: 420,
                      maxWidth: 'calc(100% - 48px)',
                      minWidth: 280,
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {statusItems.map((item) => (
                      <InfoRow key={item.label} label={item.label} value={item.value} />
                    ))}
                  </InfoCard>

                  <img
                    ref={previewImageRef}
                    src={imageUrl}
                    alt={alt ?? displayPath}
                    onLoad={() => {
                      if (previewOpen) {
                        scheduleFitToView()
                      }
                    }}
                    style={{
                      transform: `translate(${translateX}px, ${translateY}px) rotate(${rotation}deg) scale(${flipX ? -scale : scale}, ${flipY ? -scale : scale})`,
                      filter: invert ? 'invert(1)' : 'none',
                      transition: dragging ? 'none' : 'transform 0.2s ease',
                      width: naturalWidth > 0 ? naturalWidth : undefined,
                      height: naturalHeight > 0 ? naturalHeight : undefined,
                      maxWidth: 'none',
                      maxHeight: 'none',
                      objectFit: 'contain',
                      userSelect: 'none',
                      pointerEvents: 'none',
                    }}
                    draggable={false}
                  />
                </div>
              </div>
            </TooltipProvider>

            {/* 关闭按钮 */}
            <DialogPrimitive.Close
              className="absolute top-3.5 right-4 flex size-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white/90 transition hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              aria-label="关闭"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}

function OpButton({ label, active, onClick, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'flex size-7 items-center justify-center rounded-md text-white transition-colors hover:bg-white/15',
            active ? 'text-blue-400' : '',
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

function InfoCard({ title, style, onMouseDown, children }) {
  return (
    <div
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (onMouseDown) onMouseDown(e)
      }}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        minWidth: 280,
        padding: '16px 18px',
        borderRadius: 14,
        color: 'rgba(255, 255, 255, 0.88)',
        background: 'rgba(0, 0, 0, 0.24)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        cursor: 'default',
        pointerEvents: 'auto',
        ...(style || {}),
      }}
    >
      <span
        style={{
          display: 'block',
          marginBottom: 10,
          color: 'rgba(255, 255, 255, 0.92)',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {title}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: '100%' }}>{children}</div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div
      title={`${label}: ${value}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '42px minmax(0, 1fr)',
        alignItems: 'start',
        columnGap: 10,
        fontSize: 13,
        lineHeight: '20px',
      }}
    >
      <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{label}</span>
      <span
        style={{
          color: 'rgba(255, 255, 255, 0.86)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: label === '路径' ? 'normal' : 'nowrap',
          wordBreak: 'break-all',
        }}
      >
        {value}
      </span>
    </div>
  )
}

export default PicViewer
