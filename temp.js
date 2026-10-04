
/* ══════════════════════════════════════════
   GLOBALS & HELPERS
══════════════════════════════════════════ */
const defaultCompany = {name:'THE LABEL',addr:'123 Main Street, City',phone:'+94 77 000 0000',tax:'NTN: 0000000-0', footer: 'Thank you! Please come again.'};
const settings = JSON.parse(localStorage.getItem('pos_settings')) || defaultCompany;
const COMPANY = {
    name: settings.name || defaultCompany.name,
    addr: settings.address || defaultCompany.addr,
    phone: settings.phone || defaultCompany.phone,
    tax: settings.tax || defaultCompany.tax,
    footer: settings.footer || defaultCompany.footer,
    logo: settings.logo || '',
    currency: settings.currency || 'LKR'
};
const fmt=(n,d=0)=>'LKR '+Number(n||0).toLocaleString('en-PK',{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtNum=n=>Number(n||0).toLocaleString('en-PK');
const todayStr=()=>new Date().toISOString().slice(0,10);
const monthStr=()=>new Date().toISOString().slice(0,7);

function loadData(){
  let sales=[];
  try{sales=JSON.parse(localStorage.getItem('pos_sales_data')||'[]')}catch(e){}
  let products={};
  try{products=JSON.parse(localStorage.getItem('pos_products_db')||'{}')}catch(e){}
  let customers={};
  try{customers=JSON.parse(localStorage.getItem('pos_customers_db')||'{}')}catch(e){}
  return{sales,products,customers};
}

function getDue(b){
  const paid=(+b.cash||0)+(+b.card||0)+(+b.cheque||0);
  return Math.max(0,(+b.total||0)-paid);
}
function getProfit(b){
  return (b.items||[]).reduce((s,it)=>{
    const sp=+it.sale||+it.price||0;
    const cp=+it.cost||+it.buyPrice||0;
    return s+(sp-cp)*(+it.qty||0);
  },0)-(+b.discount||0);
}

function billsForDate(sales,date){
  return sales.filter(b=>b.datetime&&b.datetime.slice(0,10)===date);
}
function billsForMonth(sales,month){
  return sales.filter(b=>b.datetime&&b.datetime.slice(0,7)===month);
}

function statCard(icon,label,value,cls,sub=''){
  return`<div class="stat-card ${cls}">
    <div class="icon"><i class="${icon}"></i></div>
    <div class="label">${label}</div>
    <div class="value">${value}</div>
    ${sub?`<div class="sub">${sub}</div>`:''}
  </div>`;
}

function payFlow(cash,card,cheque,credit){
  const total=cash+card+cheque+credit||1;
  const items=[
    {name:'Cash',val:cash,pct:Math.round(cash/total*100),color:'#10b981'},
    {name:'Card',val:card,pct:Math.round(card/total*100),color:'#3b82f6'},
    {name:'Cheque',val:cheque,pct:Math.round(cheque/total*100),color:'#6366f1'},
    {name:'Credit Due',val:credit,pct:Math.round(credit/total*100),color:'#ef4444'},
  ];
  return items.map(i=>`<div class="pay-box">
    <div class="pay-pct" style="color:${i.color}">${i.pct}%</div>
    <div class="pay-name">${i.name}</div>
    <div class="pay-amt" style="color:${i.color}">${fmt(i.val)}</div>
    <div class="pay-bar"><div class="pay-bar-fill" style="width:${i.pct}%;background:${i.color}"></div></div>
  </div>`).join('');
}

function topProductsFromBills(bills,limit=5){
  const map={};
  bills.forEach(b=>(b.items||[]).forEach(it=>{
    const k=it.name||it.id||'?';
    if(!map[k])map[k]={name:k,qty:0,rev:0};
    map[k].qty+=(+it.qty||0);
    map[k].rev+=(+it.qty||0)*(+it.sale||+it.price||0);
  }));
  return Object.values(map).sort((a,b)=>b.qty-a.qty).slice(0,limit);
}

function barChartHtml(items,colorClass=''){
  if(!items.length)return'<div class="empty-state"><i class="fa-solid fa-chart-bar"></i><p>No data</p></div>';
  const max=Math.max(...items.map(i=>i.qty||i.rev||0),1);
  return items.map(i=>{
    const val=i.qty||i.rev||0;
    const pct=Math.round(val/max*100);
    return`<div class="bar-row">
      <div class="bar-label">${i.name}</div>
      <div class="bar-track"><div class="bar-fill ${colorClass}" style="width:${pct}%">${pct>15?'×'+fmtNum(i.qty||0):''}</div></div>
      <div class="bar-val">${i.qty!==undefined?'×'+fmtNum(i.qty):fmt(i.rev)}</div>
    </div>`;
  }).join('');
}

function rankedListHtml(items,valFn,subFn,colorClass=''){
  const colors=['gold','silver','bronze'];
  const max=Math.max(...items.map(valFn),1);
  return items.map((it,i)=>{
    const val=valFn(it);
    const pct=Math.round(val/max*100);
    return`<div class="rank-item">
      <div class="rank-no ${colors[i]||''}">${i+1}</div>
      <div class="rank-info">
        <div class="rname">${it.name}</div>
        <div class="rbar-track"><div class="rbar-fill ${colorClass}" style="width:${pct}%;${colorClass?'background:linear-gradient(90deg,var(--green),#059669)':''}"></div></div>
      </div>
      <div class="rank-stats">
        <div class="rval">${fmt(val)}</div>
        <div class="rsub">${subFn(it)}</div>
      </div>
    </div>`;
  }).join('');
}

function actionBtns(bill,small=true){
  const s=small?'btn-sm':'';
  const due=getDue(bill);
  const wa=bill.customerPhone?`<button class="btn btn-green ${s}" onclick="whatsAppBill('${bill.id}')"><i class="fa-brands fa-whatsapp"></i></button>`:'';
  return`<div style="display:flex;gap:5px;flex-wrap:wrap">
    <button class="btn btn-primary ${s}" onclick="openInvoice('${bill.id}')"><i class="fa-solid fa-file-invoice"></i></button>
    ${wa}
  </div>`;
}

function methodBadges(bill){
  const b=[];
  if(+bill.cash>0)b.push(`<span class="badge badge-green">Cash ${fmt(bill.cash)}</span>`);
  if(+bill.card>0)b.push(`<span class="badge badge-blue">Card ${fmt(bill.card)}</span>`);
  if(+bill.cheque>0)b.push(`<span class="badge badge-purple">Chq ${fmt(bill.cheque)}</span>`);
  const d=getDue(bill);
  if(d>0)b.push(`<span class="badge badge-red">Due ${fmt(d)}</span>`);
  return b.join(' ');
}

let currentBillId=null;

/* ══════════════════════════════════════════
   TAB SWITCHER
══════════════════════════════════════════ */
function switchTab(id,btn){
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('pane-'+id).classList.add('active');
  btn.classList.add('active');
  const renderers={today:renderToday,dayend:renderDayEnd,monthly:renderMonthly,credit:renderCredit,products:renderProducts,invoices:renderInvoices,barcodes:renderBarcodes};
  if(renderers[id])renderers[id]();
}

/* ══════════════════════════════════════════
   TAB 1: TODAY'S SALES
══════════════════════════════════════════ */
function renderToday(){
  const {sales}=loadData();
  const date=document.getElementById('today-date').value||todayStr();
  document.getElementById('today-date').value=date;
  const bills=billsForDate(sales,date);

  let revenue=0,cash=0,card=0,cheque=0,credit=0,profit=0,grossRev=0;
  bills.forEach(b=>{
    revenue+=(+b.total||0);
    grossRev+=(+b.total||0)+(+b.discount||0);
    cash+=(+b.cash||0);
    card+=(+b.card||0);
    cheque+=(+b.cheque||0);
    credit+=getDue(b);
    profit+=getProfit(b);
  });

  document.getElementById('today-stats').innerHTML=
    statCard('fa-solid fa-sack-dollar','Total Revenue',fmt(revenue),'ac-blue',`${bills.length} bills`)+
    statCard('fa-solid fa-hand-holding-dollar','Net Collected',fmt(cash+card+cheque),'ac-green','Cash+Card+Cheque')+
    statCard('fa-solid fa-money-bill-wave','Cash',fmt(cash),'ac-cyan','')+
    statCard('fa-solid fa-credit-card','Card',fmt(card),'ac-indigo','')+
    statCard('fa-solid fa-money-check','Cheque',fmt(cheque),'ac-purple','')+
    statCard('fa-solid fa-triangle-exclamation','Credit Due',fmt(credit),'ac-red','Outstanding dues')+
    statCard('fa-solid fa-chart-line','Gross Profit',fmt(profit),'ac-yellow',`Margin ${revenue?Math.round(profit/revenue*100):0}%`);

  document.getElementById('today-pay-flow').innerHTML=payFlow(cash,card,cheque,credit);

  const top5=topProductsFromBills(bills,5);
  document.getElementById('today-top-products').innerHTML=barChartHtml(top5);

  const tbody=document.getElementById('today-tx-body');
  document.getElementById('today-tx-count').textContent=bills.length+' bills';
  if(!bills.length){tbody.innerHTML=`<tr><td colspan="12"><div class="empty-state"><i class="fa-solid fa-receipt"></i><p>No transactions for this date</p></div></td></tr>`;return;}
  tbody.innerHTML=bills.slice().reverse().map(b=>{
    const due=getDue(b);
    const time=b.datetime?b.datetime.slice(11,16):'';
    const itemCount=(b.items||[]).reduce((s,i)=>s+(+i.qty||0),0);
    const gross=(+b.total||0)+(+b.discount||0);
    return`<tr>
      <td><span class="badge badge-blue">${b.id||'—'}</span></td>
      <td>${time}</td>
      <td>${b.customer||'Walk-in'}</td>
      <td><span class="badge badge-gray">${fmtNum(itemCount)} pcs</span></td>
      <td>${fmt(gross)}</td>
      <td>${+b.discount>0?`<span class="badge badge-yellow">${fmt(b.discount)}</span>`:'—'}</td>
      <td><strong>${fmt(b.total)}</strong></td>
      <td>${+b.cash>0?fmt(b.cash):'—'}</td>
      <td>${+b.card>0?fmt(b.card):'—'}</td>
      <td>${+b.cheque>0?fmt(b.cheque):'—'}</td>
      <td>${due>0?`<span class="badge badge-red">${fmt(due)}</span>`:'<span class="badge badge-green">Paid</span>'}</td>
      <td>${actionBtns(b)}</td>
    </tr>`;
  }).join('');
}

/* ══════════════════════════════════════════
   TAB 2: DAY END
══════════════════════════════════════════ */
function renderDayEnd(){
  const {sales}=loadData();
  const date=document.getElementById('dayend-date').value||todayStr();
  document.getElementById('dayend-date').value=date;
  const bills=billsForDate(sales,date);

  let revenue=0,cash=0,card=0,cheque=0,credit=0,profit=0,gross=0,disc=0;
  bills.forEach(b=>{
    revenue+=(+b.total||0);
    gross+=(+b.total||0)+(+b.discount||0);
    disc+=(+b.discount||0);
    cash+=(+b.cash||0);
    card+=(+b.card||0);
    cheque+=(+b.cheque||0);
    credit+=getDue(b);
    profit+=getProfit(b);
  });
  const collected=cash+card+cheque;

  document.getElementById('dayend-stats').innerHTML=
    statCard('fa-solid fa-receipt','Total Bills',bills.length,'ac-blue','invoices today')+
    statCard('fa-solid fa-sack-dollar','Gross Revenue',fmt(gross),'ac-indigo','before discounts')+
    statCard('fa-solid fa-tag','Discounts Given',fmt(disc),'ac-yellow','total discounts')+
    statCard('fa-solid fa-hand-holding-dollar','Net Revenue',fmt(revenue),'ac-green','after discounts')+
    statCard('fa-solid fa-money-bill-wave','Cash Collected',fmt(cash),'ac-cyan','')+
    statCard('fa-solid fa-credit-card','Card Payments',fmt(card),'ac-purple','')+
    statCard('fa-solid fa-triangle-exclamation','Credit Due',fmt(credit),'ac-red','outstanding')+
    statCard('fa-solid fa-chart-line','Net Profit',fmt(profit),'ac-green',`Margin ${revenue?Math.round(profit/revenue*100):0}%`);

  document.getElementById('dayend-pay-flow').innerHTML=payFlow(cash,card,cheque,credit);

  const total=cash+card+cheque+credit||1;
  const barItems=[
    {name:'Cash',qty:cash,rev:cash,color:'bar-fill-green'},
    {name:'Card',qty:card,rev:card,color:'bar-fill-blue'},
    {name:'Cheque',qty:cheque,rev:cheque,color:'bar-fill-purple'},
    {name:'Credit Due',qty:credit,rev:credit,color:'bar-fill-red'},
  ];
  const maxV=Math.max(cash,card,cheque,credit,1);
  document.getElementById('dayend-bar-chart').innerHTML=barItems.map(i=>`
    <div class="bar-row">
      <div class="bar-label">${i.name}</div>
      <div class="bar-track"><div class="bar-fill ${i.color}" style="width:${Math.round(i.rev/maxV*100)}%">${Math.round(i.rev/total*100)>10?Math.round(i.rev/total*100)+'%':''}</div></div>
      <div class="bar-val">${fmt(i.rev)}</div>
    </div>`).join('');

  const tbody=document.getElementById('dayend-bill-body');
  document.getElementById('dayend-bill-count').textContent=bills.length+' bills';
  if(!bills.length){tbody.innerHTML=`<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-moon"></i><p>No bills for this date</p></div></td></tr>`;return;}
  tbody.innerHTML=bills.slice().reverse().map(b=>{
    const due=getDue(b);
    const time=b.datetime?b.datetime.slice(11,16):'';
    return`<tr>
      <td><span class="badge badge-indigo">${b.id||'—'}</span></td>
      <td>${time}</td>
      <td>${b.customer||'Walk-in'}</td>
      <td><strong>${fmt(b.total)}</strong></td>
      <td>${methodBadges(b)}</td>
      <td>${due>0?`<span class="badge badge-red">${fmt(due)}</span>`:'<span class="badge badge-green">Paid</span>'}</td>
      <td>${actionBtns(b)}</td>
    </tr>`;
  }).join('');
}

/* ══════════════════════════════════════════
   TAB 3: MONTHLY
══════════════════════════════════════════ */
function renderMonthly(){
  const {sales}=loadData();
  const month=document.getElementById('monthly-month').value||monthStr();
  document.getElementById('monthly-month').value=month;
  const bills=billsForMonth(sales,month);

  let revenue=0,cash=0,card=0,cheque=0,credit=0,profit=0;
  bills.forEach(b=>{
    revenue+=(+b.total||0);
    cash+=(+b.cash||0);
    card+=(+b.card||0);
    cheque+=(+b.cheque||0);
    credit+=getDue(b);
    profit+=getProfit(b);
  });

  document.getElementById('monthly-stats').innerHTML=
    statCard('fa-solid fa-receipt','Total Bills',bills.length,'ac-blue','')+
    statCard('fa-solid fa-sack-dollar','Total Revenue',fmt(revenue),'ac-indigo','')+
    statCard('fa-solid fa-hand-holding-dollar','Net Collected',fmt(cash+card+cheque),'ac-green','')+
    statCard('fa-solid fa-chart-line','Net Profit',fmt(profit),'ac-yellow',`Margin ${revenue?Math.round(profit/revenue*100):0}%`)+
    statCard('fa-solid fa-triangle-exclamation','Credit Due',fmt(credit),'ac-red','')+
    statCard('fa-solid fa-calendar-day','Avg/Day',fmt(revenue/(new Date(month.slice(0,4),+month.slice(5,7),0).getDate())),'ac-cyan','');

  // daily breakdown
  const dayMap={};
  bills.forEach(b=>{
    const d=b.datetime?b.datetime.slice(0,10):'';
    if(!d)return;
    if(!dayMap[d])dayMap[d]={bills:0,revenue:0,cash:0,card:0,cheque:0,credit:0,profit:0};
    dayMap[d].bills++;
    dayMap[d].revenue+=(+b.total||0);
    dayMap[d].cash+=(+b.cash||0);
    dayMap[d].card+=(+b.card||0);
    dayMap[d].cheque+=(+b.cheque||0);
    dayMap[d].credit+=getDue(b);
    dayMap[d].profit+=getProfit(b);
  });
  const days=Object.keys(dayMap).sort().reverse();
  const tbody=document.getElementById('monthly-daily-body');
  if(!days.length){tbody.innerHTML=`<tr><td colspan="9"><div class="empty-state"><i class="fa-solid fa-calendar"></i><p>No data for this month</p></div></td></tr>`;}
  else{
    tbody.innerHTML=days.map(d=>{
      const x=dayMap[d];
      const margin=x.revenue?Math.round(x.profit/x.revenue*100):0;
      return`<tr>
        <td><strong>${d}</strong></td>
        <td><span class="badge badge-blue">${x.bills}</span></td>
        <td>${fmt(x.revenue)}</td>
        <td>${fmt(x.cash)}</td>
        <td>${fmt(x.card)}</td>
        <td>${fmt(x.cheque)}</td>
        <td>${fmt(x.profit)}</td>
        <td><span class="badge ${margin>=30?'badge-green':margin>=15?'badge-yellow':'badge-red'}">${margin}%</span></td>
        <td>${x.credit>0?`<span class="badge badge-red">${fmt(x.credit)}</span>`:'—'}</td>
      </tr>`;
    }).join('');
  }

  // top products
  const top=topProductsFromBills(bills,8);
  const maxQ=Math.max(...top.map(t=>t.qty),1);
  document.getElementById('monthly-top-products').innerHTML=top.length?rankedListHtml(top,t=>t.rev,t=>`×${fmtNum(t.qty)} sold`):'<div class="empty-state"><i class="fa-solid fa-box"></i><p>No data</p></div>';
}

/* ══════════════════════════════════════════
   TAB 4: CREDIT REPORT
══════════════════════════════════════════ */
function renderCredit(){
  const {sales}=loadData();
  const creditBills=sales.filter(b=>getDue(b)>0);

  // aggregate by customer
  const custMap={};
  creditBills.forEach(b=>{
    const k=b.customer||'Walk-in';
    if(!custMap[k])custMap[k]={name:k,phone:b.customerPhone||'',bills:0,totalPurchase:0,totalPaid:0,outstanding:0,lastDate:''};
    custMap[k].bills++;
    custMap[k].totalPurchase+=(+b.total||0);
    custMap[k].totalPaid+=(+b.cash||0)+(+b.card||0)+(+b.cheque||0);
    custMap[k].outstanding+=getDue(b);
    if(!custMap[k].lastDate||b.datetime>custMap[k].lastDate)custMap[k].lastDate=b.datetime?b.datetime.slice(0,10):'';
  });
  const custs=Object.values(custMap).sort((a,b)=>b.outstanding-a.outstanding);
  const totalOuts=custs.reduce((s,c)=>s+c.outstanding,0);
  const avgPer=custs.length?totalOuts/custs.length:0;
  const now=new Date();
  const overdue=custs.filter(c=>{
    if(!c.lastDate)return false;
    const d=new Date(c.lastDate);
    return(now-d)/(86400000)>=30;
  });

  document.getElementById('credit-stats').innerHTML=
    statCard('fa-solid fa-users','Customers w/ Credit',custs.length,'ac-blue','')+
    statCard('fa-solid fa-triangle-exclamation','Total Outstanding',fmt(totalOuts),'ac-red','')+
    statCard('fa-solid fa-clock-rotate-left','Overdue 30d+',overdue.length,'ac-yellow','customers')+
    statCard('fa-solid fa-calculator','Avg per Customer',fmt(avgPer),'ac-purple','');

  // overdue table
  const odbody=document.getElementById('credit-overdue-body');
  if(!overdue.length)odbody.innerHTML=`<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-check-circle" style="color:var(--green)"></i><p>No overdue accounts</p></div></td></tr>`;
  else odbody.innerHTML=overdue.map(c=>`<tr>
    <td><strong>${c.name}</strong></td>
    <td>${c.phone||'—'}</td>
    <td>${c.lastDate||'—'}</td>
    <td><span class="badge badge-red">${fmt(c.outstanding)}</span></td>
    <td>${c.phone?`<a href="https://wa.me/${c.phone.replace(/\D/g,'')}" target="_blank" class="btn btn-green btn-sm"><i class="fa-brands fa-whatsapp"></i></a>`:''}</td>
  </tr>`).join('');

  // recent credit sales
  const recent=creditBills.slice().sort((a,b)=>b.datetime>a.datetime?1:-1).slice(0,8);
  const rcbody=document.getElementById('credit-recent-body');
  if(!recent.length)rcbody.innerHTML=`<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-receipt"></i><p>No credit sales</p></div></td></tr>`;
  else rcbody.innerHTML=recent.map(b=>`<tr>
    <td><span class="badge badge-blue">${b.id||'—'}</span></td>
    <td>${b.datetime?b.datetime.slice(0,10):'—'}</td>
    <td>${b.customer||'Walk-in'}</td>
    <td>${fmt(b.total)}</td>
    <td><span class="badge badge-red">${fmt(getDue(b))}</span></td>
  </tr>`).join('');

  // full table
  const cbody=document.getElementById('credit-customer-body');
  if(!custs.length)cbody.innerHTML=`<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-user-check"></i><p>No outstanding credit</p></div></td></tr>`;
  else cbody.innerHTML=custs.map(c=>`<tr>
    <td><strong>${c.name}</strong></td>
    <td>${c.phone||'—'}</td>
    <td>${fmt(c.totalPurchase)}</td>
    <td>${fmt(c.totalPaid)}</td>
    <td><span class="badge badge-red" style="font-size:.85rem;padding:4px 12px">${fmt(c.outstanding)}</span></td>
    <td><span class="badge badge-gray">${c.bills}</span></td>
    <td><div style="display:flex;gap:5px">
      <button class="btn btn-primary btn-sm" onclick="alert('Settle feature: mark payments in POS')"><i class="fa-solid fa-check"></i> Settle</button>
      ${c.phone?`<a href="https://wa.me/${c.phone.replace(/\D/g,'')}" target="_blank" class="btn btn-green btn-sm"><i class="fa-brands fa-whatsapp"></i></a>`:''}
    </div></td>
  </tr>`).join('');
}

/* ══════════════════════════════════════════
   TAB 5: PRODUCT ANALYSIS
══════════════════════════════════════════ */
function renderProducts(){
  const {sales,products}=loadData();
  const prodMap={};
  sales.forEach(b=>(b.items||[]).forEach(it=>{
    const k=it.id||it.name||'?';
    if(!prodMap[k])prodMap[k]={id:k,name:it.name||k,category:it.category||'General',qty:0,revenue:0,cost:0,profit:0};
    const qty=+it.qty||0;
    const sp=+it.sale||+it.price||0;
    const cp=+it.cost||+it.buyPrice||0;
    prodMap[k].qty+=qty;
    prodMap[k].revenue+=qty*sp;
    prodMap[k].cost+=qty*cp;
    prodMap[k].profit+=qty*(sp-cp);
  }));
  // enrich with product db
  Object.values(prodMap).forEach(p=>{
    const db=products[p.id];
    if(db){p.category=db.category||p.category;p.name=db.name||p.name;}
  });
  const all=Object.values(prodMap).filter(p=>p.qty>0);
  const totalProducts=Object.keys(products).length;
  const totalRevenue=all.reduce((s,p)=>s+p.revenue,0);
  const totalProfit=all.reduce((s,p)=>s+p.profit,0);
  const topMargin=all.length?Math.max(...all.map(p=>p.revenue?Math.round(p.profit/p.revenue*100):0)):0;

  document.getElementById('prod-stats').innerHTML=
    statCard('fa-solid fa-boxes-stacked','Products in DB',totalProducts,'ac-blue','')+
    statCard('fa-solid fa-chart-bar','Products Sold',all.length,'ac-indigo','unique items')+
    statCard('fa-solid fa-sack-dollar','Total Revenue',fmt(totalRevenue),'ac-green','')+
    statCard('fa-solid fa-chart-line','Total Profit',fmt(totalProfit),'ac-yellow',`Best margin ${topMargin}%`);

  const bySales=all.slice().sort((a,b)=>b.qty-a.qty).slice(0,8);
  const byProfit=all.slice().sort((a,b)=>b.profit-a.profit).slice(0,8);

  document.getElementById('prod-top-selling').innerHTML=bySales.length?rankedListHtml(bySales,p=>p.revenue,p=>`×${fmtNum(p.qty)} sold`):'<div class="empty-state"><i class="fa-solid fa-box"></i><p>No data</p></div>';
  document.getElementById('prod-top-profit').innerHTML=byProfit.length?rankedListHtml(byProfit,p=>p.profit,p=>`Margin ${p.revenue?Math.round(p.profit/p.revenue*100):0}%`,'bar-fill-green'):'<div class="empty-state"><i class="fa-solid fa-box"></i><p>No data</p></div>';

  const sorted=all.slice().sort((a,b)=>b.revenue-a.revenue);
  const pbody=document.getElementById('prod-perf-body');
  if(!sorted.length)pbody.innerHTML=`<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-box"></i><p>No sales data</p></div></td></tr>`;
  else pbody.innerHTML=sorted.map((p,i)=>{
    const margin=p.revenue?Math.round(p.profit/p.revenue*100):0;
    return`<tr>
      <td>${i+1}</td>
      <td><strong>${p.name}</strong></td>
      <td><span class="badge badge-gray">${p.category}</span></td>
      <td><span class="badge badge-cyan">×${fmtNum(p.qty)}</span></td>
      <td>${fmt(p.revenue)}</td>
      <td>${fmt(p.cost)}</td>
      <td>${fmt(p.profit)}</td>
      <td><span class="badge ${margin>=30?'badge-green':margin>=15?'badge-yellow':'badge-red'}">${margin}%</span></td>
    </tr>`;
  }).join('');
}

/* ══════════════════════════════════════════
   TAB 6: INVOICES & RECEIPTS
══════════════════════════════════════════ */
function renderInvoices(){
  const {sales}=loadData();
  const q=(document.getElementById('inv-search').value||'').toLowerCase();
  const from=document.getElementById('inv-date-from').value;
  const to=document.getElementById('inv-date-to').value;

  let filtered=sales.filter(b=>{
    if(q&&!(
      (b.id||'').toLowerCase().includes(q)||
      (b.customer||'').toLowerCase().includes(q)||
      (b.customerPhone||'').toLowerCase().includes(q)
    ))return false;
    const d=b.datetime?b.datetime.slice(0,10):'';
    if(from&&d<from)return false;
    if(to&&d>to)return false;
    return true;
  }).slice().sort((a,b)=>b.datetime>a.datetime?1:-1);

  document.getElementById('inv-count').textContent=filtered.length+' invoices';
  const tbody=document.getElementById('inv-body');
  if(!filtered.length){tbody.innerHTML=`<tr><td colspan="11"><div class="empty-state"><i class="fa-solid fa-file-invoice"></i><p>No invoices found</p></div></td></tr>`;return;}
  tbody.innerHTML=filtered.map(b=>{
    const due=getDue(b);
    const itemCount=(b.items||[]).reduce((s,i)=>s+(+i.qty||0),0);
    return`<tr>
      <td><span class="badge badge-blue">${b.id||'—'}</span></td>
      <td>${b.datetime||'—'}</td>
      <td>${b.customer||'Walk-in'}</td>
      <td>${b.customerPhone||'—'}</td>
      <td><span class="badge badge-gray">${fmtNum(itemCount)} pcs</span></td>
      <td><strong>${fmt(b.total)}</strong></td>
      <td>${+b.cash>0?fmt(b.cash):'—'}</td>
      <td>${+b.card>0?fmt(b.card):'—'}</td>
      <td>${+b.cheque>0?fmt(b.cheque):'—'}</td>
      <td>${due>0?`<span class="badge badge-red">${fmt(due)}</span>`:'<span class="badge badge-green">Paid</span>'}</td>
      <td>${actionBtns(b)}</td>
    </tr>`;
  }).join('');
}

/* ══════════════════════════════════════════
   TAB 7: BARCODE LABELS
══════════════════════════════════════════ */
function renderBarcodes(){
  const {products}=loadData();
  const q=(document.getElementById('bc-search').value||'').toLowerCase();
  const allProds=Object.values(products).filter(p=>{
    if(!q)return true;
    return(p.name||'').toLowerCase().includes(q)||(p.id||'').toLowerCase().includes(q)||(p.barcode||'').includes(q);
  });
  const grid=document.getElementById('bc-grid');
  if(!allProds.length){grid.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-barcode"></i><p>No products found</p></div>`;return;}
  grid.innerHTML=allProds.map(p=>`
    <div class="bc-card" id="bcc-${p.id}" onclick="toggleBcSelect('${p.id}')">
      <input type="checkbox" class="bc-check" id="bcchk-${p.id}" onclick="event.stopPropagation();toggleBcSelect('${p.id}')"/>
      <svg id="bc-svg-${p.id}"></svg>
      <div class="bc-name">${p.name||p.id}</div>
      <div class="bc-price">${fmt(+p.salePrice||+p.price||0)}</div>
    </div>`).join('');
  // render barcodes
  allProds.forEach(p=>{
    const code=p.barcode||p.id||'0000000';
    try{
      JsBarcode(`#bc-svg-${p.id}`,String(code),{
        format:'CODE128',width:1.5,height:45,displayValue:true,fontSize:10,margin:2,
        fontOptions:'bold',textAlign:'center',lineColor:'#000',background:'transparent'
      });
    }catch(e){}
  });
}

function toggleBcSelect(id){
  const card=document.getElementById('bcc-'+id);
  const chk=document.getElementById('bcchk-'+id);
  if(!card||!chk)return;
  chk.checked=!chk.checked;
  card.classList.toggle('selected',chk.checked);
}

function selectAllBarcodes(){
  document.querySelectorAll('.bc-check').forEach(chk=>{
    chk.checked=true;
    document.getElementById('bcc-'+chk.id.replace('bcchk-',''))?.classList.add('selected');
  });
}

function printBarcodeLabels(){
  const {products}=loadData();
  const selected=[];
  document.querySelectorAll('.bc-check:checked').forEach(chk=>{
    const id=chk.id.replace('bcchk-','');
    const p=Object.values(products).find(x=>x.id===id||String(x.id)===id);
    if(p)selected.push(p);
  });
  if(!selected.length){alert('Please select at least one product.');return;}
  const pa=document.getElementById('print-area');
  pa.className='mode-labels';
  const labelsDiv=document.getElementById('pa-labels');
      const settings = JSON.parse(localStorage.getItem('pos_settings')) || {};
    const codeWord = settings.codeWord || 'ABCDEFGHIJ';

    labelsDiv.innerHTML = `<div class="label-grid">` + selected.map(p => {
        const costStr = Math.round(+p.buyPrice || +p.cost || 0).toString();
        let costWord = '';
        for (let i = 0; i < costStr.length; i++) {
            const digit = parseInt(costStr[i]);
            const index = digit === 0 ? 9 : digit - 1;
            costWord += (codeWord[index] || '').toLowerCase();
        }
        return 
      `<div class="label-item">
        <div class="lname"> + (p.name||p.id) + </div>
        <svg id="pa-bc- + p.id + " style="height:45px;max-width:100%"></svg>
        <div class="lprice"> + fmt(+p.salePrice||+p.price||0) + </div>
        <div style="font-size:10px; color:#64748b; margin-top:2px;"> + costWord + </div>
      </div>;
    }).join('') + </div>;
  selected.forEach(p=>{
    try{
      JsBarcode(`#pa-bc-${p.id}`,String(p.barcode||p.id||'0'),{
        format:'CODE128',width:1.2,height:40,displayValue:true,fontSize:9,margin:2,lineColor:'#000',background:'transparent'
      });
    }catch(e){}
  });
  setTimeout(()=>{window.print();},300);
}

