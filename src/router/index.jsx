import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import PageLayout from '@/components/PageLayout'
import Login from '@/pages/login'
import { ROUTE_CONFIG } from '@/config'
import { appRoutes } from './routes'

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-6xl font-extrabold text-muted-foreground/40">404</p>
      <p className="mt-3 text-muted-foreground">页面不存在</p>
    </div>
  )
}

function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTE_CONFIG.loginPath} element={<Login />} />

        <Route element={<PageLayout />}>
          <Route path="/" element={<Navigate to={ROUTE_CONFIG.homePath} replace />} />
          {appRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default Router
