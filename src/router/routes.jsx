import PagePlaceholder from '@/components/PagePlaceholder'
import BookshelfPage from '@/pages/books'
import AddBookPage from '@/pages/books/create'
import ReaderPage from '@/pages/books/read'
import ReaderPageMobile from '@/pages/books/read/mobile'
import ReadingRecordsPage from '@/pages/reading-records'
import UploadFilesPage from '@/pages/upload-files'
import SystemInfoPage from '@/pages/system-info'

// 应用路由表：path 需与侧边栏 menuItems 中的 path 保持一致。
export const appRoutes = [
  { path: '/dashboard', title: '概览', element: <PagePlaceholder title="概览" description="藏书与阅读数据总览。" /> },
  { path: '/books', title: '书架', element: <BookshelfPage /> },
  { path: '/books/create', title: '添加书籍', element: <AddBookPage /> },
  { path: '/books/read/:bookId', title: '阅读', element: <ReaderPage /> },
  { path: '/books/read/m/:bookId', title: '阅读', element: <ReaderPageMobile /> },
  { path: '/reading/records', title: '阅读记录', element: <ReadingRecordsPage /> },
  { path: '/reading/current', title: '在读', element: <PagePlaceholder title="在读" /> },
  { path: '/reading/finished', title: '已读', element: <PagePlaceholder title="已读" /> },
  { path: '/reading/wishlist', title: '想读', element: <PagePlaceholder title="想读" /> },
  { path: '/reviews', title: '书评', element: <PagePlaceholder title="书评" /> },
  { path: '/notes', title: '读书笔记', element: <PagePlaceholder title="读书笔记" /> },
  { path: '/stats', title: '数据统计', element: <PagePlaceholder title="数据统计" /> },
  { path: '/settings/info', title: '系统信息', element: <SystemInfoPage /> },
  { path: '/settings/upload-files', title: '上传文件管理', element: <UploadFilesPage /> },
  { path: '/settings/users', title: '用户管理', element: <PagePlaceholder title="用户管理" /> },
]

export function findRouteTitle(pathname) {
  if (pathname.startsWith('/books/read/')) return '阅读'
  return appRoutes.find((route) => route.path === pathname)?.title ?? ''
}
