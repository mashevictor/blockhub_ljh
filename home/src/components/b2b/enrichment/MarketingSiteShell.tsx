import { useEffect, useState, type ReactNode } from 'react'
import B2BHeader from '../B2BHeader'
import { fetchMe, logout, type AuthUser } from '../../../auth/session'
import { getToken } from '../../../auth/storage'
import B2BSiteFooter from '../B2BSiteFooter'
import '../../../styles/b2b-landing.css'
import '../../../styles/marketing-landed.css'

interface Props {
  children: ReactNode
  pageTitle?: string
  pageEyebrow?: string
  pageLead?: string
  /**
   * default：与首页一致（新闻动态）
   * landed：Landed 稳重商务布局，但字体仍用主页 Apple 字体栈（案例/信任/定价）
   */
  skin?: 'default' | 'landed'
}

/** 案例 / 信任 / 定价 / 新闻等子站共用壳 */
export default function MarketingSiteShell({
  children,
  pageTitle,
  pageEyebrow,
  pageLead,
  skin = 'default',
}: Props) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const landed = skin === 'landed'

  useEffect(() => {
    document.body.classList.add('b2b-landing')
    if (landed) document.body.classList.add('marketing-landed-body')
    return () => {
      document.body.classList.remove('b2b-landing', 'marketing-landed-body')
    }
  }, [landed])

  useEffect(() => {
    if (!getToken()) {
      setUser(null)
      return
    }
    fetchMe().then(setUser).catch(() => setUser(null))
  }, [])

  return (
    <div
      className={[
        'b2b-app',
        'b2b-landing',
        'marketing-site',
        'b2b-brand-scope',
        landed ? 'marketing-site--landed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <B2BHeader user={user} onLogout={() => logout()} />

      <main className="marketing-site-main">
        <section className="b2b-section b2b-product-section marketing-site-section">
          {pageTitle ? (
            <div
              className={[
                'b2b-section-title',
                'b2b-product-head',
                'marketing-site-page-head',
                landed ? 'reveal' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {pageEyebrow ? <span className="b2b-eyebrow">{pageEyebrow}</span> : null}
              <h1>{pageTitle}</h1>
              {pageLead ? <p className={landed ? 'reveal d2' : undefined}>{pageLead}</p> : null}
            </div>
          ) : null}
          <div
            className={[
              'b2b-product-block',
              'marketing-site-content',
              landed ? 'reveal d3' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {children}
          </div>
        </section>
      </main>

      <B2BSiteFooter variant="light" />
    </div>
  )
}
