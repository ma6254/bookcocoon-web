import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  BookMarked,
  Eye,
  EyeOff,
  LibraryBig,
  Loader2,
  Lock,
  NotebookPen,
  User,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ROUTE_CONFIG } from '@/config'
import {
  clearRememberedAccount,
  getRememberedAccount,
  getStoredToken,
  login,
  rememberAccount,
} from '@/services/auth'
import './index.css'

const PASSWORD_PATTERN = /^[a-zA-Z0-9._%+-]{8,}$/

function Login() {
  const [account, setAccount] = useState(() => getRememberedAccount() ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const navigate = useNavigate()

  if (getStoredToken()) {
    return <Navigate to={ROUTE_CONFIG.homePath} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const normalizedAccount = account.trim()

    if (!normalizedAccount) {
      setErrorMessage('请输入账号')
      return
    }

    if (!password) {
      setErrorMessage('请输入密码')
      return
    }

    if (!PASSWORD_PATTERN.test(password)) {
      setErrorMessage('密码至少 8 位，且仅包含字母、数字或 . _ % + -')
      return
    }

    try {
      setLoading(true)
      setErrorMessage('')
      await login({ account: normalizedAccount, password })

      if (remember) {
        rememberAccount(normalizedAccount)
      } else {
        clearRememberedAccount()
      }

      navigate(ROUTE_CONFIG.homePath, { replace: true })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-label="系统登录">
        <div className="login-panel__visual">
          <div className="flex items-center gap-3.5">
            <span className="login-brand__logo">B</span>
            <span className="login-brand__name">BookCocoon</span>
          </div>

          <div className="login-hero">
            <Badge className="mb-4 px-3 py-1.5 text-sm font-bold">书茧 · 阅读管理平台</Badge>
            <h1>欢迎登录</h1>
            <p className="login-hero__desc">
              统一管理你的藏书、阅读进度与书评笔记，让每一次阅读都有迹可循。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3" aria-label="平台能力">
            <Badge variant="outline" className="login-feature">
              <BookMarked className="size-3.5" />
              藏书管理
            </Badge>
            <Badge variant="outline" className="login-feature">
              <LibraryBig className="size-3.5" />
              阅读记录
            </Badge>
            <Badge variant="outline" className="login-feature">
              <NotebookPen className="size-3.5" />
              书评笔记
            </Badge>
          </div>
        </div>

        <Card className="login-card">
          <CardContent className="login-card__content">
            <div className="login-card__header">
              <Badge className="px-3 py-1 text-sm font-bold">账户中心</Badge>
              <h2>账号登录</h2>
              <p>请输入账号信息进入系统</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {errorMessage ? (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertCircle className="size-4" />
                  <AlertTitle>登录失败</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-col gap-2">
                <Label htmlFor="account" className="text-sm font-semibold text-slate-700">
                  账号
                </Label>
                <div className="relative">
                  <User className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="account"
                    type="text"
                    value={account}
                    onChange={(event) => setAccount(event.target.value)}
                    placeholder="请输入账号（用户名或邮箱）"
                    autoComplete="username"
                    disabled={loading}
                    className="h-12 rounded-xl pr-4 pl-11"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
                  密码
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="请输入密码"
                    autoComplete="current-password"
                    disabled={loading}
                    className="h-12 rounded-xl pr-11 pl-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="-mt-1 flex items-center justify-between">
                <label
                  htmlFor="remember"
                  className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 select-none"
                >
                  <Checkbox
                    id="remember"
                    checked={remember}
                    onCheckedChange={(checked) => setRemember(checked === true)}
                    disabled={loading}
                  />
                  记住我
                </label>
                <a
                  href="/login"
                  onClick={(event) => event.preventDefault()}
                  className="text-primary text-sm font-medium hover:underline"
                >
                  忘记密码？
                </a>
              </div>

              <Button type="submit" disabled={loading} className="login-submit w-full">
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                {loading ? '登录中…' : '登录'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

export default Login