/* ══════════════════════════════════════════
   INVOICE MODAL
══════════════════════════════════════════ */
function openInvoice(id){
  const {sales}=loadData();
  const bill=sales.find(b=>b.id===id||String(b.id)===String(id));
  if(!bill){alert('Bill not found.');return;}
  currentBillId=id;
  const due=getDue(bill);
  const subtotal=(bill.items||[]).reduce((s,it)=>s+(+it.qty||0)*(+it.sale||+it.price||0),0);

  document.getElementById('modal-title').innerHTML=`<i class="fa-solid fa-file-invoice" style="margin-right:8px;color:var(--indigo)"></i>Invoice #${bill.id}`;

  const itemRows=(bill.items||[]).map(it=>`<tr>
    <td>${it.name||it.id||'—'}</td>
    <td style="text-align:center">${fmtNum(it.qty||0)}</td>
    <td style="text-align:right">${fmt(+it.sale||+it.price||0)}</td>
    <td style="text-align:right"><strong>${fmt((+it.qty||0)*(+it.sale||+it.price||0))}</strong></td>
  </tr>`).join('');

  const bcCode=bill.id||'INV000';

  document.getElementById('modal-body').innerHTML=`
    <div class="inv-header">
        <div>
        ${COMPANY.logo ? `<img src="${COMPANY.logo}" style="max-height:60px; max-width: 150px; margin-bottom: 10px;" alt="Logo"><br>` : ""}
        <div class="inv-company">${COMPANY.name}<small>${COMPANY.addr}<br>${COMPANY.phone} | ${COMPANY.tax}</small></div>
      </div>
      <div class="inv-meta">
        <div class="inv-no">INVOICE #${bill.id}</div>
        <small>Date: ${bill.datetime?bill.datetime.slice(0,10):''}</small><br>
        <small>Time: ${bill.datetime?bill.datetime.slice(11,16):''}</small>
      </div>
    </div>
    <div class="inv-parties">
      <div class="inv-party"><h4>Bill To</h4><p>${bill.customer||'Walk-in Customer'}<br>${bill.customerPhone||''}</p></div>
      <div class="inv-party"><h4>Payment Status</h4><p>${due>0?`<span class="badge badge-red">DUE: ${fmt(due)}</span>`:`<span class="badge badge-green">FULLY PAID</span>`}</p></div>
    </div>
    <div class="inv-table-wrap">
      <table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${itemRows}</tbody></table>
    </div>
    <div class="inv-totals">
      <table>
        <tr><td>Subtotal:</td><td>${fmt(subtotal)}</td></tr>
        ${+bill.discount>0?`<tr><td>Discount:</td><td style="color:var(--red)">- ${fmt(bill.discount)}</td></tr>`:''}
        ${+bill.tax>0?`<tr><td>Tax:</td><td>+ ${fmt(bill.tax)}</td></tr>`:''}
        <tr class="total-row"><td>Grand Total:</td><td>${fmt(bill.total)}</td></tr>
        ${+bill.cash>0?`<tr><td>Cash:</td><td>${fmt(bill.cash)}</td></tr>`:''}
        ${+bill.card>0?`<tr><td>Card:</td><td>${fmt(bill.card)}</td></tr>`:''}
        ${+bill.cheque>0?`<tr><td>Cheque:</td><td>${fmt(bill.cheque)}</td></tr>`:''}
        ${due>0?`<tr class="due-row"><td>Amount Due:</td><td>${fmt(due)}</td></tr>`:''}
      </table>
    </div>
    <div class="inv-bc"><svg id="inv-modal-bc" style="height:50px;max-width:200px"></svg><br><small style="color:var(--sub);font-size:.72rem">${bcCode}</small></div>`;

  try{JsBarcode('#inv-modal-bc',String(bcCode),{format:'CODE128',width:1.5,height:45,displayValue:false,lineColor:'#1e293b',background:'transparent'});}catch(e){}
  document.getElementById('inv-modal').classList.add('open');
}

