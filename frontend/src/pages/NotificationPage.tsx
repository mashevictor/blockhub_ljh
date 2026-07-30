import { useEffect, useState } from 'react'
import { useT } from '@blockhub/i18n/react'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '../api/client'

const TYPE_ICON: Record<string, string> = {
  approval: '✅',
  kb: '📚',
  announce: '📢',
  report: '📊',
  creation: '✨',
}

export default function NotificationPage() {
  const t = useT()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)

  const load = () => {
    fetchNotifications(filter === 'unread' ? 'unread' : undefined).then((d) => {
      setItems(d.items)
      setUnread(d.unread)
    })
  }

  useEffect(() => { load() }, [filter])

  const handleRead = async (id: string) => {
    await markNotificationRead(id)
    load()
  }

  const handleReadAll = async () => {
    await markAllNotificationsRead()
    load()
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h1>{t('admin.page.notifications.title')}</h1>
          <p>{t('admin.page.notifications.desc')}</p>
        </div>
        <button type="button" className="btn btn-primary-dark" onClick={handleReadAll}>
          全部已读
        </button>
      </div>

      <div className="filter-tabs" style={{ marginBottom: 16 }}>
        <button type="button" className={`filter-tab${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>
          全部
        </button>
        <button type="button" className={`filter-tab${filter === 'unread' ? ' active' : ''}`} onClick={() => setFilter('unread')}>
          未读 {unread}
        </button>
      </div>

      <div className="notify-list">
        {items.map((n) => (
          <div key={n.id} className={`notify-item${n.read ? '' : ' unread'}`} onClick={() => !n.read && handleRead(n.id)}>
            <div className="notify-icon">{TYPE_ICON[n.type] ?? '🔔'}</div>
            <div className="notify-body">
              <div className="notify-title">{n.title}{!n.read && <span className="unread-dot" />}</div>
              <div className="notify-content">{n.content}</div>
              <div className="notify-time">{n.time}</div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="placeholder-page"><p>暂无通知</p></div>
        )}
      </div>
    </>
  )
}
