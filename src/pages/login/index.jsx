import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AlertCircle, BookOpen, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ThemeToggle from '@/components/theme-toggle'
import { ROUTE_CONFIG } from '@/config'
import {
  clearRememberedAccount,
  getRememberedAccount,
  getStoredToken,
  login,
  rememberAccount,
} from '@/services/auth'

const PASSWORD_PATTERN = /^[a-zA-Z0-9._%+-]{8,}$/

function Login() {
  const navigate = useNavigate()
  const [account, setAccount] = useState(() => getRememberedAccount() ?? '')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

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
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href={ROUTE_CONFIG.homePath} className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BookOpen className="size-4" />
          </div>
          BookCocoon
        </a>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">账号登录</CardTitle>
            <CardDescription>请输入账号信息进入系统</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-6">
                {errorMessage ? (
                  <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertTitle>登录失败</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="grid gap-2">
                  <Label htmlFor="account">账号</Label>
                  <Input
                    id="account"
                    type="text"
                    placeholder="用户名或邮箱"
                    value={account}
                    onChange={(event) => setAccount(event.target.value)}
                    autoComplete="username"
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">密码</Label>
                    <a
                      href="#"
                      onClick={(event) => event.preventDefault()}
                      className="ml-auto text-sm underline-offset-4 hover:underline"
                    >
                      忘记密码？
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={remember}
                    onCheckedChange={(checked) => setRemember(checked === true)}
                    disabled={loading}
                  />
                  <Label htmlFor="remember">记住我</Label>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : null}
                  {loading ? '登录中…' : '登录'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Login