function closeModal(e){if(e.target===document.getElementById('inv-modal'))document.getElementById('inv-modal').classList.remove('open');}

function printInvoice(){
  const {sales}=loadData();
  const bill=sales.find(b=>String(b.id)===String(currentBillId));
  if(!bill)return;
  const due=getDue(bill);
  const subtotal=(bill.items||[]).reduce((s,it)=>s+(+it.qty||0)*(+it.sale||+it.price||0),0);
  const pa=document.getElementById('print-area');
  pa.className='mode-invoice';
  const div=document.getElementById('pa-invoice');
  const bcCode=String(bill.id||'INV000');
  div.innerHTML=`<style>
    body{font-family:'Outfit',sans-serif;color:#1e293b;margin:0;padding:20px}
    h1{font-size:1.5rem;font-weight:900;margin:0}
    small{font-size:.75rem;color:#64748b}
    table{width:100%;border-collapse:collapse;font-size:.85rem;margin-bottom:16px}
    th{background:#f8fafc;padding:8px 12px;text-align:left;font-size:.75rem;border-bottom:2px solid #e2e8f0}
    td{padding:7px 12px;border-bottom:1px solid #f1f5f9}
    .ttl{font-weight:800;font-size:1rem}
    .due{color:#ef4444;font-weight:800;font-size:1.05rem}
    .header{display:flex;justify-content:space-between;margin-bottom:20px}
    .parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
    .totals{text-align:right} .totals table{margin-left:auto;width:auto}
    .totals td{padding:4px 8px}
    svg{height:45px;max-width:200px}
  </style>
  <div class="header">
    <div><h1>${COMPANY.name}</h1><small>${COMPANY.addr} | ${COMPANY.phone} | ${COMPANY.tax}</small></div>
    <div style="text-align:right"><div style="font-size:1.1rem;font-weight:800;color:#6366f1">INVOICE #${bill.id}</div>
    <small>${bill.datetime||''}</small></div>
  </div>
  <div class="parties">
    <div><strong>Bill To:</strong><br>${bill.customer||'Walk-in'}<br>${bill.customerPhone||''}</div>
    <div><strong>Status:</strong><br>${due>0?`<span style="color:#ef4444;font-weight:700">DUE: LKR ${Number(due).toLocaleString()}</span>`:'<span style="color:#10b981;font-weight:700">PAID IN FULL</span>'}</div>
  </div>
  <table>
    <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${(bill.items||[]).map(it=>`<tr><td>${it.name||it.id}</td><td style="text-align:center">${it.qty}</td><td style="text-align:right">LKR ${Number(+it.sale||+it.price||0).toLocaleString()}</td><td style="text-align:right">LKR ${Number((+it.qty||0)*(+it.sale||+it.price||0)).toLocaleString()}</td></tr>`).join('')}</tbody>
  </table>
  <div class="totals"><table>
    <tr><td>Subtotal:</td><td>LKR ${Number(subtotal).toLocaleString()}</td></tr>
    ${+bill.discount>0?`<tr><td>Discount:</td><td style="color:#ef4444">- LKR ${Number(bill.discount).toLocaleString()}</td></tr>`:''}
    ${+bill.tax>0?`<tr><td>Tax:</td><td>+ LKR ${Number(bill.tax).toLocaleString()}</td></tr>`:''}
    <tr><td class="ttl">Grand Total:</td><td class="ttl">LKR ${Number(bill.total).toLocaleString()}</td></tr>
    ${+bill.cash>0?`<tr><td>Cash:</td><td>LKR ${Number(bill.cash).toLocaleString()}</td></tr>`:''}
    ${+bill.card>0?`<tr><td>Card:</td><td>LKR ${Number(bill.card).toLocaleString()}</td></tr>`:''}
    ${+bill.cheque>0?`<tr><td>Cheque:</td><td>LKR ${Number(bill.cheque).toLocaleString()}</td></tr>`:''}
    ${due>0?`<tr><td class="due">Amount Due:</td><td class="due">LKR ${Number(due).toLocaleString()}</td></tr>`:''}
  </table></div>
  <div style="text-align:center;margin-top:16px">
    <svg id="pa-inv-bc" style="height:45px;max-width:200px"></svg><br>
    <small>${bcCode}</small><br><br>
    <small style="color:#94a3b8">Thank you for your business! | ${COMPANY.name}</small>
  </div>`;
  setTimeout(()=>{
    try{JsBarcode('#pa-inv-bc',bcCode,{format:'CODE128',width:1.5,height:40,displayValue:false,lineColor:'#000',background:'transparent'});}catch(e){}
    window.print();
  },200);
}

