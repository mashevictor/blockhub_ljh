import { Navigate, Route, Routes } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import ScrollToTop from './components/ScrollToTop'
import IndustryHubRedirect from './components/IndustryHubRedirect'
import HomeApp from './HomeApp'
import RedirectToAdminLogin from './components/RedirectToAdminLogin'
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

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
      <Route path="/login" element={<RedirectToAdminLogin />} />
      <Route path="/register" element={<RedirectToAdminLogin />} />
      <Route path="/plaza" element={<PlazaLayout />}>
        <Route index element={<PlazaFeedPage />} />
        <Route path="my" element={<PlazaMyAppsPage />} />
      </Route>
      <Route path="/industry/:key" element={
        <ErrorBoundary fallbackTitle="行业详情页加载失败">
          <IndustryDetailPage />
        </ErrorBoundary>
      } />
      <Route path={ROUTES.industryHub} element={<IndustryHubRedirect />} />
      <Route path={ROUTES.shanghaiVoice} element={
        <ErrorBoundary fallbackTitle="上海话语音页加载失败">
          <ShanghaiVoicePage />
        </ErrorBoundary>
      } />
      <Route path="/share/:token" element={
        <ErrorBoundary fallbackTitle="资料包加载失败">
          <SharePackPage />
        </ErrorBoundary>
      } />
      <Route path="/s/:token" element={<ShareShortRedirect />} />
      <Route path={`${ROUTES.trust}/:docId`} element={
        <ErrorBoundary fallbackTitle="信任资料加载失败">
          <TrustDocDetailPage />
        </ErrorBoundary>
      } />
      <Route path={ROUTES.trust} element={
        <ErrorBoundary fallbackTitle="信任中心加载失败">
          <TrustCenterPage />
        </ErrorBoundary>
      } />
      <Route path={ROUTES.cases} element={
        <ErrorBoundary fallbackTitle="案例页加载失败">
          <CasesIndexPage />
        </ErrorBoundary>
      } />
      <Route path="/cases/:slug" element={
        <ErrorBoundary fallbackTitle="案例详情加载失败">
          <CaseDetailPage />
        </ErrorBoundary>
      } />
      <Route path={ROUTES.pricing} element={
        <ErrorBoundary fallbackTitle="定价页加载失败">
          <PricingPage />
        </ErrorBoundary>
      } />
      <Route path={ROUTES.pricingCheckout} element={
        <ErrorBoundary fallbackTitle="升级套餐页加载失败">
          <PricingCheckoutPage />
        </ErrorBoundary>
      } />
      <Route path={ROUTES.pricingResult} element={
        <ErrorBoundary fallbackTitle="支付结果页加载失败">
          <PricingResultPage />
        </ErrorBoundary>
      } />
      <Route path={ROUTES.accountBilling} element={
        <ErrorBoundary fallbackTitle="账户套餐页加载失败">
          <AccountBillingPage />
        </ErrorBoundary>
      } />
      <Route path={ROUTES.news} element={
        <ErrorBoundary fallbackTitle="新闻页加载失败">
          <NewsIndexPage />
        </ErrorBoundary>
      } />
      <Route path="/news/:slug" element={
        <ErrorBoundary fallbackTitle="新闻详情加载失败">
          <NewsDetailPage />
        </ErrorBoundary>
      } />
      <Route path="/for/:role" element={
        <ErrorBoundary fallbackTitle="角色页加载失败">
          <RolePage />
        </ErrorBoundary>
      } />
      <Route path={ROUTES.capship} element={
        <ErrorBoundary fallbackTitle="CapShip 开源页加载失败">
          <CapShipPage />
        </ErrorBoundary>
      } />
      <Route path="/preview/industry-runtime/:pack" element={
        <ErrorBoundary fallbackTitle="行业 Runtime 预览加载失败">
          <IndustryRuntimePreviewPage />
        </ErrorBoundary>
      } />
      <Route path="/preview/industry-runtime" element={<Navigate to="/preview/industry-runtime/mfg" replace />} />
      <Route path="/sites" element={<Navigate to="/" replace />} />
      <Route path="/" element={<HomeApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}
