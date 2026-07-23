import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  GtgtStepComposer,
  registerWidget,
  resolveFormFieldDefs,
  useRuntime,
  type GtgtStep,
  type SchemaNode,
} from '@blockhub/web-core'
import {
  InteractiveToolPad,
  interactiveSchemaFromIntent,
  parseInteractiveSchema,
} from './interactive-tool-pad'

type Block = { type?: string; text?: string; items?: string[] }

type PageMock = {
  form_title?: string
  fields?: Array<{ key?: string; label?: string; type?: string; value?: string; placeholder?: string }>
  list_title?: string
  list?: Array<{ id?: string; title?: string; status?: string }>
  primary_action?: string
  chat_title?: string
  chat?: Array<{ role?: string; text?: string }>
  kpis?: Array<{ label?: string; value?: string; hint?: string }>
  ui_kind?: string
  interactive?: unknown
}

/** 旧版贪吃蛇（仅键盘 + alert）→ 触屏方向键、无弹窗的可玩版。打开即升级，无需再对话改页。 */
function snakePlayableHtml(title: string): string {
  const t = (title || '贪吃蛇').replace(/[<>]/g, '').slice(0, 40) || '贪吃蛇'
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${t}</title>
<style>
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 12px 16px}
h2{margin:0;font-size:16px;font-weight:700}
.meta{margin:0;font-size:12px;opacity:.8}
canvas{background:#020617;border:2px solid #334155;border-radius:10px;image-rendering:pixelated;touch-action:none;display:block}
button{border:0;border-radius:8px;padding:8px 12px;background:#0d9488;color:#fff;cursor:pointer;font-size:13px;min-width:40px;min-height:40px}
.pad{display:grid;grid-template-columns:40px 40px 40px;gap:5px;justify-items:center}
.pad .u{grid-column:2}.pad .l{grid-column:1;grid-row:2}.pad .d{grid-column:2;grid-row:2}.pad .r{grid-column:3;grid-row:2}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:center;font-size:13px}
#msg{min-height:16px;font-size:12px;color:#fbbf24;margin:0}
</style></head><body>
<h2>${t}</h2>
<p class="meta">方向键 / WASD / 下方按钮 · 得分 <b id="sc">0</b></p>
<canvas id="c" width="280" height="280" tabindex="0"></canvas>
<p id="msg"></p>
<div class="row"><button type="button" id="go">再来一局</button></div>
<div class="pad" aria-label="方向">
<button type="button" class="u" data-d="u">↑</button>
<button type="button" class="l" data-d="l">←</button>
<button type="button" class="d" data-d="d">↓</button>
<button type="button" class="r" data-d="r">→</button>
</div>
<script>
(function(){
const N=14,S=20,C=document.getElementById('c'),X=C.getContext('2d'),MSG=document.getElementById('msg');
let snake,dir,food,score,alive,timer,pending=null;
function rnd(){return Math.floor(Math.random()*N)}
function place(){let p;do{p={x:rnd(),y:rnd()}}while(snake.some(s=>s.x===p.x&&s.y===p.y));return p}
function setDir(nx,ny){if(!alive)return;if(nx===-dir.x&&ny===-dir.y)return;pending={x:nx,y:ny}}
function reset(){snake=[{x:7,y:7}];dir={x:1,y:0};pending=null;food=place();score=0;alive=true;MSG.textContent='';
document.getElementById('sc').textContent=score;clearInterval(timer);timer=setInterval(tick,140);draw();try{C.focus()}catch(e){}}
function tick(){if(!alive)return;if(pending){dir=pending;pending=null}
const h={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
if(h.x<0||h.y<0||h.x>=N||h.y>=N||snake.some(s=>s.x===h.x&&s.y===h.y)){alive=false;MSG.textContent='撞到了 · 点「再来一局」';draw();return}
snake.unshift(h);if(h.x===food.x&&h.y===food.y){score++;document.getElementById('sc').textContent=score;food=place()}else snake.pop();draw()}
function draw(){X.clearRect(0,0,280,280);X.fillStyle='#f59e0b';X.fillRect(food.x*S,food.y*S,S-1,S-1);
snake.forEach((s,i)=>{X.fillStyle=i?'#34d399':'#6ee7b7';X.fillRect(s.x*S,s.y*S,S-1,S-1)});
if(!alive){X.fillStyle='rgba(15,23,42,.55)';X.fillRect(0,0,280,280);X.fillStyle='#f87171';X.font='bold 20px sans-serif';X.fillText('Game Over',90,145)}}
window.addEventListener('keydown',e=>{
const k=e.key;let handled=true;
if(['ArrowUp','w','W'].includes(k))setDir(0,-1);
else if(['ArrowDown','s','S'].includes(k))setDir(0,1);
else if(['ArrowLeft','a','A'].includes(k))setDir(-1,0);
else if(['ArrowRight','d','D'].includes(k))setDir(1,0);
else handled=false;
if(handled)e.preventDefault();
});
document.querySelectorAll('.pad button').forEach(b=>b.addEventListener('click',()=>{
const d=b.getAttribute('data-d');
if(d==='u')setDir(0,-1);if(d==='d')setDir(0,1);if(d==='l')setDir(-1,0);if(d==='r')setDir(1,0);
}));
document.getElementById('go').onclick=reset;C.addEventListener('click',()=>{try{C.focus()}catch(e){}});reset();
})();
</script></body></html>`
}

function mobaPlayableHtml(title: string): string {
  const t = (title || '对战模拟').replace(/[<>]/g, '').slice(0, 40) || '对战模拟'
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${t}</title>
<style>
body{margin:0;font-family:system-ui,sans-serif;background:linear-gradient(160deg,#0f172a,#1e3a5f);color:#e2e8f0;min-height:100vh;padding:16px}
h2{margin:0 0 8px;font-size:18px}.hint{font-size:12px;opacity:.8;margin:0 0 12px}
.heroes{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.hero{flex:1;min-width:90px;border:1px solid #334155;border-radius:10px;padding:10px;background:#0b1220;cursor:pointer;text-align:center}
.hero.on{outline:2px solid #38bdf8;background:#132337}
.bar{height:10px;background:#334155;border-radius:6px;overflow:hidden;margin:6px 0}
.fill{height:100%;background:#22c55e;width:100%;transition:width .25s}.fill.enemy{background:#f43f5e}
.row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
button{border:0;border-radius:8px;padding:10px 14px;background:#0ea5e9;color:#fff;cursor:pointer;font-size:14px}
button:disabled{opacity:.5;cursor:not-allowed}
#log{margin-top:12px;font-size:13px;line-height:1.5;min-height:48px;white-space:pre-wrap}
.panel{background:rgba(2,6,23,.55);border:1px solid #334155;border-radius:12px;padding:14px;max-width:480px}
</style></head><body>
<div class="panel">
<h2>${t}</h2>
<p class="hint">精简演示 · 选英雄 → 开战 → 技能（非完整客户端）</p>
<div class="heroes" id="heroes"></div>
<p>我方 <b id="meName">—</b></p><div class="bar"><div class="fill" id="meHp"></div></div>
<p>敌方 <b>暗影刺客</b></p><div class="bar"><div class="fill enemy" id="enHp"></div></div>
<div class="row">
<button type="button" id="fight" disabled>开始对战</button>
<button type="button" id="skill" disabled>释放技能</button>
<button type="button" id="again">再来</button>
</div>
<div id="log">请选择一名英雄</div>
</div>
<script>
(function(){
const H=[{n:'烈焰法师',hp:100,atk:18,sk:'火球'},{n:'圣盾战士',hp:130,atk:12,sk:'冲锋'},{n:'疾风射手',hp:90,atk:22,sk:'连射'}];
let me=null,meHp=0,enHp=120,busy=false;
const heroes=document.getElementById('heroes'),log=document.getElementById('log');
const meHpEl=document.getElementById('meHp'),enHpEl=document.getElementById('enHp');
const fight=document.getElementById('fight'),skill=document.getElementById('skill');
function paint(){meHpEl.style.width=Math.max(0,meHp)/(me?me.hp:100)*100+'%';enHpEl.style.width=Math.max(0,enHp)/120*100+'%';document.getElementById('meName').textContent=me?me.n:'—'}
function say(t){log.textContent=t}
H.forEach(h=>{const b=document.createElement('button');b.type='button';b.className='hero';b.textContent=h.n;b.onclick=()=>{if(busy)return;me=h;meHp=h.hp;enHp=120;busy=false;[...heroes.children].forEach(c=>c.classList.remove('on'));b.classList.add('on');fight.disabled=false;skill.disabled=true;say('已选择 '+h.n+'，点击开始对战');paint()};heroes.appendChild(b)});
function enemyTurn(){if(enHp<=0||meHp<=0)return;const d=8+Math.floor(Math.random()*10);meHp=Math.max(0,meHp-d);say(log.textContent+'\\n敌方反击 -'+d);paint();if(meHp<=0){say('惜败 · 点「再来」');fight.disabled=true;skill.disabled=true;busy=false}else{skill.disabled=false;busy=false}}
fight.onclick=()=>{if(!me||busy)return;busy=true;fight.disabled=true;skill.disabled=false;say('对战开始！');paint()};
skill.onclick=()=>{if(!me||busy||meHp<=0)return;busy=true;skill.disabled=true;const d=me.atk+Math.floor(Math.random()*8);enHp=Math.max(0,enHp-d);say(me.n+' 释放【'+me.sk+'】 -'+d);paint();if(enHp<=0){say('胜利！');fight.disabled=true;skill.disabled=true;busy=false}else setTimeout(enemyTurn,450)};
document.getElementById('again').onclick=()=>{me=null;meHp=0;enHp=120;busy=false;fight.disabled=true;skill.disabled=true;[...heroes.children].forEach(c=>c.classList.remove('on'));say('请选择一名英雄');paint()};
paint();
})();
</script></body></html>`
}

function workspacePreviewHtml(title: string): string {
  const t = (title || '自定义页面').replace(/</g, '').slice(0, 40)
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${t}</title>
<style>
body{margin:0;font-family:system-ui,sans-serif;background:linear-gradient(165deg,#f8fafc,#eef2ff);color:#0f172a;min-height:100vh;padding:20px}
.card{max-width:480px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:18px}
h2{margin:0 0 6px;font-size:20px}.hint{margin:0 0 14px;color:#64748b;font-size:13px;line-height:1.5}
label{display:block;font-size:12px;color:#475569;margin:10px 0 4px}
input,textarea,select{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px;font:14px system-ui}
textarea{min-height:72px}.row{display:flex;gap:8px;margin-top:14px}
button{border:0;border-radius:8px;padding:10px 14px;background:#0f766e;color:#fff;cursor:pointer}
button.ghost{background:#e2e8f0;color:#0f172a}#out{margin-top:12px;font-size:13px;color:#0f766e;white-space:pre-wrap}
.badge{display:inline-block;font-size:11px;padding:2px 8px;border-radius:999px;background:#ccfbf1;color:#0f766e;margin-bottom:8px}
</style></head><body>
<div class="card"><span class="badge">预览工作台</span><h2>${t}</h2>
<p class="hint">这不是无意义的点击计数器。可填写场景说明，继续对话打磨或接真 API。</p>
<label>场景名称</label><input id="name" value="${t}" />
<label>说明</label><textarea id="note" placeholder="联调目标 / 验收标准"></textarea>
<div class="row"><button type="button" id="save">保存预览</button><button type="button" class="ghost" id="clear">清空</button></div>
<div id="out"></div></div>
<script>(function(){const out=document.getElementById('out');document.getElementById('save').onclick=()=>{out.textContent='已保存预览 · '+new Date().toLocaleString()};document.getElementById('clear').onclick=()=>{document.getElementById('note').value='';out.textContent=''}})();</script></body></html>`
}

function stockApiDemoHtml(title: string): string {
  const t = (title || '股票 API 测试').replace(/</g, '').slice(0, 40)
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${t}</title>
<style>
body{margin:0;font-family:system-ui,sans-serif;background:linear-gradient(160deg,#0b1220,#0f172a);color:#e2e8f0;min-height:100vh;padding:18px}
.card{max-width:520px;margin:0 auto;background:rgba(15,23,42,.92);border:1px solid #334155;border-radius:14px;padding:16px}
h2{margin:0 0 6px;font-size:18px}.hint{margin:0 0 12px;font-size:12px;color:#94a3b8}
.row{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}
input,select{flex:1;min-width:120px;border:1px solid #475569;border-radius:8px;padding:10px;background:#0b1220;color:#e2e8f0}
button{border:0;border-radius:8px;padding:10px 14px;background:#0ea5e9;color:#fff;cursor:pointer}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.kpi{background:#111827;border:1px solid #334155;border-radius:10px;padding:10px}.kpi b{display:block;font-size:20px;margin-top:4px}
.up{color:#4ade80}.down{color:#f87171}#log{margin-top:12px;font-size:12px;color:#94a3b8;white-space:pre-wrap}
.badge{font-size:11px;color:#67e8f9}
</style></head><body>
<div class="card"><p class="badge">演示面板 · 本地模拟行情</p><h2>${t}</h2>
<p class="hint">输入代码查询模拟报价。可继续对话接入真 API。</p>
<div class="row"><input id="sym" value="600519" /><select id="mkt"><option>SH</option><option>SZ</option><option>US</option></select><button type="button" id="go">查询</button></div>
<div class="grid"><div class="kpi">最新价<b id="px">—</b></div><div class="kpi">涨跌幅<b id="chg">—</b></div><div class="kpi">成交额<b id="amt">—</b></div><div class="kpi">更新<b id="ts" style="font-size:14px">—</b></div></div>
<div id="log">等待查询…</div></div>
<script>(function(){const seed={'600519':{n:'贵州茅台',p:1688.5},'000001':{n:'平安银行',p:11.2},'AAPL':{n:'Apple',p:198.4}};
document.getElementById('go').onclick=()=>{const sym=(document.getElementById('sym').value||'600519').trim().toUpperCase();
const meta=seed[sym]||{n:sym,p:20+Math.random()*80};const px=meta.p*(1+(Math.random()-0.45)*0.02);const chg=(px-meta.p)/meta.p*100;
document.getElementById('px').textContent=px.toFixed(2);const el=document.getElementById('chg');el.textContent=(chg>=0?'+':'')+chg.toFixed(2)+'%';el.className=chg>=0?'up':'down';
document.getElementById('amt').textContent=(Math.random()*8+0.5).toFixed(2)+' 亿';document.getElementById('ts').textContent=new Date().toLocaleTimeString();
document.getElementById('log').textContent='模拟响应 OK · '+sym+' '+meta.n};})();</script></body></html>`
}

function isLegacyMeaninglessCounter(html: string): boolean {
  const raw = html || ''
  return /点击互动/.test(raw) && /id=["']n["']/.test(raw) && /\+1/.test(raw) && /(let n=0|n\+\+)/.test(raw)
}

function instantPlayableFallback(title: string, summary: string): string {
  const blob = `${title} ${summary}`
  if (/贪吃蛇|snake/i.test(blob)) return snakePlayableHtml(title)
  if (/英雄联盟|lol|moba|对战|王者|英雄选择/i.test(blob)) return mobaPlayableHtml(title)
  if (/股票|行情|股价|stock/i.test(blob)) return stockApiDemoHtml(title)
  if (/api\s*测试|接口测试|联调|api test/i.test(blob)) return workspacePreviewHtml(title || 'API 测试')
  return workspacePreviewHtml(title || '互动演示')
}

/** 游戏/可玩/股票API：不等 codegen，立刻给有意义演示 */
function shouldInstantPlayable(title: string, summary: string, pageKind: string): boolean {
  const blob = `${title} ${summary} ${pageKind}`
  return /贪吃蛇|snake|英雄联盟|lol|moba|对战|王者|英雄选择|小游戏|可玩|游戏模拟|股票|行情|股价|api\s*测试|接口测试|联调/i.test(
    blob,
  )
}

function looksLikeSnakeGame(html: string, title: string): boolean {
  const blob = `${title}\n${html}`.toLowerCase()
  if (/贪吃蛇|snake/.test(blob)) return true
  // 无标题时：canvas + 蛇常见逻辑
  return /<canvas/i.test(html) && /snake\.unshift|snake\.some/i.test(html)
}

function isLegacyUnplayableSnake(html: string): boolean {
  const raw = html || ''
  if (!raw.trim()) return true
  const hasPad = /data-d\s*=\s*["']?[udlr]/i.test(raw) && /class\s*=\s*["'][^"']*\bpad\b/i.test(raw)
  const usesAlert = /\balert\s*\(/.test(raw)
  // 已有触屏方向且无 alert → 视为新版，保留用户定制
  if (hasPad && !usesAlert) return false
  return true
}

/** 渲染前升级旧智能出页，避免用户再口头触发修订 */
function upgradeLegacyPlayableHtml(html: string, title: string): string {
  const raw = (html || '').trim()
  if (!raw) return raw
  if (isLegacyMeaninglessCounter(raw)) {
    return instantPlayableFallback(title || '自定义页面', title || '')
  }
  if (looksLikeSnakeGame(raw, title) && isLegacyUnplayableSnake(raw)) {
    return snakePlayableHtml(title || '贪吃蛇')
  }
  return raw
}

/** 沙箱 iframe 无 allow-modals 时 alert 会被静默忽略；注入页内提示替代。 */
function wrapPlayableSrcDoc(html: string): string {
  const raw = (html || '').trim()
  if (!raw) return raw
  const shim = `<script data-bh-sandbox-shim="1">(function(){
  if(window.__bhShim)return;window.__bhShim=1;
  function toast(msg){
    var t=document.getElementById('__bh_toast');
    if(!t){
      t=document.createElement('div');t.id='__bh_toast';
      t.setAttribute('role','status');
      t.style.cssText='position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:2147483647;max-width:90%;padding:10px 14px;border-radius:10px;background:rgba(15,23,42,.92);color:#fff;font:13px/1.4 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.25);pointer-events:none';
      (document.body||document.documentElement).appendChild(t);
    }
    t.textContent=String(msg==null?'':msg);
    t.style.display='block';
    clearTimeout(t._bh);
    t._bh=setTimeout(function(){t.style.display='none'},2400);
  }
  window.alert=function(m){toast(m)};
  window.confirm=function(m){toast(m);return true};
  window.prompt=function(m,d){toast(m);return d==null?'':String(d)};
})();</script>`
  if (/<\/body>/i.test(raw)) return raw.replace(/<\/body>/i, `${shim}</body>`)
  return `${raw}${shim}`
}

function GeneratedCodeFrame({ title, html }: { title: string; html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [armed, setArmed] = useState(false)
  const [frameH, setFrameH] = useState(560)
  const playable = useMemo(() => upgradeLegacyPlayableHtml(html, title), [html, title])
  const upgraded = playable !== (html || '').trim()
  const srcDoc = useMemo(() => wrapPlayableSrcDoc(playable), [playable])
  const frameKey = useMemo(() => {
    let h = 0
    const s = srcDoc.slice(0, 8000)
    for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0
    return `gen-${s.length}-${h}`
  }, [srcDoc])

  useEffect(() => {
    setArmed(false)
    setFrameH(560)
  }, [frameKey])

  const measureFrame = useCallback(() => {
    try {
      const doc = iframeRef.current?.contentDocument
      const body = doc?.body
      const root = doc?.documentElement
      const h = Math.max(body?.scrollHeight || 0, root?.scrollHeight || 0, body?.offsetHeight || 0)
      if (h > 200) setFrameH(Math.min(Math.max(h + 12, 480), 920))
    } catch {
      /* ignore */
    }
  }, [])

  const focusPlay = () => {
    setArmed(true)
    try {
      iframeRef.current?.focus()
      iframeRef.current?.contentWindow?.focus()
    } catch {
      /* ignore cross-origin */
    }
    window.requestAnimationFrame(measureFrame)
  }

  return (
    <article className="generated-page generated-page--code" data-source="generated">
      {upgraded ? (
        <p className="muted" style={{ margin: '0 0 8px', fontSize: 12, color: '#0f766e' }}>
          已自动升级为可玩版（触屏方向键 · 无弹窗），无需再对话改页。
        </p>
      ) : null}
      <div style={{ position: 'relative', width: '100%' }}>
        <iframe
          key={frameKey}
          ref={iframeRef}
          title={title}
          srcDoc={srcDoc}
          tabIndex={0}
          sandbox="allow-scripts allow-modals"
          onLoad={() => {
            measureFrame()
            focusPlay()
          }}
          onFocus={() => setArmed(true)}
          style={{
            width: '100%',
            height: frameH,
            minHeight: 480,
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            background: '#fff',
            display: 'block',
          }}
        />
        {!armed ? (
          <button
            type="button"
            onClick={focusPlay}
            style={{
              position: 'absolute',
              inset: 0,
              border: 0,
              borderRadius: 12,
              background: 'rgba(15,23,42,.45)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            点击开始游玩 · 键盘/触屏方向可用
          </button>
        ) : null}
      </div>
    </article>
  )
}

type LocalRecord = {
  id: string
  title: string
  status: string
  detail: string
  at: string
}

type SeedRow = LocalRecord & { seed: true }

const STATUS_CYCLE = ['待处理', '进行中', '已完成'] as const

function storageKey(cap: string) {
  return `blockhub_gen_records:${cap}`
}

function loadRecords(cap: string): LocalRecord[] {
  try {
    const raw = localStorage.getItem(storageKey(cap))
    if (!raw) return []
    const parsed = JSON.parse(raw) as LocalRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveRecords(cap: string, rows: LocalRecord[]) {
  try {
    localStorage.setItem(storageKey(cap), JSON.stringify(rows.slice(0, 100)))
  } catch {
    /* ignore */
  }
}

/** compose page_mock → 静态块（说明区兜底） */
export function pageMockToBlocks(mock: PageMock | null | undefined): Block[] {
  if (!mock || typeof mock !== 'object') return []
  const blocks: Block[] = []
  if (mock.form_title) blocks.push({ type: 'heading', text: String(mock.form_title) })
  for (const f of mock.fields || []) {
    if (!f?.label) continue
    const tip = f.type ? `（${f.type}）` : ''
    blocks.push({ type: 'paragraph', text: `${f.label}${tip}${f.value ? `：${f.value}` : ''}` })
  }
  if (mock.list_title) blocks.push({ type: 'heading', text: String(mock.list_title) })
  if (mock.list?.length) {
    blocks.push({
      type: 'list',
      text: mock.list_title || '列表',
      items: mock.list.map((row) => {
        const t = row.title || row.id || '条目'
        return row.status ? `${t} · ${row.status}` : String(t)
      }),
    })
  }
  if (mock.chat_title) blocks.push({ type: 'heading', text: String(mock.chat_title) })
  for (const c of mock.chat || []) {
    if (c?.text) blocks.push({ type: 'paragraph', text: `${c.role === 'bot' ? '助手' : '用户'}：${c.text}` })
  }
  if (mock.kpis?.length) {
    blocks.push({
      type: 'list',
      text: '指标',
      items: mock.kpis.map((k) => `${k.label || '指标'}：${k.value || '—'}${k.hint ? `（${k.hint}）` : ''}`),
    })
  }
  return blocks
}

function LandingHeroWidget({ node }: { node: SchemaNode }) {
  const title = String(node.props?.title || '应用')
  const subtitle = String(node.props?.subtitle || '')
  return (
    <section className="landing-hero">
      <h2>{title}</h2>
      {subtitle ? <p>{subtitle}</p> : null}
    </section>
  )
}

function resolveInteractiveForNode(node: SchemaNode) {
  const props = node.props || {}
  const mock = props.page_mock as (PageMock & { interactive?: unknown }) | undefined
  const fromProp = parseInteractiveSchema(props.interactive)
  if (fromProp) return fromProp
  const fromMock = parseInteractiveSchema(mock?.interactive)
  if (fromMock) return fromMock
  const blob = [
    props.title,
    props.scene_label,
    props.summary,
    props.capability_key,
    props.interactive_ui,
    props.ui_kind,
    mock?.ui_kind,
    mock?.form_title,
    node.id,
    ...(Array.isArray(props.blocks)
      ? (props.blocks as Block[]).flatMap((b) => [b.text, ...(b.items || [])])
      : []),
  ]
    .filter(Boolean)
    .join(' ')
  return interactiveSchemaFromIntent(blob)
}

const GEN_STEPS = [
  { key: 'understand', label: '理解需求' },
  { key: 'codegen', label: '生成可运行页面' },
  { key: 'verify', label: '后台自检' },
  { key: 'ready', label: '即将可用' },
] as const

const GEN_TIPS = [
  '正在智能出页，把需求变成可交互页面…',
  '生成完成后会自动出现，无需刷新…',
  '若在改已有页面，会基于上一版源码修订…',
]

function GeneratingProgress({
  title,
  summary,
  accent,
  onTimeout,
}: {
  title: string
  summary: string
  accent: string
  /** 超过该秒数仍无成品时回调（只触发一次） */
  onTimeout?: () => void
}) {
  const [elapsed, setElapsed] = useState(0)
  const [tipIdx, setTipIdx] = useState(0)
  const timedOutRef = useRef(false)
  /** 用户侧硬上限：绝不能出现「生成中 · 321s」空骨架 */
  const MAX_WAIT = 20

  useEffect(() => {
    const t0 = Date.now()
    const tick = window.setInterval(() => {
      const sec = Math.floor((Date.now() - t0) / 1000)
      setElapsed(sec)
      if (sec >= MAX_WAIT && !timedOutRef.current) {
        timedOutRef.current = true
        onTimeout?.()
      }
    }, 1000)
    return () => window.clearInterval(tick)
  }, [onTimeout])

  useEffect(() => {
    const tip = window.setInterval(() => setTipIdx((i) => (i + 1) % GEN_TIPS.length), 4500)
    return () => window.clearInterval(tip)
  }, [])

  const stepIdx = elapsed < 4 ? 0 : elapsed < 10 ? 1 : elapsed < 16 ? 2 : 3
  const etaHint =
    elapsed < 8
      ? '预计约 10–20 秒'
      : elapsed < MAX_WAIT
        ? '比平时稍慢；即将换成可玩精简版'
        : '正在切换可玩精简版…'

  return (
    <article
      className="generated-page generated-page--skeleton generated-page--progress"
      data-source="generating"
      aria-busy="true"
      aria-label={`${title} 生成中`}
      style={{ ['--accent' as string]: accent }}
    >
      <header className="generated-skeleton-head">
        <p className="generated-badge">生成中 · {elapsed}s</p>
        <h2>{title}</h2>
        <p className="generated-summary">{summary || '正在为你生成可交互页面'}</p>
      </header>

      <ol className="generated-progress-steps" aria-label="生成进度">
        {GEN_STEPS.map((s, i) => (
          <li
            key={s.key}
            className={i < stepIdx ? 'is-done' : i === stepIdx ? 'is-active' : ''}
          >
            <span className="generated-progress-dot" aria-hidden />
            <span>{s.label}</span>
          </li>
        ))}
      </ol>

      <p className="generated-progress-eta">{etaHint}</p>
      <p className="generated-progress-tip muted">{GEN_TIPS[tipIdx]}</p>
      <p className="muted" style={{ margin: '8px 0 0', fontSize: 13 }}>
        仍在处理时可先去其他菜单；超时将自动打开精简可玩版，无需干等灰色占位块。
      </p>
    </article>
  )
}

/**
 * Path B：有 source_html 直接 iframe；tool_pad 可点；业务才用 Gtgt。
 * 生成中展示进度与预期，不把校验细节暴露给用户。
 */
function GeneratedPageWidget({ node }: { node: SchemaNode }) {
  const { primaryColor, user, schema } = useRuntime()
  const accent = primaryColor || '#4338ca'
  const meta = (schema?.meta || {}) as Record<string, unknown>
  const theme = (schema?.theme || {}) as { micrositeId?: string }
  const industrySite =
    String(meta.entry_source || '') === 'industry_site' ||
    Boolean(meta.microsite_id) ||
    Boolean(theme.micrositeId)
  const title = String(node.props?.title || node.props?.scene_label || node.id || '新页面')
  const summary = String(node.props?.summary || '')
  const capKey = String(node.props?.capability_key || node.id || 'gen_page')
  const pending = Boolean(node.props?.codegen_pending)
  const sourceHtml = String(node.props?.source_html || '').trim()
  const pageKind = String(
    node.props?.page_kind ||
      node.props?.ui_kind ||
      (node.props?.page_mock as PageMock | undefined)?.ui_kind ||
      '',
  )
  const startedAtRaw = String(node.props?.codegen_started_at || '').trim()
  const stalePending = useMemo(() => {
    if (!pending || sourceHtml) return false
    if (!startedAtRaw) return true // 无开始时间也视为可立即回退，避免永久骨架
    const t = Date.parse(startedAtRaw)
    if (Number.isNaN(t)) return true
    return Date.now() - t > 20_000
  }, [pending, sourceHtml, startedAtRaw])

  const instantGameHtml = useMemo(() => {
    if (sourceHtml) return ''
    if (!shouldInstantPlayable(title, summary, pageKind)) return ''
    return instantPlayableFallback(title, summary)
  }, [sourceHtml, title, summary, pageKind])

  const [forceLiteHtml, setForceLiteHtml] = useState(() =>
    instantGameHtml || (stalePending ? instantPlayableFallback(title, summary) : ''),
  )
  const onGenTimeout = useCallback(() => {
    setForceLiteHtml(instantPlayableFallback(title, summary))
  }, [title, summary])

  useEffect(() => {
    if (instantGameHtml) {
      setForceLiteHtml(instantGameHtml)
      return
    }
    if (stalePending) {
      setForceLiteHtml(instantPlayableFallback(title, summary))
      return
    }
    if (!pending) setForceLiteHtml('')
  }, [capKey, sourceHtml, pending, stalePending, title, summary, instantGameHtml])

  const mock = node.props?.page_mock as PageMock | undefined
  const rawBlocks = (Array.isArray(node.props?.blocks) ? node.props?.blocks : []) as Block[]
  const interactive = resolveInteractiveForNode(node)

  const fieldDefs = useMemo(() => {
    // 禁止「任意新页 → 标题+说明」硬兜底；仅有明确 form_fields / page_mock.fields 才出表单
    const hasCustom =
      (Array.isArray(node.props?.form_fields) && (node.props?.form_fields as unknown[]).length > 0) ||
      (Array.isArray(mock?.fields) && mock!.fields!.length > 0)
    if (!hasCustom) return []
    return resolveFormFieldDefs({
      defaults: undefined,
      formFields: node.props?.form_fields,
      pageMockFields: mock?.fields,
    })
  }, [node.props?.form_fields, mock?.fields, mock])

  const steps: GtgtStep[] = useMemo(
    () =>
      fieldDefs.map((f) => ({
        key: f.key,
        label: f.label,
        placeholder: f.placeholder || '',
        optional: f.optional,
        inputType: f.type || 'text',
      })),
    [fieldDefs],
  )

  const seedList = useMemo<SeedRow[]>(
    () =>
      (mock?.list || []).map((row, i) => ({
        id: String(row.id || `seed_${i}`),
        title: String(row.title || row.id || '条目'),
        status: String(row.status || '示例'),
        detail: '',
        at: '',
        seed: true as const,
      })),
    [mock?.list],
  )

  const [records, setRecords] = useState<LocalRecord[]>(() => loadRecords(capKey))
  const [values, setValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [resetKey, setResetKey] = useState(0)

  useEffect(() => {
    setRecords(loadRecords(capKey))
    setValues({})
    setMsg('')
    setResetKey((k) => k + 1)
  }, [capKey])

  if (forceLiteHtml) {
    return (
      <div>
        <p className="muted" style={{ margin: '0 0 8px', fontSize: 12, color: '#0f766e' }}>
          {pending
            ? '已打开精简可玩版（勿干等空骨架）。后台若生成更完整页，将自动升级。'
            : '精简可玩版（非完整客户端）。可继续对话打磨。'}
        </p>
        <GeneratedCodeFrame title={title} html={forceLiteHtml} />
      </div>
    )
  }

  if (pending) {
    return (
      <GeneratingProgress title={title} summary={summary} accent={accent} onTimeout={onGenTimeout} />
    )
  }

  if (sourceHtml) {
    return <GeneratedCodeFrame title={title} html={sourceHtml} />
  }

  if (pageKind === 'generated_code') {
    return (
      <GeneratingProgress title={title} summary={summary} accent={accent} onTimeout={onGenTimeout} />
    )
  }

  if (interactive) {
    return <InteractiveToolPad schema={interactive} title={title || '交互工具'} summary={summary} />
  }

  const displayList: Array<LocalRecord | SeedRow> = [
    ...records,
    ...seedList.filter((s) => !records.some((r) => r.title === s.title)),
  ]

  const hasFormFields = fieldDefs.length > 0
  // 有表单时不再渲染 page_mock 静态块，避免「模板说明 + 表单」双重堆砌
  const infoBlocks =
    hasFormFields
      ? []
      : (rawBlocks.length ? rawBlocks : pageMockToBlocks(mock)).filter((b) => b.type !== 'button')

  const submitLabel = String(mock?.primary_action || node.props?.primary_action || `提交${title}`).slice(0, 16)
  const formTitle = String(mock?.form_title || node.props?.form_headline || title)
  const listTitle = String(mock?.list_title || '记录')

  const handleSubmit = async () => {
    const primaryKey = fieldDefs[0]?.key || 'title'
    const primaryVal = (values[primaryKey] || values.title || '').trim()
    if (!primaryVal) {
      setMsg('请先填写必填项')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      await new Promise((r) => window.setTimeout(r, 280))
      const detail = fieldDefs
        .slice(1)
        .map((f) => {
          const v = (values[f.key] || '').trim()
          return v ? `${f.label}：${v}` : ''
        })
        .filter(Boolean)
        .join('；')
      const row: LocalRecord = {
        id: `r_${Date.now().toString(36)}`,
        title: primaryVal,
        status: '待处理',
        detail,
        at: new Date().toLocaleString(),
      }
      setRecords((prev) => {
        const next = [row, ...prev]
        saveRecords(capKey, next)
        return next
      })
      setValues({})
      setResetKey((k) => k + 1)
      setMsg(pending ? '已写入本机预览记录（能力接口仍在生成）' : '已提交，记录已加入下方列表')
    } finally {
      setBusy(false)
    }
  }

  const cycleStatus = (id: string) => {
    setRecords((prev) => {
      const next = prev.map((r) => {
        if (r.id !== id) return r
        const idx = STATUS_CYCLE.indexOf(r.status as (typeof STATUS_CYCLE)[number])
        const status = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length] || '待处理'
        return { ...r, status }
      })
      saveRecords(capKey, next)
      return next
    })
  }

  const removeRecord = (id: string) => {
    setRecords((prev) => {
      const next = prev.filter((r) => r.id !== id)
      saveRecords(capKey, next)
      return next
    })
  }

  return (
    <article
      className={`generated-page${industrySite ? ' generated-page--industry' : ''}`}
      data-source="generated"
      data-entry={industrySite ? 'industry_site' : 'workbench'}
    >
      <header>
        {!industrySite ? (
          <p className="generated-badge">{pending ? '预览录入 · 接口生成中' : '预览页 · 可交互'}</p>
        ) : null}
        <h2>{title}</h2>
        {summary ? <p className="generated-summary">{summary}</p> : null}
        {hasFormFields ? (
          <p className="muted" style={{ margin: '0 0 8px', fontSize: 13 }}>
            下方表单逐项填写（Enter 推进），点「{submitLabel}」写入本机记录；列表状态可点击切换。
            {user?.display_name ? ` · ${user.display_name}` : ''}
          </p>
        ) : (
          <p className="muted" style={{ margin: '0 0 8px', fontSize: 13 }}>
            可继续对话细化字段或玩法；未指定表单时不套用「标题/说明」通用壳。
            {user?.display_name ? ` · ${user.display_name}` : ''}
          </p>
        )}
      </header>

      {infoBlocks.length ? (
        <div className="generated-blocks generated-blocks-info">
          {infoBlocks.map((b, i) => {
            const t = b.type || 'paragraph'
            if (t === 'heading') return <h3 key={i}>{b.text}</h3>
            if (t === 'list') {
              return (
                <div key={i}>
                  {b.text ? <p className="muted">{b.text}</p> : null}
                  <ul>
                    {(b.items || []).map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                </div>
              )
            }
            return <p key={i}>{b.text}</p>
          })}
        </div>
      ) : null}

      {hasFormFields ? (
        <>
          <div className="generated-page-form">
            <GtgtStepComposer
              title={formTitle}
              meta={industrySite ? '业务录入' : '预览录入'}
              accent={accent}
              flowHint=">> 单字段 Enter 推进 · 提交后写入本机列表（非正式业务库）"
              steps={steps}
              values={values}
              onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
              onComplete={handleSubmit}
              busy={busy}
              resetKey={resetKey}
              submitLabel={busy ? '提交中…' : submitLabel}
            >
              {msg ? <p className="status-msg">{msg}</p> : null}
            </GtgtStepComposer>
          </div>

          <section className="generated-page-list" aria-label={listTitle}>
            <div className="generated-page-list-head">
              <h3 style={{ margin: 0 }}>{listTitle}</h3>
              <span className="muted" style={{ fontSize: 12 }}>
                {records.length} 条本机 · 点击状态可切换
              </span>
            </div>
            {displayList.length === 0 ? (
              <p className="muted">暂无记录，提交表单后出现在这里</p>
            ) : (
              <ul className="generated-page-list-ul">
                {displayList.map((row) => {
                  const isSeed = 'seed' in row && row.seed
                  return (
                    <li key={row.id} className="generated-page-list-item">
                      <div>
                        <strong>{row.title}</strong>
                        {row.detail ? (
                          <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                            {row.detail}
                          </p>
                        ) : null}
                        {row.at ? (
                          <p className="muted" style={{ margin: '2px 0 0', fontSize: 11 }}>
                            {row.at}
                          </p>
                        ) : null}
                      </div>
                      <div className="generated-page-list-actions">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={Boolean(isSeed)}
                          title={isSeed ? '示例数据' : '切换状态'}
                          onClick={() => {
                            if (!isSeed) cycleStatus(row.id)
                          }}
                        >
                          {row.status}
                        </button>
                        {!isSeed ? (
                          <button type="button" className="btn btn-ghost" onClick={() => removeRecord(row.id)}>
                            删除
                          </button>
                        ) : (
                          <span className="muted" style={{ fontSize: 11 }}>
                            示例
                          </span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </article>
  )
}

/** 运行时内置壳组件（不依赖能力包目录） */
export function registerBuiltinWidgets(): void {
  registerWidget('LandingHeroWidget', LandingHeroWidget)
  registerWidget('GeneratedPageWidget', GeneratedPageWidget)
}
