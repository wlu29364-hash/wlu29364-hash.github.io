
const STORAGE_KEY_LOGS = 'skincare_logs_v1';
const STORAGE_KEY_PRODUCTS = 'skincare_products_v1';

const $ = sel => document.querySelector(sel);
const $all = sel => Array.from(document.querySelectorAll(sel));

function readJSON(key, def){ try{const v=localStorage.getItem(key);return v?JSON.parse(v):def;}catch(e){return def;} }
function writeJSON(key, val){ try{localStorage.setItem(key, JSON.stringify(val));}catch(e){} }

function initChips(){
  $all('.chip-row').forEach(row=>{
    const opts=(row.dataset.options||'').split(',').map(s=>s.trim()).filter(Boolean);
    row.innerHTML='';
    opts.forEach(text=>{
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='chip';
      btn.textContent=text;
      btn.onclick=()=>{
        row.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
        btn.classList.add('active');
      };
      row.appendChild(btn);
    });
  });
}

function getChip(rowSel){
  const a=document.querySelector(rowSel+' .chip.active');
  return a?a.textContent:'';
}

function setToday(){
  const d=new Date();
  $('#record-date').value=d.toISOString().slice(0,10);
}

function initPeriodToggle(){
  const am=$('#record-am'), pm=$('#record-pm');
  [am,pm].forEach(b=>{
    b.onclick=()=>{
      am.classList.toggle('active',b===am);
      pm.classList.toggle('active',b===pm);
    };
  });
}
function curPeriod(){ return $('#record-am').classList.contains('active')?'AM':'PM'; }

function loadProducts(){return readJSON(STORAGE_KEY_PRODUCTS,[]);}
function saveProducts(v){writeJSON(STORAGE_KEY_PRODUCTS,v);}

function renderProducts(){
  const list=loadProducts();
  const ul=$('#product-list');
  ul.innerHTML='';
  list.forEach(p=>{
    const li=document.createElement('li');
    const label=document.createElement('div');
    label.className='item-label';
    label.textContent=p.name;
    const meta=document.createElement('div');
    meta.className='item-meta';
    const type=p.type||'其他';
    const period=p.period==='AM'?'早':p.period==='PM'?'晚':'早晚皆可';
    meta.textContent=`${type} · ${period}`;
    const del=document.createElement('button');
    del.className='delete-btn';
    del.textContent='删除';
    del.onclick=()=>{
      saveProducts(loadProducts().filter(x=>x.id!==p.id));
      renderProducts();
      buildProductTags();
    };
    li.append(label,meta,del);
    ul.appendChild(li);
  });
}

function buildProductTags(){
  const box=$('#record-product-tags');
  box.innerHTML='';
  loadProducts().forEach(p=>{
    const tag=document.createElement('button');
    tag.type='button';
    tag.className='tag';
    tag.textContent=p.name;
    tag.onclick=()=>{
      tag.classList.toggle('active');
      syncProductInput();
    };
    box.appendChild(tag);
  });
}

function syncProductInput(){
  const active=Array.from($('#record-product-tags').querySelectorAll('.tag.active')).map(t=>t.textContent);
  const manual=$('#record-products-input').value.trim();
  const manualList=manual?manual.split(/[,，、\s]+/).map(s=>s.trim()).filter(Boolean):[];
  const all=[...new Set([...active,...manualList])];
  $('#record-products-input').value=all.join('、');
}

function initProductInputSync(){
  $('#record-products-input').addEventListener('input',()=>{
    $('#record-product-tags').querySelectorAll('.tag').forEach(t=>t.classList.remove('active'));
  });
}

function setupAddProduct(){
  $('#add-product').onclick=()=>{
    const name=$('#product-name').value.trim();
    if(!name){return toast('先写个产品名');}
    const type=$('#product-type').value;
    const period=$('#product-period').value;
    const list=loadProducts();
    const exist=list.find(p=>p.name===name);
    if(exist){exist.type=type;exist.period=period;}
    else list.push({id:Date.now()+Math.random().toString(16).slice(2),name,type,period});
    saveProducts(list);
    $('#product-name').value='';
    renderProducts();
    buildProductTags();
    toast('已保存到产品库');
  };
}

function loadLogs(){return readJSON(STORAGE_KEY_LOGS,[]);}
function saveLogs(v){writeJSON(STORAGE_KEY_LOGS,v);}

function saveRecord(){
  const date=$('#record-date').value;
  if(!date){return toast('请选择日期');}
  const period=curPeriod();
  const productsText=$('#record-products-input').value.trim();
  const products=productsText?productsText.split(/[,，、\s]+/).map(s=>s.trim()).filter(Boolean):[];
  const feeling=getChip('#feeling-options');
  const skin=getChip('#skin-options');
  const note=$('#record-note').value.trim();
  const key=`${date}-${period}`;
  const logs=loadLogs();
  const item={key,date,period,products,feeling,skin,note,ts:Date.now()};
  const i=logs.findIndex(l=>l.key===key);
  if(i>=0)logs[i]=item;else logs.push(item);
  logs.sort((a,b)=>a.date===b.date?(a.period<b.period?1:-1):(a.date<b.date?1:-1));
  saveLogs(logs);
  renderHistory();
  renderStats();
  toast('已保存');
}

