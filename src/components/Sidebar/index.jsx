import { useState } from 'react'
import {
  BarChart3,
  BookCheck,
  BookMarked,
  BookOpen,
  BookPlus,
  Bookmark,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Info,
  LayoutDashboard,
  Library,
  MessageSquare,
  NotebookPen,
  Settings,
  StickyNote,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 侧边栏菜单项结构：
 * @property {string} key 唯一标识
 * @property {string} label 显示文本
 * @property {React.ReactNode} [icon] 图标
 * @property {string} [path] 导航路径（叶子节点）
 * @property {Array} [children] 子菜单
 */

export const menuItems = [
  { key: 'dashboard', label: '概览', icon: <LayoutDashboard className="size-4" />, path: '/dashboard' },
  {
    key: 'library',
    label: '藏书管理',
    icon: <Library className="size-4" />,
    children: [
      { key: 'books', label: '全部书籍', icon: <BookMarked className="size-4" />, path: '/books' },
      { key: 'book-create', label: '添加书籍', icon: <BookPlus className="size-4" />, path: '/books/create' },
    ],
  },
  {
    key: 'reading',
    label: '阅读记录',
    icon: <BookOpen className="size-4" />,
    children: [
      { key: 'reading-current', label: '在读', icon: <Clock className="size-4" />, path: '/reading/current' },
      { key: 'reading-finished', label: '已读', icon: <BookCheck className="size-4" />, path: '/reading/finished' },
      { key: 'reading-wishlist', label: '想读', icon: <Bookmark className="size-4" />, path: '/reading/wishlist' },
    ],
  },
  {
    key: 'notes',
    label: '书评笔记',
    icon: <NotebookPen className="size-4" />,
    children: [
      { key: 'reviews', label: '书评', icon: <MessageSquare className="size-4" />, path: '/reviews' },
      { key: 'notes', label: '读书笔记', icon: <StickyNote className="size-4" />, path: '/notes' },
    ],
  },
  { key: 'stats', label: '数据统计', icon: <BarChart3 className="size-4" />, path: '/stats' },
  {
    key: 'settings',
    label: '系统配置',
    icon: <Settings className="size-4" />,
    children: [
      { key: 'settings-info', label: '系统信息', icon: <Info className="size-4" />, path: '/settings/info' },
      { key: 'settings-users', label: '用户管理', icon: <Users className="size-4" />, path: '/settings/users' },
    ],
  },
]

function Sidebar({
  items = menuItems,
  currentPath = '',
  collapsed: controlledCollapsed,
  onCollapse,
  onNavigate,
}) {
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState(() => {
    const keys = new Set()
    for (const item of items) {
      if (item.children?.some((child) => child.path === currentPath)) {
        keys.add(item.key)
      }
    }
    return keys
  })

  const collapsed = controlledCollapsed ?? internalCollapsed

  function handleCollapse() {
    const nextCollapsed = !collapsed
    if (controlledCollapsed === undefined) {
      setInternalCollapsed(nextCollapsed)
    }
    onCollapse?.(nextCollapsed)
  }

  function handleNavigate(path) {
    if (!path) return
    onNavigate?.(path)
  }

  function toggleExpand(key) {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  function handleItemClick(item, hasChildren) {
    if (hasChildren) {
      if (collapsed) {
        // 折叠态下点击分组：先展开侧边栏，再展开该分组
        handleCollapse()
        setExpandedKeys((prev) => {
          const next = new Set(prev)
          next.add(item.key)
          return next
        })
      } else {
        toggleExpand(item.key)
      }
      return
    }

    if (item.path) {
      handleNavigate(item.path)
    }
  }

  function isActive(item) {
    if (item.path && currentPath === item.path) return true
    return item.children?.some(isActive) ?? false
  }

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-50 flex h-screen flex-col overflow-hidden bg-slate-900 text-slate-200',
        'transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* 品牌区 */}
      <div className="flex min-h-16 items-center gap-3 border-b border-white/10 px-4 py-4">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-[10px] text-lg font-extrabold text-sky-950"
          style={{ background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)' }}
        >
          B
        </span>
        {!collapsed && (
          <span className="truncate text-lg font-extrabold text-slate-50">BookCocoon</span>
        )}
      </div>

      {/* 导航区 */}
      <nav className="flex-1 overflow-y-auto py-3">
        {items.map((item) => {
          const hasChildren = item.children && item.children.length > 0
          const active = isActive(item)
          const expanded = expandedKeys.has(item.key)

          return (
            <div key={item.key} className="mx-2 my-0.5">
              <button
                type="button"
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap',
                  'text-slate-300 transition-colors hover:bg-white/10 hover:text-slate-50',
                  collapsed && 'justify-center px-2.5',
                  active && 'bg-sky-400/15 text-sky-400',
                )}
                onClick={() => handleItemClick(item, hasChildren)}
                title={collapsed ? item.label : undefined}
              >
                {item.icon && (
                  <span className="flex size-5 shrink-0 items-center justify-center">{item.icon}</span>
                )}
                {!collapsed && <span className="flex-1 truncate text-left">{item.label}</span>}
                {hasChildren && !collapsed && (
                  <ChevronRight
                    className={cn('size-4 shrink-0 transition-transform duration-200', expanded && 'rotate-90')}
                  />
                )}
              </button>

              {hasChildren && expanded && !collapsed && (
                <div className="mt-0.5 pl-5">
                  {item.children.map((child) => {
                    const childActive = isActive(child)
                    return (
                      <button
                        key={child.key}
                        type="button"
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] whitespace-nowrap',
                          'text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200',
                          childActive && 'bg-sky-400/10 text-sky-400',
                        )}
                        onClick={() => handleNavigate(child.path)}
                      >
                        {child.icon && (
                          <span className="flex size-5 shrink-0 items-center justify-center">
                            {child.icon}
                          </span>
                        )}
                        <span className="truncate text-left">{child.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* 折叠按钮 */}
      <button
        type="button"
        className="flex h-12 shrink-0 items-center justify-center border-t border-white/10 text-slate-500 transition-colors hover:text-slate-200"
        onClick={handleCollapse}
        title={collapsed ? '展开侧边栏' : '收起侧边栏'}
      >
        {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
      </button>
    </aside>
  )
}

export default Sidebar
