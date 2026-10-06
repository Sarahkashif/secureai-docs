import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { buttonStyles } from '@/components/ui/Button'

export default function NotFound({ inApp = false }: { inApp?: boolean }) {
  const content = (
    <EmptyState
      icon={Compass}
      title="Page not found"
      description="The page you're looking for doesn't exist or has moved."
      action={
        <Link to={inApp ? '/app' : '/'} className={buttonStyles('primary')}>
          {inApp ? 'Back to dashboard' : 'Back to home'}
        </Link>
      }
    />
  )
  return inApp ? content : <div className="flex min-h-screen items-center justify-center bg-white dark:bg-navy-900">{content}</div>
}
