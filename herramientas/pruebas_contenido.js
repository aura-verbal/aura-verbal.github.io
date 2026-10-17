const fs=require('fs'), path=require('path');
const R=require('path').resolve(__dirname,'..');
const M=require(R+'/js/motor.js');
const P=JSON.parse(fs.readFileSync(R+'/data/paises.json','utf8'));
const IDX=JSON.parse(fs.readFileSync(R+'/data/escenarios/index.json','utf8'));
let errors=0; const err=(...a)=>{errors++; console.log('ERR',...a);};
const countries=['CL','MX','CO','AR','PE'];
const TEMAS=['la energía solar en Chile','Termodinámica','el ciclo del agua'];
function checkSim(id,c,s,sim,label){
  const N=sim.nodes;
  if(!N[sim.start]) err(id,label,'start');
  for(const [nid,n] of Object.entries(N)){
    if(!n.say) err(id,c,label,nid,'no say');
    if(n.type==='choice'){ if(n.opts.length!==3) err(id,label,nid,'opts'); if(n.opts.filter(o=>o.s>=1).length!==1) err(id,label,nid,'best count');
      n.opts.forEach(o=>{ const nx=o.next!==undefined?o.next:n.next; if(nx&&!N[nx]) err(id,label,nid,'bad next',nx); if(!o.fb) err(id,label,nid,'no fb'); }); if(n.next===undefined && n.opts.some(o=>o.next===undefined)) err(id,label,nid,'missing next'); }
    else if(n.type==='fill'){ if(!n.tpl.includes('___')) err(id,c,label,nid,'tpl'); if(n.opts.length!==3) err(id,label,nid,'fill opts'); if(n.next&&!N[n.next]) err(id,label,nid,'next'); }
    else if(n.type==='free'){ if(n.groups.length!==n.hint.length) err(id,c,label,nid,'groups/hint',n.groups.length,n.hint.length);
      [n.next].concat(n.branch?[n.branch.alto,n.branch.bajo]:[]).forEach(x=>{ if(x&&!N[x]) err(id,label,nid,'next',x); });
      const r=M.scoreFree(n,n.model,null,s.weights,s.words,M.mergeMuletillas(P.comunes,(P.paises.find(p=>p.id===c)||{}).muletillas));
      if(r.S<0.95) err(id,c,label,nid,'model score',r.S.toFixed(2),r.missing,r.mul.found,r.colloquial);
      if(r.colloquial.length) err(id,c,label,nid,'model colloquial',JSON.stringify(r.colloquial));
      const weak=M.scoreFree(n,'sí, bueno, eso',null,s.weights,s.words,[]); if(weak.S>0.5) err(id,c,label,nid,'weak answer too high',weak.S.toFixed(2));
      if(n.branch && !(M.nextFree(n,weak.S)===n.branch.bajo && M.nextFree(n,r.S)===n.branch.alto)) err(id,label,nid,'branch'); }
    else err(id,label,nid,'type');
  }
  const seen=new Set(); const walk=x=>{ if(!x||seen.has(x)) return; seen.add(x); const n=N[x]; (n.opts||[]).forEach(o=>walk(o&&o.next!==undefined?o.next:n.next)); walk(n.next); if(n.branch){walk(n.branch.alto);walk(n.branch.bajo);} }; walk(sim.start);
  Object.keys(N).forEach(x=>{ if(!seen.has(x)) err(id,label,'unreachable',x); });
  if(M.maxTurnos(sim)!==8) err(id,label,'turnos',M.maxTurnos(sim));
}
for(const it of IDX.list.filter(x=>x.ready)){
  const raw=JSON.parse(fs.readFileSync(R+'/data/escenarios/'+it.id+'.json','utf8'));
  for(const c of countries){
    const base=M.deepL(raw,c);
    // combinaciones de respuestas previas: por defecto, cada opción de cada pregunta y temas propios
    const states=[{}];
    (base.prep||[]).forEach(q=>{ if(q.tipo==='chips'){ if(!q.opts.some(o=>o.v===q.def)) err(it.id,'prep def',q.id); q.opts.forEach(o=>states.push({[q.id]:o.v})); }
      else if(q.tipo==='texto') TEMAS.forEach(t=>states.push({[q.id]:t}));
      else if(q.tipo!=='fecha') err(it.id,'prep tipo',q.tipo);
      if(!q.q) err(it.id,'prep q',q.id); });
    for(const st of states){
      const ps=M.prepSlots(base.prep,st); let s=M.fillSlots(base,ps.slots);
      const scan=(v,p)=>{ if(v===undefined||v===null&&!p.endsWith('next')) err(it.id,c,'undefined at',p); if(typeof v==='string'&&!p.startsWith('.prep')&&/\{[a-z_]+\}/.test(v)) err(it.id,c,'slot sin llenar',p,v.slice(0,60)); if(v&&typeof v==='object') for(const k in v) scan(v[k],p+'.'+k); };
      scan(s,'');
      if(s.words.length!==10) err(it.id,'words',s.words.length);
      s.words.forEach((w,i)=>{ if(!w.ex.includes('___')) err(it.id,c,'ex blank',i); if(!Array.isArray(w.d)||w.d.length!==2) err(it.id,c,'d',i); if(w.d.includes(w.pro)) err(it.id,c,'d has pro',i,w.pro); });
      if(ps.propio && !s.simPropio) err(it.id,'propio sin simPropio');
      checkSim(it.id,c,s,ps.propio?s.simPropio:s.sim,ps.propio?'propio':'sim');
    }
    if(c==='CL') console.log(it.id,'turnos',M.maxTurnos(base.sim),'nodos',Object.keys(base.sim.nodes).length,'combinaciones',states.length);
  }
}
// interest simulation
const best=Array(8).fill(1), mid=[1,.4,1,.3,1,.4,1,.8], bad=Array(8).fill(.3);
for(const pers of ['amable','neutral','dificil']) for(const [name,arr] of [['best',best],['mixto',mid],['flojo',bad],['casi',[1,1,1,.4,1,.3,.8,1]]]){ let i=50; arr.forEach(x=>i=M.aplicarInteres(i,M.deltaInteres(x,pers))); console.log(pers,name,i,M.finalPorInteres(i)); }
// muletillas tests
const lists=c=>M.mergeMuletillas(P.comunes,P.paises.find(p=>p.id===c).muletillas);
const t=(c,txt)=>console.log(c,JSON.stringify(txt),'->',JSON.stringify(M.countMuletillas(txt,lists(c)).found));
t('MX','este yo creo que este proyecto es bueno, o sea, pues sí, este');
t('AR','nada, che, viste que el laburo es tipo re bueno, viste la peli, tipo de cambio');
t('CO','pues el proyecto salió bien, parce, me entiende, pues');
t('CL','sí po, cachai que como que me fue bien, o sea');
// reto diario: cada frase de «caza la muletilla» debe detectar su muletilla y no las otras opciones
for(const [k,arr] of Object.entries(P.cazar)){ const c=k==='base'?'PE':k; arr.forEach(f=>{ const r=M.countMuletillas(f.t,lists(c)); const ks=Object.keys(r.found).map(M.norm);
  if(!ks.includes(M.norm(f.m))) err('cazar',k,'no detecta',f.m,JSON.stringify(r.found)); if(ks.length!==1) err('cazar',k,'detecta otras',JSON.stringify(r.found));
  f.o.forEach(o=>{ if(!M.norm(f.t).includes(M.norm(o))) err('cazar',k,'opcion fuera de la frase',o); }); }); }
console.log('ERRORS',errors);
