import { useEffect, useState, type ReactNode } from 'react'
import B2BHeader from '../B2BHeader'
import { fetchMe, logout, type AuthUser } from '../../../auth/session'
import { getToken } from '../../../auth/storage'
import B2BSiteFooter from '../B2BSiteFooter'
import '../../../styles/b2b-landing.css'

interface Props {
  children: ReactNode
  pageTitle?: string
  pageEyebrow?: string
  pageLead?: string
}

/** 案例 / 信任 / 定价 / 新闻等子站 — 与首页共用 B2BHeader + b2b-section 视觉 */
export default function MarketingSiteShell({ children, pageTitle, pageEyebrow, pageLead }: Props) {
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    document.body.classList.add('b2b-landing')
    return () => document.body.classList.remove('b2b-landing')
  }, [])

  useEffect(() => {
    if (!getToken()) {
      setUser(null)
      return
    }
    fetchMe().then(setUser).catch(() => setUser(null))
  }, [])

  return (
    <div className="b2b-app b2b-landing marketing-site b2b-brand-scope">
      <B2BHeader user={user} onLogout={() => logout()} />

      <main className="marketing-site-main">
        <section className="b2b-section b2b-product-section marketing-site-section">
          {pageTitle ? (
            <div className="b2b-section-title b2b-product-head marketing-site-page-head">
              {pageEyebrow ? <span className="b2b-eyebrow">{pageEyebrow}</span> : null}
              <h1>{pageTitle}</h1>
              {pageLead ? <p>{pageLead}</p> : null}
            </div>
          ) : null}
          <div className="b2b-product-block marketing-site-content">{children}</div>
        </section>
      </main>

      <B2BSiteFooter variant="light" />
    </div>
  )
}
