const fs=require('fs'), path=require('path');
const R=require('path').resolve(__dirname,'..');
const M=require(R+'/js/motor.js');
const P=JSON.parse(fs.readFileSync(R+'/data/paises.json','utf8'));
const IDX=JSON.parse(fs.readFileSync(R+'/data/escenarios/index.json','utf8'));
let errors=0; const err=(...a)=>{errors++; console.log('ERR',...a);};
const countries=['CL','MX','CO','AR','PE'];
for(const it of IDX.list.filter(x=>x.ready)){
  const raw=JSON.parse(fs.readFileSync(R+'/data/escenarios/'+it.id+'.json','utf8'));
  for(const c of countries){
    const s=M.deepL(raw,c);
    const scan=(v,p)=>{ if(v===undefined||v===null&&!p.endsWith('next')) err(it.id,c,'undefined at',p); if(v&&typeof v==='object') for(const k in v) scan(v[k],p+'.'+k); };
    scan(s,'');
    if(s.words.length!==10) err(it.id,'words',s.words.length);
    s.words.forEach((w,i)=>{ if(!w.ex.includes('___')) err(it.id,c,'ex blank',i); if(!Array.isArray(w.d)||w.d.length!==2) err(it.id,c,'d',i); if(w.d.includes(w.pro)) err(it.id,c,'d has pro',i,w.pro); });
    const N=s.sim.nodes;
    if(!N[s.sim.start]) err(it.id,'start');
    for(const [id,n] of Object.entries(N)){
      if(!n.say) err(it.id,c,id,'no say');
      if(n.type==='choice'){ if(n.opts.length!==3) err(it.id,id,'opts'); if(!n.opts.some(o=>o.s>=1)) err(it.id,id,'no best');
        n.opts.forEach(o=>{ const nx=o.next!==undefined?o.next:n.next; if(nx&&!N[nx]) err(it.id,id,'bad next',nx); if(!o.fb) err(it.id,id,'no fb'); }); if(n.next===undefined && n.opts.some(o=>o.next===undefined)) err(it.id,id,'missing next'); }
      else if(n.type==='fill'){ if(!n.tpl.includes('___')) err(it.id,c,id,'tpl'); if(n.opts.length!==3) err(it.id,id,'fill opts'); if(n.next&&!N[n.next]) err(it.id,id,'next'); }
      else if(n.type==='free'){ if(n.groups.length!==n.hint.length) err(it.id,c,id,'groups/hint',n.groups.length,n.hint.length); if(n.next&&!N[n.next]) err(it.id,id,'next');
        const r=M.scoreFree(n,n.model,null,s.weights,s.words,M.mergeMuletillas(P.comunes,(P.paises.find(p=>p.id===c)||{}).muletillas)); if(r.S<0.95) err(it.id,c,id,'model score',r.S.toFixed(2),r.missing,r.mul.found,r.colloquial); }
      else err(it.id,id,'type');
    }
    // reachability
    const seen=new Set(); const walk=id=>{ if(!id||seen.has(id)) return; seen.add(id); const n=N[id]; (n.opts||[]).forEach(o=>walk(o&&o.next!==undefined?o.next:n.next)); walk(n.next); }; walk(s.sim.start);
    Object.keys(N).forEach(id=>{ if(!seen.has(id)) err(it.id,'unreachable',id); });
    if(c==='CL') console.log(it.id,'turnos',M.maxTurnos(s.sim),'nodos',Object.keys(N).length);
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
console.log('ERRORS',errors);
