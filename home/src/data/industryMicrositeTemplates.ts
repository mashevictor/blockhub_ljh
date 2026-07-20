/**
 * 20 套行业独立站网页模板（源自 codecode/home/sites）
 * 用户可在行业站切换预览，再到 >> 悬浮框编排能力后发布。
 */

export interface IndustryMicrositeTemplate {
  id: string
  name: string
  category: string
  style: string
  styleLabel: string
  brand: string
  /** public 路径，相对站点根 */
  previewPath: string
}

/** 与 public/industry-microsites/catalog.json 一致 */
export const INDUSTRY_MICROSITE_TEMPLATES: IndustryMicrositeTemplate[] = [
  { id: 'law-firm', name: '律所', category: '商业服务', style: 'helios', styleLabel: 'Helios · 全屏开场', brand: '衡正律师事务所', previewPath: '/industry-microsites/law-firm/index.html' },
  { id: 'accounting', name: '会计财税', category: '商业服务', style: 'landed', styleLabel: 'Landed · 稳重商务', brand: '澄算财税', previewPath: '/industry-microsites/accounting/index.html' },
  { id: 'consulting', name: '企业管理咨询', category: '商业服务', style: 'readonly', styleLabel: 'Read Only · 极简名片', brand: '观澜咨询', previewPath: '/industry-microsites/consulting/index.html' },
  { id: 'clinic', name: '私立诊所', category: '医疗健康', style: 'tessellate', styleLabel: 'Tessellate · 块面拼贴', brand: '安澜综合门诊', previewPath: '/industry-microsites/clinic/index.html' },
  { id: 'dental', name: '牙科', category: '医疗健康', style: 'fractal', styleLabel: 'Fractal · 产品焦点', brand: '白芽齿科', previewPath: '/industry-microsites/dental/index.html' },
  { id: 'wellness', name: '康养中心', category: '医疗健康', style: 'photon', styleLabel: 'Photon · 分区图标条', brand: '栖息康养', previewPath: '/industry-microsites/wellness/index.html' },
  { id: 'education', name: '在线教育', category: '教育培训', style: 'massively', styleLabel: 'Massively · 杂志栅格', brand: '启知课堂', previewPath: '/industry-microsites/education/index.html' },
  { id: 'training', name: '培训机构', category: '教育培训', style: 'editorial', styleLabel: 'Editorial · 侧栏杂志', brand: '砺才研修', previewPath: '/industry-microsites/training/index.html' },
  { id: 'study-abroad', name: '留学咨询', category: '教育培训', style: 'stellar', styleLabel: 'Stellar · 居中纵轴', brand: '远航留学', previewPath: '/industry-microsites/study-abroad/index.html' },
  { id: 'restaurant', name: '精品餐厅', category: '餐饮酒店', style: 'bigpicture', styleLabel: 'Big Picture · 全幅影像', brand: '烟火里', previewPath: '/industry-microsites/restaurant/index.html' },
  { id: 'hotel', name: '精品酒店', category: '餐饮酒店', style: 'story', styleLabel: 'Story · 叙事长滚动', brand: '松间驿', previewPath: '/industry-microsites/hotel/index.html' },
  { id: 'real-estate', name: '房地产中介', category: '地产建筑', style: 'forty', styleLabel: 'Forty · 大字标题', brand: '立居不动产', previewPath: '/industry-microsites/real-estate/index.html' },
  { id: 'interior', name: '室内设计', category: '地产建筑', style: 'paradigm', styleLabel: 'Paradigm · 非对称编辑', brand: '界线设计', previewPath: '/industry-microsites/interior/index.html' },
  { id: 'saas', name: 'SaaS软件', category: '科技制造', style: 'hyperspace', styleLabel: 'Hyperspace · 侧栏导航', brand: 'FlowBoard', previewPath: '/industry-microsites/saas/index.html' },
  { id: 'hardware', name: '智能硬件', category: '科技制造', style: 'nova', styleLabel: 'Nova · 电影感科技', brand: 'NOVA X', previewPath: '/industry-microsites/hardware/index.html' },
  { id: 'manufacturing', name: '工厂制造', category: '科技制造', style: 'solidstate', styleLabel: 'Solid State · 深色企业', brand: '劲造精密', previewPath: '/industry-microsites/manufacturing/index.html' },
  { id: 'beauty', name: '美容院', category: '生活消费', style: 'spectral', styleLabel: 'Spectral · 渐变首屏', brand: '岚光美业', previewPath: '/industry-microsites/beauty/index.html' },
  { id: 'fitness', name: '健身工作室', category: '生活消费', style: 'dimension', styleLabel: 'Dimension · 遮罩面板', brand: '脉冲训练馆', previewPath: '/industry-microsites/fitness/index.html' },
  { id: 'pet', name: '宠物服务', category: '生活消费', style: 'multiverse', styleLabel: 'Multiverse · 图库矩阵', brand: '爪迹生活', previewPath: '/industry-microsites/pet/index.html' },
  { id: 'photography', name: '摄影工作室', category: '生活消费', style: 'sonar', styleLabel: 'Sonar · 摄影瀑布流', brand: '光迹影像', previewPath: '/industry-microsites/photography/index.html' },
]

/** BlockHub 20 行业包 → 默认网页模板（一对一） */
export const PACK_DEFAULT_MICROSITE: Record<string, string> = {
  legal: 'law-firm',
  finance: 'accounting',
  office: 'consulting',
  med: 'clinic',
  sales: 'consulting',
  hotel: 'hotel',
  edu: 'education',
  hr: 'training',
  gov: 'study-abroad',
  retail: 'restaurant',
  realestate: 'real-estate',
  construction: 'interior',
  marketing: 'saas',
  auto: 'hardware',
  mfg: 'manufacturing',
  media: 'beauty',
  game: 'fitness',
  logistics: 'pet',
  agriculture: 'photography',
  energy: 'wellness',
}

const STORAGE_KEY = 'blockhub_industry_microsite_v2'

export function getMicrositeTemplate(id: string): IndustryMicrositeTemplate | undefined {
  return INDUSTRY_MICROSITE_TEMPLATES.find((t) => t.id === id)
}

export function defaultMicrositeIdForPack(packKey: string): string {
  return PACK_DEFAULT_MICROSITE[packKey] ?? INDUSTRY_MICROSITE_TEMPLATES[0]?.id ?? 'consulting'
}

export function loadSavedMicrositeId(packKey: string): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultMicrositeIdForPack(packKey)
    const map = JSON.parse(raw) as Record<string, string>
    const id = map[packKey]
    if (id && getMicrositeTemplate(id)) return id
  } catch {
    /* ignore */
  }
  return defaultMicrositeIdForPack(packKey)
}

export function saveMicrositeId(packKey: string, templateId: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {}
    map[packKey] = templateId
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}
