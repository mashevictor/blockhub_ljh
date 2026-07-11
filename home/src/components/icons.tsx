import type { ComponentType, ReactNode, SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }
type IconComp = ComponentType<P>

const s = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

function mkIcon(paths: ReactNode): IconComp {
  return function Icon({ size = 20, ...p }: P) {
    return <svg {...s(size)} {...p}>{paths}</svg>
  }
}

export const IconSparkles = mkIcon(<><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /><path d="M20 3v4M22 5h-4" /></>)
export const IconMessage = mkIcon(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />)
export const IconBuilding = mkIcon(<><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M10 6h4M10 10h4M10 14h4M10 18h4" /></>)
export const IconPuzzle = mkIcon(<path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.014 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414z" />)
export const IconSettings = mkIcon(<><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></>)
export const IconZap = mkIcon(<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />)
export const IconLayers = mkIcon(<><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /></>)
export const IconDevices = mkIcon(<><rect width="7" height="9" x="3" y="8" rx="1" /><rect width="7" height="5" x="14" y="12" rx="1" /><path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" /></>)
export const IconArrowRight = mkIcon(<path d="M5 12h14M12 5l7 7-7 7" />)
export const IconBook = mkIcon(<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />)
export const IconCheckCircle = mkIcon(<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></>)
export const IconBarChart = mkIcon(<><path d="M3 3v18h18" /><path d="M18 17V9M13 17V5M8 17v-3" /></>)
export const IconBell = mkIcon(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>)
export const IconPlug = mkIcon(<><path d="M12 22v-5" /><path d="M9 8V2M15 8V2" /><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" /></>)
export const IconGitBranch = mkIcon(<><path d="M6 3v12" /><path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /><path d="M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /><path d="M15 6a9 9 0 0 0-9 9" /></>)
export const IconShield = mkIcon(<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />)
export const IconGlobe = mkIcon(<><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20" /></>)
export const IconSmartphone = mkIcon(<><rect width="14" height="20" x="5" y="2" rx="2" /><path d="M12 18h.01" /></>)
export const IconBot = mkIcon(<><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2M20 14h2M15 13v2M9 13v2" /></>)
export const IconMonitor = mkIcon(<><rect width="20" height="14" x="2" y="3" rx="2" /><path d="M8 21h8M12 17v4" /></>)
export const IconLaptop = mkIcon(<><path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9" /><path d="M2 17h20v2H2z" /></>)
export const IconUsers = mkIcon(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>)
export const IconLogIn = mkIcon(<><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" x2="3" y1="12" y2="12" /></>)
export const IconWallet = mkIcon(<><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" /></>)
export const IconFactory = mkIcon(<><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M17 18h1M12 18h1M7 18h1" /></>)
export const IconTrending = mkIcon(<><path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" /></>)
export const IconHeartPulse = mkIcon(<><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" /></>)
export const IconGamepad = mkIcon(<><path d="M6 11h4M8 9v4" /><path d="M15 12h.01M18 10h.01" /><rect width="20" height="12" x="2" y="6" rx="2" /></>)
export const IconShopping = mkIcon(<><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></>)
export const IconGraduation = mkIcon(<><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></>)
export const IconLandmark = mkIcon(<><path d="M10 18v-7" /><path d="M11.25 5.5a2.5 2.5 0 0 1 3.5 0L19 9H5z" /><path d="M14 18v-7" /><path d="M6 18v-4" /><path d="M18 18v-4" /><path d="M2 21h20" /></>)
export const IconTruck = mkIcon(<><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></>)
export const IconHome = mkIcon(<><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>)
export const IconUtensils = mkIcon(<><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" /></>)
export const IconZapCircle = mkIcon(<><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>)
export const IconScale = mkIcon(<><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="M7 21h10" /><path d="M12 3v18" /><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" /></>)
export const IconMegaphone = mkIcon(<><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></>)
export const IconHammer = mkIcon(<><path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9" /><path d="M17.64 15 22 10.64" /><path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-7.81 0l-.86.86v2.28c0 .85-.33 1.65-.93 2.25L4.79 11.7" /></>)
export const IconLeaf = mkIcon(<><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></>)
export const IconFilm = mkIcon(<><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M7 3v18M17 3v18M3 7.5h4M3 12h18M3 16.5h4M17 7.5h4M17 16.5h4" /></>)
export const IconCar = mkIcon(<><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></>)
export const IconBriefcase = mkIcon(<><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /><rect width="20" height="14" x="2" y="6" rx="2" /></>)
export const IconFileText = mkIcon(<><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8" /></>)
export const IconClipboard = mkIcon(<><rect width="8" height="4" x="8" y="2" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></>)
export const IconDatabase = mkIcon(<><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 21 19V5" /><path d="M3 12A9 3 0 0 0 21 12" /></>)
export const IconWrench = mkIcon(<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />)
export const IconLink = mkIcon(<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>)
export const IconX = mkIcon(<><path d="M18 6 6 18M6 6l12 12" /></>)
export const IconChevronDown = mkIcon(<path d="m6 9 6 6 6-6" />)

export const CAPABILITY_ICONS: Record<string, IconComp> = {
  creation: IconSparkles,
  chat_qa: IconMessage,
  kb: IconBook,
  approval: IconCheckCircle,
  report: IconBarChart,
  notify: IconBell,
  integration: IconPlug,
  workflow: IconGitBranch,
  security: IconShield,
  portal: IconDevices,
}

export const INDUSTRY_ICONS: Record<string, IconComp> = {
  office: IconBuilding,
  mfg: IconFactory,
  sales: IconTrending,
  med: IconHeartPulse,
  game: IconGamepad,
  retail: IconShopping,
  edu: IconGraduation,
  finance: IconLandmark,
  logistics: IconTruck,
  realestate: IconHome,
  hotel: IconUtensils,
  energy: IconZapCircle,
  gov: IconLandmark,
  legal: IconScale,
  hr: IconUsers,
  marketing: IconMegaphone,
  construction: IconHammer,
  agriculture: IconLeaf,
  media: IconFilm,
  auto: IconCar,
}

export const PLATFORM_ICONS: Record<string, IconComp> = {
  web: IconGlobe,
  ios: IconSmartphone,
  android: IconBot,
  windows: IconMonitor,
  mac: IconLaptop,
}

export const CATEGORY_ICONS: Record<string, IconComp> = {
  '人事行政': IconUsers,
  '财务法务': IconWallet,
  '知识协同': IconBook,
  '流程审批': IconClipboard,
  '数据报表': IconBarChart,
  '消息通知': IconBell,
  'IT与资产': IconWrench,
  '外部对接': IconLink,
  '临床知识': IconHeartPulse,
  '合规管理': IconShield,
  '人事管理': IconUsers,
  '物资管理': IconShopping,
  '患者服务': IconMessage,
  '数据安全': IconShield,
  '医疗安全': IconShield,
  '数据分析': IconBarChart,
  '培训管理': IconGraduation,
  '系统集成': IconPlug,
  '临床管理': IconCheckCircle,
  '设备管理': IconWrench,
  '知识管理': IconBook,
  '生产管理': IconFactory,
  '质量管理': IconCheckCircle,
  '物料管理': IconDatabase,
  '安全管理': IconShield,
  '绿色制造': IconLeaf,
  '审批流程': IconClipboard,
  '客户管理': IconUsers,
  '消息通知_ind': IconBell,
  '玩家服务': IconGamepad,
  '客服管理': IconMessage,
  '合规管理_game': IconShield,
  'C端功能': IconSmartphone,
  '安全合规': IconShield,
  '社区管理': IconUsers,
}

export function DynamicIcon({
  name,
  size = 20,
  color,
  className,
}: {
  name: string
  size?: number
  color?: string
  className?: string
}) {
  const Icon =
    CAPABILITY_ICONS[name] ??
    INDUSTRY_ICONS[name] ??
    PLATFORM_ICONS[name] ??
    CATEGORY_ICONS[name] ??
    IconLayers
  return <Icon size={size} color={color} className={className} style={color ? { color } : undefined} />
}
