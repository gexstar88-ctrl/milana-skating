/* Рекорды подтверждённых выступлений. Нет общей шкалы для разных зачётов. */
window.CareerRecords=(()=>{
const category=e=>String(e.category||'Категория неизвестна').split(',')[0].trim();
const program=e=>e.segment||'Программа не указана';
const key=e=>JSON.stringify([category(e),program(e),(e.components||[]).map(c=>[c.component,c.multiplier])]);
const confirmed=e=>e.source_verified===true&&['JUDGES_DETAILS','OFFICIAL_FINAL'].includes(e.status)&&Number.isFinite(e.tss);
function record(events,metric,min=false){
const candidates=events.filter(e=>Number.isFinite(e[metric])&&(metric!=='place'||e.place>0)).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
if(!candidates.length)return null;
const value=(min?Math.min:Math.max)(...candidates.map(e=>e[metric]));const ties=candidates.filter(e=>e[metric]===value);return {value,event:ties[0],ties};
}
function build(events){
const rows=events.filter(confirmed),groups=new Map();
for(const e of rows){const k=key(e);if(!groups.has(k))groups.set(k,{key:k,category:category(e),program:program(e),components:(e.components||[]).map(c=>({name:c.component,multiplier:c.multiplier})),events:[]});groups.get(k).events.push(e);}
const ordered=[...groups.values()].map(g=>{g.events.sort((a,b)=>a.date.localeCompare(b.date));g.records={tss:record(g.events,'tss'),tes:record(g.events,'tes'),pcs:record(g.events,'pcs'),place:record(g.events,'place',true)};g.label=g.category+' · '+g.program;return g;}).sort((a,b)=>b.events.at(-1).date.localeCompare(a.events.at(-1).date));
return {groups:ordered,confirmedCount:rows.length,archiveCount:events.length,bestPlace:record(rows,'place',true),wins:rows.filter(e=>e.place===1)};
}
return {key,confirmed,build};
})();