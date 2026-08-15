import { useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import ThemeToggle from '@/components/theme-toggle'
import { cn } from '@/lib/utils'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import AppSidebar from '@/components/Sidebar'
import { ROUTE_CONFIG } from '@/config'
import { clearLoginInfo, getStoredToken, getStoredUserInfo } from '@/services/auth'
import { findRouteTitle } from '@/router/routes'

function PageLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = getStoredToken()
  const [wide, setWide] = useState(() => localStorage.getItem('bookcocoon-content-wide') !== 'false')

  function toggleWide() {
    setWide((value) => {
      const next = !value
      localStorage.setItem('bookcocoon-content-wide', String(next))
      return next
    })
  }

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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="truncate text-base font-semibold">{title || 'BookCocoon'}</h1>
          </div>

          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleWide}
              aria-label={wide ? '切换为窄版' : '切换为宽版'}
              title={wide ? '切换为窄版' : '切换为宽版'}
            >
              {wide ? <Minimize2 /> : <Maximize2 />}
            </Button>
            <span className="hidden text-sm font-medium sm:inline">{displayName}</span>
            <Button variant="ghost" size="sm" className="px-2 md:px-3" onClick={handleLogout}>
              <LogOut />
              <span className="hidden md:inline">退出登录</span>
            </Button>
          </div>
        </header>

        <div className={cn('flex flex-1 flex-col gap-4 p-4 md:p-6', !wide && 'mx-auto w-full max-w-5xl')}>
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default PageLayout