function printReceipt(){
  const {sales}=loadData();
  const bill=sales.find(b=>String(b.id)===String(currentBillId));
  if(!bill)return;
  const due=getDue(bill);
  const pa=document.getElementById('print-area');
  pa.className='mode-receipt';
  const div=document.getElementById('pa-receipt');
  div.innerHTML=`<style>
    @media print{body{width:320px;margin:0;font-family:'Courier New',monospace;font-size:12px}}
    body{width:320px;font-family:'Courier New',monospace;font-size:12px;color:#000}
    .rcpt-header{text-align:center;margin-bottom:8px}
    .rcpt-title{font-size:14px;font-weight:900}
    hr{border:none;border-top:2px dashed #000;margin:6px 0}
    table{width:100%;font-size:11px;border-collapse:collapse}
    th,td{padding:2px 3px}
    td:last-child,th:last-child{text-align:right}
    .total-row{font-weight:900;font-size:13px}
    .due-row{font-weight:900;font-size:13px;color:#333}
    .footer{text-align:center;margin-top:10px;font-size:10px}
    svg{height:40px;max-width:100%;display:block;margin:0 auto}
  </style>
  <div class="rcpt-header">
      ${COMPANY.logo ? `<img src="${COMPANY.logo}" style="max-height:50px; max-width: 150px; margin-bottom: 5px;" alt="Logo"><br>` : ""}
      <div class="rcpt-title">${COMPANY.name}</div>
    <div>${COMPANY.addr}</div>
    <div>${COMPANY.phone}</div>
  </div>
  <hr>
  <div>Invoice: #${bill.id} | ${bill.datetime||''}</div>
  <div>Customer: ${bill.customer||'Walk-in'}</div>
  <hr>
  <table>
    <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
    <tbody>${(bill.items||[]).map(it=>`<tr><td>${(it.name||it.id||'').slice(0,14)}</td><td>${it.qty}</td><td>${Number(+it.sale||+it.price||0).toLocaleString()}</td><td>${Number((+it.qty||0)*(+it.sale||+it.price||0)).toLocaleString()}</td></tr>`).join('')}</tbody>
  </table>
  <hr>
  ${+bill.discount>0?`<div>Discount: LKR ${Number(bill.discount).toLocaleString()}</div>`:''}
  ${+bill.tax>0?`<div>Tax: LKR ${Number(bill.tax).toLocaleString()}</div>`:''}
  <div class="total-row">TOTAL: LKR ${Number(bill.total).toLocaleString()}</div>
  ${+bill.cash>0?`<div>Cash: LKR ${Number(bill.cash).toLocaleString()}</div>`:''}
  ${+bill.card>0?`<div>Card: LKR ${Number(bill.card).toLocaleString()}</div>`:''}
  ${+bill.cheque>0?`<div>Cheque: LKR ${Number(bill.cheque).toLocaleString()}</div>`:''}
  ${due>0?`<div class="due-row">DUE: LKR ${Number(due).toLocaleString()}</div>`:'<div>STATUS: PAID</div>'}
  <hr>
  <svg id="pa-rcpt-bc"></svg>
  <div style="text-align:center;font-size:10px">#${bill.id}</div>
  <div class="footer">${COMPANY.footer}<br>${COMPANY.name}</div>`;
  setTimeout(()=>{
    try{JsBarcode('#pa-rcpt-bc',String(bill.id||'0'),{format:'CODE128',width:1.2,height:35,displayValue:false,lineColor:'#000',background:'transparent'});}catch(e){}
    window.print();
  },200);
}

