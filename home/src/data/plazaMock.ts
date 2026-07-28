export type FeedVisibility = 'public' | 'org' | 'dept'

export interface PlazaFeedItem {
  id: string
  appKey?: string
  authorName: string
  authorInitial: string
  authorMeta: string
  timeLabel: string
  visibility: FeedVisibility
  atLabel: string
  appName: string
  modules: string[]
  summary: string
  webUrl: string
  likes: number
  comments: number
  reposts: number
  commentPreview?: { author: string; text: string }[]
}

export const PLAZA_MOCK_FEED: PlazaFeedItem[] = [
  {
    id: 'f1',
    appKey: 'http://124.222.177.43/r/demo001',
    authorName: '李明',
    authorInitial: '李',
    authorMeta: '制造业',
    timeLabel: '12 分钟前',
    visibility: 'public',
    atLabel: '@全员',
    appName: '设备报修助手',
    modules: ['审批流', '智能问答', '知识库'],
    summary: '产线故障拍照报修 → 主管审批 → 派工跟踪。含 4 项能力，Web + App 双端。',
    webUrl: 'http://124.222.177.43/r/demo001',
    likes: 24,
    comments: 8,
    reposts: 3,
    commentPreview: [
      { author: '王芳', text: '我们产线也在用类似的，审批很快' },
    ],
  },
  {
    id: 'f2',
    appKey: 'http://124.222.177.43/r/demo002',
    authorName: '张敏',
    authorInitial: '张',
    authorMeta: 'HR',
    timeLabel: '1 小时前',
    visibility: 'dept',
    atLabel: '@研发部',
    appName: '请假出差一体化',
    modules: ['审批流', '待办中心'],
    summary: '范围可见 · 广场仅显示摘要，详情需组织内账号访问。',
    webUrl: 'http://124.222.177.43/r/demo002',
    likes: 56,
    comments: 12,
    reposts: 9,
  },
  {
    id: 'f3',
    appKey: 'http://124.222.177.43/r/demo003',
    authorName: '陈总',
    authorInitial: '陈',
    authorMeta: '管理层',
    timeLabel: '2 小时前',
    visibility: 'public',
    atLabel: '@老板',
    appName: '经营看板 Lite',
    modules: ['数据看板', '智能问数'],
    summary: '一句话问业绩 · 漏斗转化 · 部门对比，适合管理层快速浏览。',
    webUrl: 'http://124.222.177.43/r/demo003',
    likes: 89,
    comments: 15,
    reposts: 22,
  },
]

export const PLAZA_TRENDS = [
  { tag: '#审批流', count: '128 个公开应用' },
  { tag: '#制造业', count: '42 个场景包' },
  { tag: '@HR', count: '本周 +18 发布' },
]
