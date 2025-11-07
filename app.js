// v3.3.1 稳定版逻辑

const STORAGE_KEY_LOGS = 'skincare_logs_v331';
const STORAGE_KEY_PRODUCTS = 'skincare_products_v331';

function $(sel){return document.querySelector(sel);}
function $all(sel){return Array.from(document.querySelectorAll(sel));}

function showToast(msg){
  const el = $('#toast');
  if(!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),1600);
}

// ============= 数据操作 =============
function loadLogs(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY_LOGS) || '[]');
  }catch(e){
    return [];
  }
}
function saveLogs(list){
  localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(list));
}
function loadProducts(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY_PRODUCTS) || '[]');
  }catch(e){
    return [];
  }
}
function saveProducts(list){
  localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(list));
}

// ============= Tab 切换 =============
function bindTabs(){
  const sections = {
    log: $('#log'),
    stats: $('#stats'),
    products: $('#products'),
    history: $('#history')
  };
  $all('.tab-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.target;
      $all('.tab-btn').forEach(b=>b.classList.toggle('active', b===btn));
      Object.keys(sections).forEach(k=>{
        sections[k].style.display = (k===id)?'block':'none';
      });
      if(id === 'stats') renderStats();
      if(id === 'products') renderProducts();
      if(id === 'history') renderHistory();
      // 记住最后 tab
      try{localStorage.setItem('skincare_last_tab', id);}catch(e){}
    });
  });
  // 恢复上次 tab
  try{
    const last = localStorage.getItem('skincare_last_tab');
    if(last && sections[last]){
      const btn = document.querySelector('.tab-btn[data-target="'+last+'"]');
      if(btn) btn.click();
    }
  }catch(e){}
}

// ============= 记录页 =============
function initDate(){
  const inp = $('#date');
  if(!inp) return;
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth()+1).padStart(2,'0');
  const dd = String(today.getDate()).padStart(2,'0');
  inp.value = `${yyyy}-${mm}-${dd}`;
}

function getSelectedTime(){
  const btn = $('#timeSeg .active');
  return btn ? btn.dataset.value : 'am';
}

function bindSeg(containerSelector){
  const seg = $(containerSelector);
  if(!seg) return;
  seg.addEventListener('click', e=>{
    const btn = e.target.closest('button');
    if(!btn) return;
    $all(containerSelector+' button').forEach(b=>b.classList.toggle('active', b===btn));
  });
}

function bindChips(containerSelector, multiple=true){
  const cont = $(containerSelector);
  if(!cont) return;
  cont.addEventListener('click', e=>{
    const chip = e.target.closest('.chip');
    if(!chip) return;
    if(multiple){
      chip.classList.toggle('active');
    }else{
      $all(containerSelector+' .chip').forEach(c=>c.classList.toggle('active', c===chip));
    }
  });
}

function getActiveChipValues(containerSelector){
  return $all(containerSelector+' .chip.active').map(c=>c.dataset.value);
}

function bindProductChipsInputSync(){
  const input = $('#productsInput');
  const chips = $('#productChips');
  if(!input || !chips) return;
  // 点击 chip -> 填充/追加到输入框
  chips.addEventListener('click', e=>{
    const chip = e.target.closest('.chip');
    if(!chip) return;
    const name = chip.dataset.value;
    const cur = input.value.trim();
    if(!cur){
      input.value = name;
    }else{
      const list = cur.split(/、|,|\s+/).filter(Boolean);
      if(!list.includes(name)) list.push(name);
      input.value = list.join('、');
    }
  });
}

// 保存记录
function bindSave(){
  const btn = $('#saveBtn');
  if(!btn) return;
  btn.addEventListener('click', ()=>{
    const date = $('#date').value;
    if(!date){
      showToast('请选择日期');
      return;
    }
    const part = getSelectedTime();
    const productsText = $('#productsInput').value.trim();
    if(!productsText){
      showToast('请输入或选择使用产品');
      return;
    }
    const feelings = getActiveChipValues('#feelChips').join('、');
    const skin = getActiveChipValues('#skinChips').join('、');
    const note = $('#note').value.trim();

    let logs = loadLogs();
    // 若已有同日同段，覆盖
    const idx = logs.findIndex(l=>l.date===date && l.part===part);
    const item = {
      date,
      part,
      products: productsText,
      feelings,
      skin,
      note
    };
    if(idx>=0) logs[idx]=item;
    else logs.push(item);
    saveLogs(logs);
    showToast('已保存');
    renderHistory();
    renderStats();
  });
}

// ============= 产品库 =============
function renderProducts(){
  const listEl = $('#productList');
  const chips = $('#productChips');
  if(!listEl || !chips) return;
  const list = loadProducts();
  listEl.innerHTML = '';
  chips.innerHTML = '';
  list.forEach((p, index)=>{
    const li = document.createElement('li');
    li.innerHTML = `<div>
      <strong>${p.name}</strong>
      <span class="tag">${p.type}</span>
      <span class="tag">${p.use==='all'?'早晚皆可':(p.use==='am'?'仅早':'仅晚')}</span>
    </div>
    <button class="btn-sm" data-index="${index}">删除</button>`;
    listEl.appendChild(li);

    const chip = document.createElement('div');
    chip.className='chip';
    chip.dataset.value = p.name;
    chip.textContent = p.name;
    chips.appendChild(chip);
  });

  // 删除
  listEl.onclick = (e)=>{
    const btn = e.target.closest('.btn-sm');
    if(!btn) return;
    const idx = Number(btn.dataset.index);
    const arr = loadLogs(); // 不动 logs，这里只删产品
    let ps = loadProducts();
    const removed = ps.splice(idx,1)[0];
    saveProducts(ps);
    showToast('已删除 '+(removed?removed.name:'产品'));
    renderProducts();
    renderStats(); // 更新按类型统计
  };
}

