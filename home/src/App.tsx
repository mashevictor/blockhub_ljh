import { Navigate, Route, Routes } from 'react-router-dom'
import ErrorBoundary, { LocalizedErrorBoundary } from './components/ErrorBoundary'
import ScrollToTop from './components/ScrollToTop'
import IndustryHubRedirect from './components/IndustryHubRedirect'
import HomeApp from './HomeApp'
import RedirectToAdminLogin from './components/RedirectToAdminLogin'
import RequireAuth from './components/RequireAuth'
import PlazaLayout from './pages/plaza/PlazaLayout'
import PlazaFeedPage from './pages/plaza/PlazaFeedPage'
import PlazaMyAppsPage from './pages/plaza/PlazaMyAppsPage'
import IndustryDetailPage from './pages/IndustryDetailPage'
import SharePackPage from './pages/SharePackPage'
import ShareShortRedirect from './pages/ShareShortRedirect'
import ShanghaiVoicePage from './pages/ShanghaiVoicePage'
import TrustCenterPage from './pages/enrichment/TrustCenterPage'
import TrustDocDetailPage from './pages/enrichment/TrustDocDetailPage'
import CasesIndexPage from './pages/enrichment/CasesIndexPage'
import CaseDetailPage from './pages/enrichment/CaseDetailPage'
import PricingPage from './pages/enrichment/PricingPage'
import PricingCheckoutPage from './pages/enrichment/PricingCheckoutPage'
import PricingResultPage from './pages/enrichment/PricingResultPage'
import AccountBillingPage from './pages/account/AccountBillingPage'
import NewsIndexPage from './pages/enrichment/NewsIndexPage'
import NewsDetailPage from './pages/enrichment/NewsDetailPage'
import RolePage from './pages/enrichment/RolePage'
import CapShipPage from './pages/CapShipPage'
import IndustryRuntimePreviewPage from './pages/IndustryRuntimePreviewPage'
import { ROUTES } from './routes/paths'
import { useT } from '@blockhub/i18n/react'

function AuthPage({ children, titleKey }: { children: React.ReactNode; titleKey: string }) {
  const t = useT()
  return (
    <RequireAuth>
      <ErrorBoundary
        fallbackTitle={t(titleKey)}
        backHomeLabel={t('home.error.back_home')}
      >
        {children}
      </ErrorBoundary>
    </RequireAuth>
  )
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
      <Route path="/login" element={<RedirectToAdminLogin />} />
      <Route path="/register" element={<RedirectToAdminLogin />} />
      <Route path="/plaza" element={<PlazaLayout />}>
        <Route index element={<PlazaFeedPage />} />
        <Route path="my" element={<AuthPage titleKey="home.error.plaza_my"><PlazaMyAppsPage /></AuthPage>} />
      </Route>
      <Route path="/industry/:key" element={
        <LocalizedErrorBoundary titleKey="home.error.industry_detail">
          <IndustryDetailPage />
        </LocalizedErrorBoundary>
      } />
      <Route path={ROUTES.industryHub} element={<IndustryHubRedirect />} />
      <Route path={ROUTES.shanghaiVoice} element={
        <LocalizedErrorBoundary titleKey="home.error.shanghai_voice">
          <ShanghaiVoicePage />
        </LocalizedErrorBoundary>
      } />
      <Route path="/share/:token" element={
        <LocalizedErrorBoundary titleKey="home.error.share_pack">
          <SharePackPage />
        </LocalizedErrorBoundary>
      } />
      <Route path="/s/:token" element={<ShareShortRedirect />} />
      <Route path={`${ROUTES.trust}/:docId`} element={
        <LocalizedErrorBoundary titleKey="home.error.trust_doc">
          <TrustDocDetailPage />
        </LocalizedErrorBoundary>
      } />
      <Route path={ROUTES.trust} element={
        <LocalizedErrorBoundary titleKey="home.error.trust">
          <TrustCenterPage />
        </LocalizedErrorBoundary>
      } />
      <Route path={ROUTES.cases} element={
        <LocalizedErrorBoundary titleKey="home.error.cases">
          <CasesIndexPage />
        </LocalizedErrorBoundary>
      } />
      <Route path="/cases/:slug" element={
        <LocalizedErrorBoundary titleKey="home.error.case_detail">
          <CaseDetailPage />
        </LocalizedErrorBoundary>
      } />
      <Route path={ROUTES.pricing} element={
        <LocalizedErrorBoundary titleKey="home.error.pricing">
          <PricingPage />
        </LocalizedErrorBoundary>
      } />
      <Route path={ROUTES.pricingCheckout} element={
        <AuthPage titleKey="home.error.pricing_checkout"><PricingCheckoutPage /></AuthPage>
      } />
      <Route path={ROUTES.pricingResult} element={
        <AuthPage titleKey="home.error.pricing_result"><PricingResultPage /></AuthPage>
      } />
      <Route path={ROUTES.accountBilling} element={
        <AuthPage titleKey="home.error.account_billing"><AccountBillingPage /></AuthPage>
      } />
      <Route path={ROUTES.news} element={
        <LocalizedErrorBoundary titleKey="home.error.news">
          <NewsIndexPage />
        </LocalizedErrorBoundary>
      } />
      <Route path="/news/:slug" element={
        <LocalizedErrorBoundary titleKey="home.error.news_detail">
          <NewsDetailPage />
        </LocalizedErrorBoundary>
      } />
      <Route path="/for/:role" element={
        <LocalizedErrorBoundary titleKey="home.error.role">
          <RolePage />
        </LocalizedErrorBoundary>
      } />
      <Route path={ROUTES.capship} element={
        <LocalizedErrorBoundary titleKey="home.error.capship">
          <CapShipPage />
        </LocalizedErrorBoundary>
      } />
      <Route path="/preview/industry-runtime/:pack" element={
        <LocalizedErrorBoundary titleKey="home.error.industry_runtime">
          <IndustryRuntimePreviewPage />
        </LocalizedErrorBoundary>
      } />
      <Route path="/preview/industry-runtime" element={<Navigate to="/preview/industry-runtime/mfg" replace />} />
      <Route path="/sites" element={<Navigate to="/" replace />} />
      <Route path="/" element={<HomeApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}
