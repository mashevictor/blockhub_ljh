const CASES = [
  {
    name: '连锁零售 · 智慧办公',
    desc: '请假审批、制度问答、门店报表与通知一体化',
    result: '5 分钟上线，覆盖 96 项办公场景',
  },
  {
    name: '中型制造企业',
    desc: '设备报修、SOP 问答、质检审批与生产看板',
    result: '一次发布五端，审批与问答联动',
  },
  {
    name: '物流与货代企业',
    desc: '运单跟踪、客服问答、报价审批全流程值守',
    result: '7×24 在线服务，人力成本显著降低',
  },
]

export default function B2BCaseSection() {
  return (
    <section id="case" className="b2b-section b2b-case-wrap">
      <div className="b2b-section-title">
        <span className="b2b-eyebrow">落地案例</span>
        <h2>客户实践</h2>
        <p>零售、制造、物流、医疗等行业规模化落地</p>
      </div>
      <div className="b2b-case-grid">
        {CASES.map((c) => (
          <article key={c.name} className="b2b-case-item">
            <div className="b2b-case-name">{c.name}</div>
            <p>{c.desc}</p>
            <div className="b2b-case-result">{c.result}</div>
          </article>
        ))}
      </div>
    </section>
  )
}
