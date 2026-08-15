import { useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Sidebar from '@/components/Sidebar'
import { ROUTE_CONFIG } from '@/config'
import { clearLoginInfo, getStoredToken, getStoredUserInfo } from '@/services/auth'
import { findRouteTitle } from '@/router/routes'
import { cn } from '@/lib/utils'

function PageLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const token = getStoredToken()

  if (!token) {
    return <Navigate to={ROUTE_CONFIG.loginPath} replace />
  }

  const userInfo = getStoredUserInfo()
  const displayName = userInfo?.nick_name || userInfo?.user_name || 'BookCocoon'
  const title = findRouteTitle(location.pathname)

  function handleLogout() {
    clearLoginInfo()
    navigate(ROUTE_CONFIG.loginPath, { replace: true })
  }

  return (
    <div className="min-h-svh bg-slate-100">
      <Sidebar
        currentPath={location.pathname}
        collapsed={collapsed}
        onCollapse={setCollapsed}
        onNavigate={(path) => navigate(path)}
      />

      <main
        className={cn(
          'flex min-h-svh flex-col transition-[margin-left] duration-200 ease-in-out',
          collapsed ? 'ml-16' : 'ml-60',
        )}
      >
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
          <h1 className="text-base font-semibold text-slate-900">{title || 'BookCocoon'}</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700">{displayName}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut />
              退出登录
            </Button>
          </div>
        </header>

        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default PageLayout