function bindAddProduct(){
  const btn = $('#addProductBtn');
  if(!btn) return;
  btn.addEventListener('click', ()=>{
    const name = $('#pname').value.trim();
    const type = $('#ptype').value;
    const use = $('#puse').value;
    if(!name){
      showToast('请输入产品名');
      return;
    }
    let list = loadProducts();
    if(list.some(p=>p.name===name)){
      showToast('该产品已存在');
      return;
    }
    list.push({name,type,use});
    saveProducts(list);
    $('#pname').value='';
    showToast('已添加到产品库');
    renderProducts();
  });
}

// ============= 历史记录 =============
function renderHistory(){
  const box = $('#historyList');
  if(!box) return;
  const logs = loadLogs().slice().sort((a,b)=>{
    if(a.date===b.date) return (a.part==='am'?0:1)-(b.part==='am'?0:1);
    return a.date>b.date?-1:1;
  });
  if(logs.length===0){
    box.innerHTML = '<p style="color:#6c8b74;">暂无记录。</p>';
    return;
  }
  box.innerHTML = '';
  logs.forEach((l, idx)=>{
    const wrap = document.createElement('div');
    wrap.className='history-item';
    const partLabel = l.part==='am'?'早':'晚';
    wrap.innerHTML = `
      <div style="padding:10px 10px 8px;margin-bottom:8px;border-radius:18px;background:#e5f4e8;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong>${l.date} ${partLabel}</strong>
          <button class="btn-sm" data-index="${idx}">删除</button>
        </div>
        <div>产品：${l.products||'未填写'}</div>
        <div>感受：${l.feelings||'未填写'}</div>
        <div>状态：${l.skin||'未填写'}</div>
        ${l.note?`<div>备注：${l.note}</div>`:''}
      </div>
    `;
    box.appendChild(wrap);
  });

  box.onclick = (e)=>{
    const btn = e.target.closest('.btn-sm');
    if(!btn) return;
    const idx = Number(btn.dataset.index);
    let logs = loadLogs();
    const removed = logs.splice(idx,1)[0];
    saveLogs(logs);
    showToast('已删除一条记录');
    renderHistory();
    renderStats();
  };
}

// ============= 统计 =============
function inRange(log, range){
  const d = new Date(log.date+'T00:00:00');
  if(isNaN(d)) return false;
  const today = new Date();
  today.setHours(0,0,0,0);
  const start = new Date(today);

  if(range === '30'){
    start.setDate(today.getDate()-29);
  }else if(range === 'week'){
    const day = today.getDay() || 7;
    start.setDate(today.getDate()-day+1);
  }else if(range === 'month'){
    start.setDate(1);
  }else{
    return true;
  }

  return d>=start && d<=today;
}

function renderStats(){
  const logs = loadLogs();
  const rangeBtn = $('#rangeSeg .active');
  const range = rangeBtn ? rangeBtn.dataset.range : '30';
  const filtered = logs.filter(l=>inRange(l, range));
  const summary = $('#statsSummary');
  summary.textContent = `时间范围内有记录的天数：${new Set(filtered.map(l=>l.date)).size} 天；记录总数：${filtered.length} 条。`;

  const products = loadProducts();

  // 按产品
  const byProduct = {};
  filtered.forEach(l=>{
    const names = (l.products||'').split(/、|,|\s+/).filter(Boolean);
    names.forEach(n=>{
      byProduct[n] = (byProduct[n]||0)+1;
    });
  });
  const bpBox = $('#statsByProduct');
  if(Object.keys(byProduct).length===0){
    bpBox.innerHTML = '<p style="color:#6c8b74;">暂无产品统计。</p>';
  }else{
    bpBox.innerHTML = '<h3 style="margin:8px 0 4px;font-size:16px;">按产品统计</h3>';
    Object.keys(byProduct).sort().forEach(name=>{
      const div = document.createElement('div');
      div.style.margin = '2px 0';
      div.textContent = `${name}：${byProduct[name]} 次`;
      bpBox.appendChild(div);
    });
  }

  // 按产品类型
  const byType = {};
  filtered.forEach(l=>{
    const names = (l.products||'').split(/、|,|\s+/).filter(Boolean);
    names.forEach(n=>{
      const p = products.find(p=>p.name===n);
      const t = p ? p.type : '其他';
      byType[t] = (byType[t]||0)+1;
    });
  });
  const btBox = $('#statsByType');
  if(Object.keys(byType).length===0){
    btBox.innerHTML = '';
  }else{
    btBox.innerHTML = '<h3 style="margin:10px 0 4px;font-size:16px;">按产品类型统计</h3>';
    Object.keys(byType).sort().forEach(t=>{
      const div = document.createElement('div');
      div.style.margin = '2px 0';
      div.textContent = `${t}：${byType[t]} 次`;
      btBox.appendChild(div);
    });
  }
}

function bindRange(){
  const seg = $('#rangeSeg');
  if(!seg) return;
  seg.addEventListener('click', e=>{
    const btn = e.target.closest('button');
    if(!btn) return;
    $all('#rangeSeg button').forEach(b=>b.classList.toggle('active', b===btn));
    renderStats();
  });
}

// ============= 初始化 =============
document.addEventListener('DOMContentLoaded', ()=>{
  bindTabs();
  initDate();
  bindSeg('#timeSeg');
  bindChips('#feelChips', true);
  bindChips('#skinChips', true);
  bindProductChipsInputSync();
  bindSave();
  bindAddProduct();
  bindRange();
  renderProducts();
  renderHistory();
  renderStats();
});
