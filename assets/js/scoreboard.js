window.ScoreboardModel=(()=>{
const isMilana=r=>r.is_milana===true||/милана.*кузин|кузин.*милана/i.test(r.name||'');
function build(e,boards){
const official=e.source_verified===true&&['JUDGES_DETAILS','OFFICIAL_FINAL'].includes(e.status)&&Number.isFinite(e.tss);
const snapshot=official?null:boards[e.id];
let rows=official?(e.top||[]).map(r=>({...r,rank:r.place,start_number:r.start_number??null})):snapshot?(snapshot.rows||[]).map(r=>({...r})):[];
if(official&&!rows.some(isMilana))rows.push({name:'Милана Кузина',is_milana:true,rank:e.place,start_number:e.start_number??null,tss:e.tss,tes:e.tes,pcs:e.pcs,deduction:e.deduction});
return {official,provisional:!!snapshot,rows,own:rows.find(isMilana)||null,snapshot,total:e.field_size??null,source_path:official?e.source_path:snapshot?.source_path};
}
function sort(rows,key='tss',direction=-1){return [...rows].sort((a,b)=>{const av=a[key],bv=b[key];if(!Number.isFinite(av))return Number.isFinite(bv)?1:0;if(!Number.isFinite(bv))return -1;return(av-bv)*direction||(a.rank??999)-(b.rank??999)});}
const gap=(row,own)=>Number.isFinite(row?.tss)&&Number.isFinite(own?.tss)?Number((row.tss-own.tss).toFixed(2)):null;
return {build,sort,gap,isMilana};
})();