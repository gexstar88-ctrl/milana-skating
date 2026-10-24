/* Аналитика только по проверенным протоколам. Никаких внешних библиотек или запросов. */
window.SportAnalytics=(()=>{
const esc=v=>String(v??'нет данных').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf=new Intl.NumberFormat('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2});
const f=v=>Number.isFinite(v)?nf.format(v):'—',delta=v=>Number.isFinite(v)?(v>0?'+':'')+f(v):'нет сравнения';
const cat=e=>e.category.split(',')[0].trim(),prog=e=>(e.segment||'нет программы').replace(/^Произвольная$/,'Произвольная программа');
const verified=e=>!!(e.source_verified&&e.elements?.length&&Number.isFinite(e.tss));
const season=date=>{const y=Number(date.slice(0,4))-(Number(date.slice(5,7))<7?1:0);return y+'/'+String(y+1).slice(2)};
const avg=(rows,key)=>rows.length?rows.reduce((a,e)=>a+e[key],0)/rows.length:null;
const state={context:null,sort:'date',direction:-1,search:''};
const charts=new Map();
function destroy(key){if(charts.has(key)){charts.get(key).destroy();charts.delete(key)}}
function dispose(){for(const key of [...charts.keys()])destroy(key)}
const motion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?false:{duration:260};
function radarCanvas(node,rows,key){
destroy(key);const e=rows.at(-1);if(!e||e.components.length<3)return;
const previous=rows.at(-2),wrap=document.createElement('div');wrap.className='chart-wrap radar-canvas-wrap';wrap.innerHTML='<canvas role="img" aria-label="Компоненты последнего и предыдущего сопоставимых стартов; точные значения указаны под графиком"></canvas>';
node.querySelector('svg')?.replaceWith(wrap);
const datasets=[previous,e].filter(Boolean).map((r,i,ar)=>({label:r.date,data:r.components.map(c=>c.mean),borderColor:r===e?'#8ecae4':'#a9b4c6',backgroundColor:r===e?'#8ecae42b':'#a9b4c620',borderWidth:2,pointRadius:4,pointHoverRadius:7,pointHitRadius:18,pointHoverBackgroundColor:'#bdf9e8'}));
charts.set(key,new Chart(wrap.querySelector('canvas'),{type:'radar',data:{labels:e.components.map(c=>c.component==='Мастерство катания'?'Катание':c.component),datasets},options:{responsive:true,maintainAspectRatio:false,animation:motion(),plugins:{legend:{display:false},tooltip:{backgroundColor:'#0c1827',titleColor:'#e6f1f8',bodyColor:'#b3eee0',callbacks:{label:c=>c.dataset.label+': '+f(c.raw)}}},scales:{r:{min:0,max:10,ticks:{display:false,stepSize:2},grid:{color:'#3a5065'},angleLines:{color:'#3a5065'},pointLabels:{display:key!=='hero'||innerWidth>640,color:'#bbcfde',font:{size:10}}}}}}));
}
const comparisonKey=e=>JSON.stringify([cat(e),prog(e),e.components.map(c=>[c.component,c.multiplier])]);
const keyLabel=k=>{const [c,p,cs]=JSON.parse(k);return c+' · '+p+' · '+cs.length+' комп. × '+[...new Set(cs.map(x=>f(x[1])))].join('/')};
const comparable=(a,b)=>comparisonKey(a)===comparisonKey(b);
function elementStatus(el){
const flags=[...new Set((el.code.match(/<<|<|q|!|e(?=\+|$)/g)||[]))];
const fall=el.fall===true||el.fall_marker==='F';
if(fall)return {label:'Падение подтверждено',tone:'negative',flags};
if(el.element_score===0)return {label:'Не зачтён',tone:'negative',flags};
if(flags.length)return {label:'Технические метки: '+flags.join(' '),tone:'warning',flags};
if(el.goe_value<0)return {label:'Снижение за качество',tone:'warning',flags};
return {label:'Без этих меток · GOE ≥ 0',tone:'neutral',flags};
}
function badge(el){const s=elementStatus(el);return `<span class="element-status ${s.tone}">${esc(s.label)}</span>`}
const explanations={'q':'Приземление в четверть оборота.','<':'Недокрученный прыжок. Это не то же обозначение, что q.','<<':'Прыжок с понижением числа оборотов.','e':'Неправильное ребро отталкивания.','!':'Неясное ребро отталкивания.','V':'Сниженная базовая стоимость вращения.','B':'Базовый уровень вращения.','SEQ':'Серия прыжков.'};
function notation(el){const code=el.code.split(/(<<|<|q|!|e(?=\+|$))/g).filter(Boolean).map(s=>explanations[s]?`<span class="notation-warning">${esc(s)}</span>`:esc(s)).join('');return `<button type="button" class="notation-button" data-notation-code="${esc(el.code)}" data-notation-name="${esc(el.plain_russian)}" data-notation-mark="${esc(el.technical_mark||'')}" title="${esc(el.plain_russian)}; нажмите для пояснений">${code} <span aria-hidden="true">ⓘ</span></button>`}
function bindSheet(dlg,handle){
if(!handle||handle.dataset.swipeBound)return;handle.dataset.swipeBound='1';let start=null,dy=0;
handle.addEventListener('pointerdown',ev=>{if(ev.target.closest('button')||innerWidth>640)return;start=ev.clientY;dy=0;handle.setPointerCapture(ev.pointerId)});
handle.addEventListener('pointermove',ev=>{if(start===null)return;dy=Math.max(0,ev.clientY-start);dlg.style.transform=`translateY(${Math.min(dy,300)}px)`});
const end=()=>{if(start===null)return;start=null;dlg.style.transform='';if(dy>80)dlg.close();dy=0};handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',()=>{start=null;dlg.style.transform=''});
}
function bindNotations(root){
root.querySelectorAll('[data-notation-code]').forEach(button=>button.onclick=()=>{
let dlg=document.querySelector('#notation-dialog');if(!dlg){dlg=document.createElement('dialog');dlg.id='notation-dialog';dlg.setAttribute('aria-label','Расшифровка элемента');document.body.append(dlg)}
const code=button.dataset.notationCode,flags=[...new Set(code.match(/<<|<|q|!|e(?=\+|$)/g)||[])];if(/Sp.*V/.test(code))flags.push('V');if(/SpB/.test(code))flags.push('B');if(code.includes('SEQ'))flags.push('SEQ');
dlg.innerHTML=`<div class="notation-head"><strong>Пояснение элемента</strong><button type="button" aria-label="Закрыть пояснение">Закрыть ×</button></div><div class="notation-body"><h2>${esc(code)}</h2><p>${esc(button.dataset.notationName)}</p>${flags.length?flags.map(s=>`<p><b class="notation-warning">${esc(s)}</b> — ${esc(explanations[s])}</p>`).join(''):'<p>В этом коде нет меток q, &lt;, e и !. Само по себе это не доказывает чистого исполнения.</p>'}${button.dataset.notationMark?`<p>Метки первоисточника: ${esc(button.dataset.notationMark)}</p>`:''}<p class="muted">GOE — качество исполнения, балльная прибавка или снижение к базе. Судейские отметки J1–J3 хранятся отдельно. По знаку x или величине GOE падение не устанавливается.</p></div>`;
dlg.querySelector('button').onclick=()=>dlg.close();dlg.onclose=()=>{document.body.classList.remove('notation-modal-open');button.focus()};bindSheet(dlg,dlg.querySelector('.notation-head'));dlg.showModal();document.body.classList.add('notation-modal-open');
});
}
function context(all,visible){
const confirmed=visible.filter(verified),keys=[...new Set(confirmed.map(comparisonKey))];
if(!keys.includes(state.context))state.context=keys.at(-1)||null;
const rows=confirmed.filter(e=>comparisonKey(e)===state.context).sort((a,b)=>a.date.localeCompare(b.date));
const baseline=all.filter(e=>verified(e)&&comparisonKey(e)===state.context);
return {keys,rows,baseline,meanTES:avg(rows,'tes'),meanPCS:avg(rows,'pcs'),best:rows.length?Math.max(...rows.map(e=>e.tss)):null};
}
function attempts(e){
const totals={single:0,double:0,triple:0,spin:0,other:0};
e.elements.forEach(el=>{const jumps=[...el.code.matchAll(/(?:^|\+)([1-4])(?:Lz|Lo|A|F|S|T|W)/g)];if(jumps.length){jumps.forEach(j=>totals[j[1]==='1'?'single':j[1]==='2'?'double':'triple']++);}else if(/Sp/.test(el.code)&&!/^ChSp/.test(el.code))totals.spin++;else totals.other++});return totals;
}
const colors={single:'#79b9e6',double:'#8ecae4',triple:'#f3af65',spin:'#b499e6',other:'#607289'};
const names={single:'Одинарные и перекидной',double:'Двойные',triple:'Тройные и выше',spin:'Вращения',other:'Другие элементы'};
function line(rows,w){
w=Math.max(250,w);const h=250,L=36,R=20,T=25,B=48,max=Math.ceil(Math.max(...rows.flatMap(e=>[e.tes,e.pcs]),1)*1.15),x=i=>rows.length===1?w/2:L+i*(w-L-R)/(rows.length-1),y=v=>h-B-v/max*(h-T-B);
if(!rows.length)return '<p class="analytics-empty">В этом срезе нет подробных оценок. Линии не достраиваются.</p>';
let s=`<svg viewBox="0 0 ${w} ${h}" class="analytics-svg" role="img" aria-label="Техника и компоненты; ${rows.length} стартов"><title>Техника и компоненты в одной сопоставимой программе</title>`;
for(let i=0;i<=4;i++){let v=max*i/4;s+=`<line class="plot-grid" x1="${L}" x2="${w-R}" y1="${y(v)}" y2="${y(v)}"/><text class="axis-label" x="${L-8}" y="${y(v)+4}" text-anchor="end">${Number(v.toFixed(1)).toLocaleString('ru-RU')}</text>`}
for(const [key,color] of [['tes','#8ecae4'],['pcs','#d8ae88']]){
if(rows.length>1)s+=`<polyline points="${rows.map((e,i)=>x(i)+','+y(e[key])).join(' ')}" fill="none" stroke="${color}" stroke-width="3"/>`;
rows.forEach((e,i)=>{s+=`<g tabindex="0" role="button" data-analytics-point="${esc(e.id)}" aria-label="${esc(e.title)}: ${key==='tes'?'техника':'компоненты'} ${f(e[key])}"><circle cx="${x(i)}" cy="${y(e[key])}" r="22" fill="transparent"/><circle cx="${x(i)}" cy="${y(e[key])}" r="5" fill="${color}" stroke="#14202f" stroke-width="2"/></g>`})
}
rows.forEach((e,i)=>{s+=`<text class="axis-label" x="${x(i)}" y="${h-24}" text-anchor="${i===0&&rows.length>1?'start':i===rows.length-1&&rows.length>1?'end':'middle'}">${e.date.slice(8)}.${e.date.slice(5,7)}</text><text class="axis-label" x="${x(i)}" y="${h-8}" text-anchor="middle">${e.date.slice(0,4)}</text>`});return s+'</svg>';
}
function stacked(rows,w){
const map=new Map();rows.filter(verified).forEach(e=>{const k=season(e.date);if(!map.has(k))map.set(k,{events:0,single:0,double:0,triple:0,spin:0,other:0});let a=map.get(k);a.events++;const t=attempts(e);Object.keys(t).forEach(k=>a[k]+=t[k])});
if(!map.size)return '<p class="analytics-empty">Нет судейских протоколов для подсчёта попыток.</p>';
w=Math.max(250,w);const list=[...map].sort(),h=245,L=30,R=10,T=24,B=44,ph=h-T-B,max=Math.max(...list.map(([,t])=>Object.keys(colors).reduce((s,k)=>s+t[k],0))),slot=(w-L-R)/list.length,bw=Math.min(70,slot*.55);
let s=`<svg viewBox="0 0 ${w} ${h}" class="analytics-svg" role="img" aria-label="Состав подтверждённых программ по учётным сезонам">`;
for(let i=0;i<=3;i++){let v=Math.ceil(max*i/3),py=h-B-v/max*ph;s+=`<line class="plot-grid" x1="${L}" x2="${w-R}" y1="${py}" y2="${py}"/><text class="axis-label" x="${L-7}" y="${py+4}" text-anchor="end">${v}</text>`}
list.forEach(([sname,t],i)=>{let y=h-B,px=L+slot*(i+.5)-bw/2;Object.keys(colors).forEach(k=>{let bh=t[k]/max*ph;y-=bh;if(t[k])s+=`<rect x="${px}" y="${y}" width="${bw}" height="${bh}" fill="${colors[k]}"><title>${sname}: ${names[k]} — ${t[k]}</title></rect>`});s+=`<text class="axis-label" x="${px+bw/2}" y="${h-22}" text-anchor="middle">${sname}</text><text class="axis-label" x="${px+bw/2}" y="${h-6}" text-anchor="middle">${t.events} прот.</text>`});return s+'</svg>';
}
function radar(rows,w){
const last=rows.at(-1);if(!last)return '<p class="analytics-empty">Нет подтверждённых компонентов.</p>';
const labels=last.components.map(c=>c.component),prev=rows.slice(0,-1).reverse().find(e=>e.components.map(c=>c.component).join('|')===labels.join('|'));
if(labels.length<3)return '<p class="analytics-empty">В этой категории два компонента. Для них используется список, чтобы не строить вырожденную «паутинку».</p>'+labels.map((l,i)=>`<div class="component-pair"><span>${esc(l)}</span><b>${f(last.components[i].mean)}</b></div>`).join('');
w=Math.max(250,w);const h=270,cx=w/2,cy=132,r=Math.min(83,w*.26),pt=(i,v)=>[cx+Math.sin(i*2*Math.PI/labels.length)*r*v/10,cy-Math.cos(i*2*Math.PI/labels.length)*r*v/10];
const polygon=v=>labels.map((_,i)=>pt(i,v).join(',')).join(' ');
let s=`<svg viewBox="0 0 ${w} ${h}" class="analytics-svg" role="img" aria-label="Профиль компонентов; средние судейские оценки от 0 до 10">`;
for(const v of [2,4,6,8,10])s+=`<polygon points="${polygon(v)}" fill="none" stroke="#344456"/>`;
labels.forEach((l,i)=>{const [x,y]=pt(i,10);s+=`<line class="plot-grid" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/><text class="axis-label" x="${x}" y="${y+(i===0?-12:24)}" text-anchor="middle">${esc(l==='Мастерство катания'?'Катание':l)}</text>`});
for(const [e,col] of [[prev,'#9baabd'],[last,'#8ecae4']])if(e)s+=`<polygon points="${e.components.map((c,i)=>pt(i,c.mean).join(',')).join(' ')}" fill="${col}" fill-opacity="0.19" stroke="${col}" stroke-width="2.5"/>`;
s+=`<text class="axis-label" x="${cx+8}" y="${cy-3}">0–10</text></svg><div class="radar-values">${labels.map((l,i)=>`<div><span>${esc(l)}</span><b>${f(prev?.components[i].mean)} → ${f(last.components[i].mean)}</b></div>`).join('')}</div><p class="muted">${prev?'Серый: '+esc(prev.date)+' · бирюзовый: '+esc(last.date):'Только один старт: сопоставимого предыдущего профиля нет.'}. Средние до коэффициентов. Пять осей не добавляются: показан состав компонентов протокола.</p>`;return s;
}
function quality(e,w){
if(!e)return '<p class="analytics-empty">Нет элементов для анализа качества.</p>';
w=Math.max(250,w);const h=e.elements.length*37+28,L=110,mid=L+(w-L-45)*.55,span=(w-L-45)*.45,max=Math.max(...e.elements.map(x=>Math.abs(x.goe_value)),.1);
let s=`<svg viewBox="0 0 ${w} ${h}" class="analytics-svg" role="img" aria-label="Оценки качества элементов последнего старта"><line x1="${mid}" x2="${mid}" y1="0" y2="${h-12}" stroke="#6b7d92"/>`;
e.elements.forEach((el,i)=>{const y=i*37+18,len=Math.abs(el.goe_value)/max*span;s+=`<text class="bar-label" x="0" y="${y+4}">${esc(el.code)}</text><rect x="${el.goe_value<0?mid-len:mid}" y="${y-7}" width="${Math.max(2,len)}" height="12" rx="3" fill="${el.goe_value<0?'#ef9b8c':'#8ecae4'}"/><text class="bar-value" x="${w}" y="${y+4}" text-anchor="end">${f(el.goe_value)}</text>`});return s+'</svg>';
}
function mount(node,logNode,D,visible){
destroy('form');destroy('radar');
const m=context(D.events,visible),last=m.rows.at(-1),allMean=avg(m.baseline,'tss');
node.innerHTML=`<div class="analytics-heading"><div><span class="section-eyebrow">СПОРТИВНАЯ АНАЛИТИКА</span><h2>Форма в цифрах</h2></div><span class="analytics-source-badge">${visible.filter(verified).length} проверенных протоколов</span></div><div class="analytics-context"><label>Сопоставимая категория и программа<select id="analytics-context">${m.keys.map(k=>`<option value="${esc(k)}" ${k===state.context?'selected':''}>${esc(keyLabel(k))}</option>`).join('')||'<option>Нет подробных оценок</option>'}</select></label><p class="muted">Рекорды, средние и дельты — только внутри выбранной категории и программы. Другие категории не объединяются в общий рейтинг. Состав компонентов и коэффициенты также должны совпадать.</p></div>
  <div class="category-tags" aria-label="Фильтр по категории">${['Все',...new Set(D.events.filter(verified).map(cat))].map(c=>`<button type="button" data-analysis-category="${esc(c)}" aria-pressed="${c==='Все'?CareerReport.state.category==='all':CareerReport.state.category===c}">${esc(c)}</button>`).join('')}</div><p class="filter-caption">Короткая и произвольная программы не суммируются. Сезон и категория отбирают записи всей страницы.</p><div class="analytics-kpis">${[
   ['Лучший результат',m.best,'TSS · общий балл',delta(m.best==null?null:m.best-allMean)+' к среднему категории за архив'],
   ['Средняя техника',m.meanTES,'TES · техническая оценка',delta(m.meanTES==null?null:m.meanTES-avg(m.baseline,'tes'))+' к среднему категории за архив'],
   ['Средние компоненты',m.meanPCS,'PCS · компоненты программы',delta(m.meanPCS==null?null:m.meanPCS-avg(m.baseline,'pcs'))+' к среднему категории за архив']
  ].map(([label,value,sub,d])=>`<article class="analytics-kpi"><span>${label}</span><strong>${f(value)}</strong><small>${sub}</small><p>${d}</p></article>`).join('')}<article class="analytics-kpi unknown"><span>Стабильность выездов</span><strong>Нет данных</strong><small>Нужна видеоразметка попыток</small><p>GOE — оценка качества — не доказывает чистый выезд или падение. Процент не рассчитывается.</p></article></div>
  <p class="swipe-hint">Листайте показатели влево и вправо →</p><p class="analytics-method">Выборка показателей: ${m.rows.length} стартов; база сравнения: ${m.baseline.length} стартов той же программы за весь архив. Среднее = сумма баллов / число подтверждённых стартов; дельта = показатель среза − среднее базы. Лучший результат = максимум суммы в срезе.</p>
  <div class="analytics-grid"><article class="analytics-panel form-panel"><div class="module-heading"><span class="module-number">01</span><div><h3>Динамика формы</h3><p>Техника и компоненты в одной программе</p></div></div><div class="analytics-legend"><span style="--series:#8ecae4">Техника</span><span style="--series:#d8ae88">Компоненты</span></div><div id="form-plot"></div><div id="form-tooltip" class="form-tooltip" aria-live="polite"></div><p class="muted">Нажмите точку для деталей. ${m.rows.length===1?'По одному старту динамика не определяется.':''} Шкала построена по фактическим баллам; пропущенных программ нет на линии.</p></article>
  <article class="analytics-panel"><div class="module-heading"><span class="module-number">02</span><div><h3>Профиль мастерства</h3><p>Последний и предыдущий сопоставимые старты</p></div></div><div id="radar-plot"></div></article>
  <article class="analytics-panel"><div class="module-heading"><span class="module-number">03</span><div><h3>Состав программ</h3><p>Попытки по подтверждённым протоколам</p></div></div><div id="evolution-plot"></div><div class="analytics-legend">${Object.entries(colors).map(([k,c])=>`<span style="--series:${c}">${names[k]}</span>`).join('')}</div><div class="evolution-totals"></div><p class="muted">Учитываются все категории текущего фильтра. Каждый прыжок в каскаде считается отдельно; вращение или другой элемент — одна запись, включая незачтённые. Это состав найденных программ, а не статистика всех тренировок и не единая шкала сложности. Сезоны без протоколов не заменены нулями. Учётный сезон проекта: 01.07–30.06.</p></article>
  <article class="analytics-panel"><div class="module-heading"><span class="module-number">04</span><div><h3>Где теряются баллы</h3><p>GOE — качество элементов последнего старта</p></div></div><div id="quality-plot"></div>${last?`<details class="quality-key"><summary>Коды, русские названия и нулевые элементы</summary>${last.elements.map(el=>`<p>${notation(el)} — ${esc(el.plain_russian)} ${badge(el)}${el.element_score===0?' · не зачтён; числовых судейских оценок нет':''}</p>`).join('')}</details><p class="muted">${esc(last.title)} · ${last.date}. Отрицательный GOE снижает базовую стоимость. У незачтённого элемента GOE 0 не означает чистого исполнения.</p>`:''}</article></div>
  <div class="analytics-goals"><div class="module-heading"><span class="module-number">05</span><div><h3>Ближайший фокус</h3><p>Предложения аналитика для обсуждения с тренером</p></div></div>${last?`<div class="goal-grid">${(last.training_priorities||['Обсудить детали последнего проката по видео; без него причины потерь не установлены.']).map((t,i)=>`<article><span>0${i+1}</span><p>${esc(t)}</p><small>План тренером не подтверждён</small></article>`).join('')}</div>`:'<p>Для целей по технике нужен подробный протокол и обсуждение с тренером.</p>'}</div>`;
node.querySelectorAll('[data-analysis-category]').forEach(b=>b.onclick=()=>CareerReport.setCategory(b.dataset.analysisCategory==='Все'?'all':b.dataset.analysisCategory));
const draw=(id,fn)=>{const el=node.querySelector('#'+id);el.innerHTML=fn(el.clientWidth||300)};
draw('form-plot',w=>line(m.rows,w));draw('radar-plot',w=>radar(m.rows,w));draw('evolution-plot',w=>stacked(visible,w));draw('quality-plot',w=>quality(last,w));
const total=visible.filter(verified).map(attempts).reduce((a,t)=>{Object.keys(colors).forEach(k=>a[k]+=t[k]);return a},{single:0,double:0,triple:0,spin:0,other:0});node.querySelector('.evolution-totals').textContent=Object.keys(colors).map(k=>names[k]+': '+total[k]).join(' · ');
const tooltip=e=>{const el=node.querySelector('#form-tooltip');if(!e){el.textContent='Нет подтверждённых точек в выбранном срезе.';return}el.innerHTML=`<div><strong>${esc(e.title)}</strong><span>${e.date} · ${esc(prog(e))} · ${e.place} / ${e.field_size}</span></div><div class="tooltip-values"><span>Техника <b>${f(e.tes)}</b></span><span>Компоненты <b>${f(e.pcs)}</b></span><span>Итог <b>${f(e.tss)}</b></span></div><button type="button" data-analytics-open="${esc(e.id)}">Открыть разбор →</button>`;el.querySelector('button').onclick=()=>CareerReport.open(e.id)};
tooltip(last);
if(m.rows.length){
const slot=node.querySelector('#form-plot');slot.innerHTML='<div class="chart-wrap"><canvas role="img" aria-label="Техника и компоненты; данные точек доступны кнопками ниже"></canvas></div><div class="chart-point-buttons">'+m.rows.map(e=>`<button type="button" data-form-point="${esc(e.id)}">${e.date}<br><b>${f(e.tes)} / ${f(e.pcs)}</b></button>`).join('')+'</div>';
let active=last.id;
charts.set('form',new Chart(slot.querySelector('canvas'),{type:'line',data:{labels:m.rows.map(e=>e.date.slice(8)+'.'+e.date.slice(5,7)+'.'+e.date.slice(2,4)),datasets:[['tes','Техника','#8ecae4'],['pcs','Компоненты','#d8ae88']].map(([k,label,color])=>({label,data:m.rows.map(e=>e[k]),borderColor:color,backgroundColor:color+'12',fill:true,tension:.12,borderWidth:2.5,pointRadius:5,pointHitRadius:18,pointHoverRadius:8}))},options:{responsive:true,maintainAspectRatio:false,animation:motion(),interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{enabled:false,external:({tooltip:t})=>{const i=t.dataPoints?.[0]?.dataIndex;if(t.opacity&&i!=null&&m.rows[i].id!==active){active=m.rows[i].id;tooltip(m.rows[i])}}}},scales:{x:{grid:{display:false},ticks:{color:'#adc3d4',font:{size:11}}},y:{beginAtZero:true,suggestedMax:Math.ceil(Math.max(...m.rows.flatMap(e=>[e.tes,e.pcs]))*1.15),grid:{color:'#34465b'},ticks:{color:'#adc3d4',font:{size:11}}}}}}));
slot.querySelectorAll('[data-form-point]').forEach(b=>b.onclick=()=>tooltip(m.rows.find(e=>e.id===b.dataset.formPoint)));
}
radarCanvas(node.querySelector('#radar-plot'),m.rows,'radar');bindNotations(node);
node.querySelector('#analytics-context').onchange=ev=>{state.context=ev.target.value;mount(node,logNode,D,visible);hero(D,visible)};
renderLog(logNode,visible,D);RefinedUI.analytics(node);
}
function renderLog(node,events,D){
const rows=events.filter(e=>!state.search||[e.title,e.city,e.date].join(' ').toLowerCase().includes(state.search.toLowerCase())).sort((a,b)=>{let av=a[state.sort],bv=b[state.sort];if(av==null)return bv==null?0:1;if(bv==null)return -1;return(typeof av==='number'?av-bv:String(av).localeCompare(String(bv)))*state.direction});
const headers=[['title','Турнир'],['date','Дата'],['segment','Программа'],['tes','Техника'],['pcs','Компоненты'],['deduction','Штраф'],['tss','Сумма'],['place','Место']];
node.innerHTML=`<div class="module-heading"><span class="module-number">06</span><div><h2>Журнал выступлений</h2><p>Все известные записи с исходными статусами</p></div></div><div class="log-controls"><label>Поиск по журналу<input id="log-search" type="search" placeholder="Турнир или город" value="${esc(state.search)}"></label><label>Сортировка<select id="log-sort">${headers.map(([k,v])=>`<option value="${k}" ${state.sort===k?'selected':''}>${v}</option>`).join('')}</select></label><button type="button" id="log-direction" aria-label="Изменить направление сортировки">${state.direction===-1?'По убыванию ↓':'По возрастанию ↑'}</button></div><p class="muted">${rows.length} записей. Баллы разных категорий сортируются для поиска, но не объявляются единым рейтингом. Прочерк означает отсутствие подтверждения.</p><div class="performance-table"><table><thead><tr>${headers.map(([k,v])=>`<th><button type="button" data-log-sort="${k}" aria-label="Сортировать: ${v}">${v}${state.sort===k?(state.direction===-1?' ↓':' ↑'):''}</button></th>`).join('')}<th>Видео</th></tr></thead><tbody>${rows.map(e=>{const ok=verified(e),earlier=D.events.filter(x=>verified(x)&&x.date<e.date&&comparable(x,e)),pb=ok&&earlier.length>0&&e.tss>Math.max(...earlier.map(x=>x.tss));return `<tr class="${pb?'personal-best':''}" data-log-event="${esc(e.id)}"><td data-label="Турнир"><button type="button" data-log-open="${esc(e.id)}">${esc(e.title)} ↗</button><small>${esc(e.city)} · ${esc(e.category)}</small><small class="log-status">${ok?'Судейский PDF':esc(e.status_label)}${pb?' · Новый максимум по найденным протоколам':''}</small></td><td data-label="Дата">${e.date}</td><td data-label="Программа">${esc(prog(e))}</td>${['tes','pcs','deduction','tss'].map(k=>`<td data-label="${headers.find(x=>x[0]===k)[1]}">${ok?f(e[k]):'—'}</td>`).join('')}<td data-label="Место">${ok?e.place+' / '+e.field_size:'—'}</td><td data-label="Видео">${/^https?:\/\//.test(e.video_url||'')?`<a href="${esc(e.video_url)}" target="_blank" rel="noopener">Смотреть</a>`:'Нет ссылки'}</td></tr>`}).join('')||'<tr><td colspan="9">Нет записей по запросу.</td></tr>'}</tbody></table></div>`;
node.querySelectorAll('[data-log-open]').forEach(b=>b.onclick=()=>CareerReport.open(b.dataset.logOpen));
node.querySelector('#log-search').onchange=ev=>{state.search=ev.target.value;renderLog(node,events,D)};
node.querySelector('#log-sort').onchange=ev=>{state.sort=ev.target.value;renderLog(node,events,D)};
node.querySelector('#log-direction').onclick=()=>{state.direction*=-1;renderLog(node,events,D)};
node.querySelectorAll('[data-log-sort]').forEach(b=>b.onclick=()=>{if(state.sort===b.dataset.logSort)state.direction*=-1;else{state.sort=b.dataset.logSort;state.direction=-1}renderLog(node,events,D)});
}
function coverLine(rows){
if(!rows.length)return '<p>Нет сопоставимых оценок</p>';
const W=360,H=145,L=30,R=12,T=12,B=30,max=Math.ceil(Math.max(...rows.flatMap(e=>[e.tes,e.pcs]),1)*1.15),x=i=>rows.length===1?W/2:L+i*(W-L-R)/(rows.length-1),y=v=>H-B-v/max*(H-T-B);
let svg=`<svg viewBox="0 0 ${W} ${H}" class="analytics-svg" role="img" aria-label="Техника и компоненты по проверенным сопоставимым протоколам">`;
for(let i=0;i<=4;i++){const v=max*i/4;svg+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="#759bb52b"/><text x="${L-6}" y="${y(v)+3}" text-anchor="end" fill="#8da8bd" font-size="9">${Number(v.toFixed(1))}</text>`}
for(const [key,color] of [['tes','#83c7e5'],['pcs','#e5b48e']]){if(rows.length>1)svg+=`<polyline points="${rows.map((e,i)=>x(i)+','+y(e[key])).join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>`;rows.forEach((e,i)=>svg+=`<g tabindex="0" role="button" data-analytics-point="${esc(e.id)}" aria-label="${esc(e.title)}: ${f(e[key])}"><circle cx="${x(i)}" cy="${y(e[key])}" r="15" fill="transparent"/><circle cx="${x(i)}" cy="${y(e[key])}" r="3" fill="${color}"/></g>`)}
rows.forEach((e,i)=>svg+=`<text x="${x(i)}" y="${H-9}" text-anchor="${i===0&&rows.length>1?'start':i===rows.length-1&&rows.length>1?'end':'middle'}" font-size="9" fill="#8da8bd">${e.date.slice(8)}.${e.date.slice(5,7)}.${e.date.slice(2,4)}</text>`);return svg+'</svg>';
}
function hero(D,visible){MilanaPremium.hero(D)}
return {mount,hero,season,badge,notation,bindNotations,bindSheet,dispose,model:{verified,attempts,context,avg,elementStatus,comparisonKey,keyLabel,comparable},state};
})();
