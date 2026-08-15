import { Link, useLocation } from 'react-router-dom'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@radix-ui/react-collapsible'
import {
  BarChart3,
  BookCheck,
  BookMarked,
  BookOpen,
  BookPlus,
  Bookmark,
  ChevronRight,
  Clock,
  Info,
  LayoutDashboard,
  Library,
  MessageSquare,
  NotebookPen,
  Settings,
  StickyNote,
  Upload,
  Users,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { ROUTE_CONFIG } from '@/config'

export const menuItems = [
  { key: 'dashboard', label: '概览', icon: <LayoutDashboard className="size-4" />, path: '/dashboard' },
  {
    key: 'library',
    label: '藏书管理',
    icon: <Library className="size-4" />,
    children: [
      { key: 'books', label: '书架', icon: <BookMarked className="size-4" />, path: '/books' },
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
      { key: 'settings-upload-files', label: '上传文件管理', icon: <Upload className="size-4" />, path: '/settings/upload-files' },
      { key: 'settings-users', label: '用户管理', icon: <Users className="size-4" />, path: '/settings/users' },
    ],
  },
]

function AppSidebar(props) {
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()

  function isActive(item) {
    if (item.path && pathname === item.path) return true
    return item.children?.some(isActive) ?? false
  }

  function closeMobile() {
    setOpenMobile(false)
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to={ROUTE_CONFIG.homePath} onClick={closeMobile}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <BookOpen className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">BookCocoon</span>
                  <span className="truncate text-xs text-muted-foreground">书茧阅读管理平台</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const hasChildren = item.children && item.children.length > 0

                if (hasChildren) {
                  const groupOpen = item.children.some((child) => child.path === pathname)

                  return (
                    <Collapsible key={item.key} asChild defaultOpen={groupOpen} className="group/collapsible">
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={item.label}>
                            {item.icon}
                            <span>{item.label}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.children.map((child) => (
                              <SidebarMenuSubItem key={child.key}>
                                <SidebarMenuSubButton asChild isActive={isActive(child)}>
                                  <Link to={child.path} onClick={closeMobile}>
                                    {child.icon}
                                    <span>{child.label}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  )
                }

                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton asChild isActive={isActive(item)} tooltip={item.label}>
                      <Link to={item.path} onClick={closeMobile}>
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}

export default AppSidebar
