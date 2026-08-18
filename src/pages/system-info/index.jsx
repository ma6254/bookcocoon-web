import { useEffect, useState } from 'react'
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getOsInfo, getOsState, getSysInfo, getSysState } from '@/services/system'

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2.5 last:border-b-0">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right text-sm font-medium" title={value || undefined}>
        {value || '-'}
      </span>
    </div>
  )
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function formatMem(mb) {
  if (mb == null) return undefined
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${mb} MB`
}

function SystemInfoPage() {
  const [sysInfo, setSysInfo] = useState(null)
  const [sysState, setSysState] = useState(null)
  const [osInfo, setOsInfo] = useState(null)
  const [osState, setOsState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState('')

  async function load(showLoading = false) {
    if (showLoading) setLoading(true)
    setError('')

    try {
      const [sys, sysRuntime, os, osRuntime] = await Promise.all([
        getSysInfo(),
        getSysState(),
        getOsInfo(),
        getOsState(),
      ])
      setSysInfo(sys)
      setSysState(sysRuntime)
      setOsInfo(os)
      setOsState(osRuntime)
      setLastRefresh(new Date().toLocaleString())
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取系统信息失败')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    load(true)
    const timer = setInterval(() => load(false), 10000)
    return () => clearInterval(timer)
  }, [])

  const appInfo = [
    { label: '应用名称', value: 'BookCocoon' },
    { label: '版本', value: '1.0.0' },
    { label: 'Git Commit', value: `${__GIT_COMMIT__} · ${formatDateTime(__GIT_COMMIT_TIME__)}` },
  ]

  const clientInfo = [
    { label: '浏览器', value: navigator.userAgent },
    { label: '平台', value: navigator.platform },
    { label: '语言', value: navigator.language },
    { label: '屏幕分辨率', value: `${window.screen.width} × ${window.screen.height}` },
  ]

  const osInfoItems = [
    { label: '主机名', value: osInfo?.hostname },
    { label: '操作系统', value: [osInfo?.os_name, osInfo?.arch].filter(Boolean).join(' · ') },
    { label: '平台', value: osInfo?.platform },
    { label: 'CPU 型号', value: osInfo?.cpu_model },
    { label: 'CPU 核心数', value: osInfo?.cpu_count },
    { label: '总内存', value: formatMem(osInfo?.total_mem_mb) },
    { label: '启动时间', value: formatDateTime(osInfo?.start_time) },
  ]

  const osStateItems = [
    { label: '运行时长', value: osState?.uptime },
    { label: 'CPU 使用率', value: osState?.cpu_percent != null ? `${osState.cpu_percent}%` : undefined },
    { label: '空闲内存', value: formatMem(osState?.free_mem_mb) },
    { label: 'CPU 频率', value: osState?.cpu_freq },
  ]

  const serverInfo = [
    { label: '启动时间', value: formatDateTime(sysInfo?.start_time) },
    { label: '编译时间', value: formatDateTime(sysInfo?.build_time) },
    { label: 'Go 版本', value: sysInfo?.go_version },
    { label: '构建版本', value: sysInfo?.build_version },
  ]

  const serverState = [
    { label: '运行时长', value: sysState?.uptime },
    { label: '协程数', value: sysState?.num_goroutine },
    { label: '堆内存', value: formatMem(sysState?.heap_used_mb) },
    { label: 'GC 次数', value: sysState?.gc_total_count },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">每 10 秒自动刷新</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {lastRefresh ? `上次刷新：${lastRefresh}` : ''}
          </span>
          <Button size="sm" variant="outline" onClick={() => load(true)} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            刷新
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>获取系统信息失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">应用信息</CardTitle>
            <CardDescription>前端应用基本信息</CardDescription>
          </CardHeader>
          <CardContent>
            {appInfo.map((item) => (
              <InfoRow key={item.label} label={item.label} value={item.value} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">浏览器信息</CardTitle>
            <CardDescription>当前浏览器信息</CardDescription>
          </CardHeader>
          <CardContent>
            {clientInfo.map((item) => (
              <InfoRow key={item.label} label={item.label} value={item.value} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">操作系统</CardTitle>
            <CardDescription>服务器操作系统与硬件信息</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !osInfo ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
              </div>
            ) : (
              osInfoItems.map((item) => (
                <InfoRow key={item.label} label={item.label} value={item.value} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">操作系统状态</CardTitle>
            <CardDescription>服务器操作系统实时状态</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !osState ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
              </div>
            ) : (
              osStateItems.map((item) => (
                <InfoRow key={item.label} label={item.label} value={item.value} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">服务端信息</CardTitle>
            <CardDescription>服务器编译与启动信息</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !sysInfo ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
              </div>
            ) : (
              serverInfo.map((item) => (
                <InfoRow key={item.label} label={item.label} value={item.value} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">服务端状态</CardTitle>
            <CardDescription>服务器 Go 运行时状态</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && !sysState ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
              </div>
            ) : (
              serverState.map((item) => (
                <InfoRow key={item.label} label={item.label} value={item.value} />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SystemInfoPage
