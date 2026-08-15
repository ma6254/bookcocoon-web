import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function PagePlaceholder({ title, description = '该页面内容待实现，后续将替换为真实页面。' }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-400">占位页面</p>
      </CardContent>
    </Card>
  )
}

export default PagePlaceholder