function renderHistory(){
  const box=$('#history-list');
  const logs=loadLogs();
  if(!logs.length){box.innerHTML='<p class="muted">还没有记录。</p>';return;}
  box.innerHTML='';
  logs.forEach(l=>{
    const wrap=document.createElement('div');
    wrap.className='history-entry';
    const head=document.createElement('div');
    head.className='history-head';
    const title=document.createElement('span');
    title.textContent=`${l.date} ${l.period==='AM'?'早':'晚'}`;
    const del=document.createElement('button');
    del.className='delete-btn';
    del.textContent='删除';
    del.onclick=()=>{
      saveLogs(loadLogs().filter(x=>x.key!==l.key));
      renderHistory();
      renderStats();
    };
    head.append(title,del);
    const prod=document.createElement('div');
    prod.className='history-products';
    prod.textContent=l.products&&l.products.length?'产品：'+l.products.join('、'):'产品：未填写';
    const extra=document.createElement('div');
    extra.className='history-extra';
    extra.textContent=`感受：${l.feeling||'未填写'}  |  状态：${l.skin||'未填写'}`;
    wrap.append(head,prod,extra);
    if(l.note){
      const note=document.createElement('div');
      note.className='history-extra';
      note.textContent='备注：'+l.note;
      wrap.appendChild(note);
    }
    box.appendChild(wrap);
  });
}

function startOfWeek(d){const x=new Date(d);const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);x.setHours(0,0,0,0);return x;}
function startOfMonth(d){const x=new Date(d);x.setDate(1);x.setHours(0,0,0,0);return x;}

function filterLogs(range){
  const logs=loadLogs();
  const now=new Date();
  if(range==='30'){
    const from=new Date(now);from.setDate(from.getDate()-29);
    const s=from.toISOString().slice(0,10);
    return logs.filter(l=>l.date>=s);
  }
  if(range==='week'){
    const from=startOfWeek(now);
    const s=from.toISOString().slice(0,10);
    return logs.filter(l=>l.date>=s);
  }
  if(range==='month'){
    const from=startOfMonth(now);
    const s=from.toISOString().slice(0,10);
    return logs.filter(l=>l.date>=s);
  }
  return logs;
}

function renderStats(range){
  const activeBtn=$('#tab-stats .seg-btn.active');
  range=range||activeBtn?.dataset.range||'30';
  const logs=filterLogs(range);
  const days=new Set(logs.map(l=>l.date));
  $('#stats-summary').textContent=`时间范围内有记录的天数：${days.size} 天；记录总数：${logs.length} 条。`;
  const byProd=new Map();
  logs.forEach(l=>(l.products||[]).forEach(p=>byProd.set(p,(byProd.get(p)||0)+1)));
  const ulProd=$('#stats-by-product');ulProd.innerHTML='';
  if(!byProd.size){ulProd.innerHTML='<li><span>暂无数据</span></li>';}
  else{
    Array.from(byProd.entries()).sort((a,b)=>b[1]-a[1]).forEach(([n,c])=>{
      const li=document.createElement('li');li.innerHTML=`<span>${n}</span><span>${c} 次</span>`;ulProd.appendChild(li);
    });
  }
  const nameToType={};loadProducts().forEach(p=>nameToType[p.name]=p.type||'其他');
  const byType=new Map();
  logs.forEach(l=>(l.products||[]).forEach(p=>{
    const t=nameToType[p]||'其他';
    byType.set(t,(byType.get(t)||0)+1);
  }));
  const ulType=$('#stats-by-type');ulType.innerHTML='';
  if(!byType.size){ulType.innerHTML='<li><span>暂无数据</span></li>';}
  else{
    Array.from(byType.entries()).sort((a,b)=>b[1]-a[1]).forEach(([t,c])=>{
      const li=document.createElement('li');li.innerHTML=`<span>${t}</span><span>${c} 次</span>`;ulType.appendChild(li);
    });
  }
}

function initStatsTabs(){
  $all('#tab-stats .seg-btn').forEach(btn=>{
    btn.onclick=()=>{
      $all('#tab-stats .seg-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      renderStats(btn.dataset.range);
    };
  });
}

function initTabs(){
  $all('.tab-bar .tab-btn').forEach(btn=>{
    btn.onclick=()=>{
      $all('.tab-bar .tab-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const tab=btn.dataset.tab;
      $all('.tab').forEach(sec=>sec.classList.toggle('active',sec.id==='tab-'+tab));
      if(tab==='stats')renderStats();
      if(tab==='history')renderHistory();
    };
  });
}

let toastTimer=null;
function toast(msg){
  const el=$('#toast');if(!el)return;
  el.textContent=msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),1500);
}

function init(){
  initChips();
  setToday();
  initPeriodToggle();
  initTabs();
  initProductInputSync();
  setupAddProduct();
  renderProducts();
  buildProductTags();
  initStatsTabs();
  renderHistory();
  $('#save-record').onclick=saveRecord;
}

document.addEventListener('DOMContentLoaded',init);