function whatsAppBill(id){
  const {sales}=loadData();
  const bill=sales.find(b=>String(b.id)===String(id));
  if(!bill||!bill.customerPhone)return;
  const due=getDue(bill);
  const msg=encodeURIComponent(`*${COMPANY.name}*\nInvoice #${bill.id}\nDate: ${bill.datetime?bill.datetime.slice(0,10):''}\nCustomer: ${bill.customer||'Walk-in'}\n\n*Items:*\n${(bill.items||[]).map(it=>`${it.name||it.id} x${it.qty} = LKR ${Number((+it.qty||0)*(+it.sale||+it.price||0)).toLocaleString()}`).join('\n')}\n\n*Total: LKR ${Number(bill.total||0).toLocaleString()}*${due>0?`\n⚠️ Amount Due: LKR ${Number(due).toLocaleString()}`:'✅ Fully Paid'}\n\nThank you!`);
  window.open(`https://wa.me/${bill.customerPhone.replace(/\D/g,'')}?text=${msg}`,'_blank');
}

function whatsAppCurrent(){
  if(currentBillId)whatsAppBill(currentBillId);
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('today-date').value=todayStr();
  document.getElementById('dayend-date').value=todayStr();
  document.getElementById('monthly-month').value=monthStr();
  renderToday();

  
});


