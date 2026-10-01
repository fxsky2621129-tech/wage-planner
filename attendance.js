(()=>{
  'use strict';
  const E=WageEngine,$=id=>document.getElementById(id),key='personal-wage-attendance-v1';
  const money=n=>(Math.ceil(n-1e-7)||0).toLocaleString('ja-JP')+'円';
  const time=h=>{const min=Math.round(h*60);return Math.floor(min/60)+'時間'+String(min%60).padStart(2,'0')+'分';};
  let records={},config,report,plan,month=9,entryYear=2026;
  try{const saved=JSON.parse(localStorage.getItem(key)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))records=saved;}catch{}
  const picker=$('entry-month');
  for(let i=2026*12+9;i<=2029*12+2;i++){const y=Math.floor(i/12),m=i%12,option=document.createElement('option');option.value=y+'-'+String(m+1).padStart(2,'0');option.textContent=y+'年'+(m+1)+'月';picker.append(option);}
  try{const saved=localStorage.getItem('personal-wage-attendance-month');if([...picker.options].some(o=>o.value===saved)){const [y,m]=saved.split('-').map(Number);entryYear=y;month=m-1;}}catch{}
  picker.value=entryYear+'-'+String(month+1).padStart(2,'0');
  function entryConfig(){return {...config,year:entryYear};}
  function monthLabel(){return entryYear+'年'+(month+1)+'月';}

  function inputCell(tr,input){const td=document.createElement('td');td.append(input);tr.append(td);}
  function input(row,name,type,label,value){const el=document.createElement('input');el.type=type;el.dataset.date=row;el.dataset.field=name;el.setAttribute('aria-label',row+' '+label);if(type==='checkbox')el.checked=!!value;else el.value=value??'';if(type==='number'){el.min='0';el.step=name==='night'?'0.25':'1';el.max=name==='night'?'24':'1440';}return el;}
  function draw(){
    const tbody=$('attendance-rows');tbody.replaceChildren();
    for(const day of E.calendar(entryConfig()).days.filter(d=>d.month===month)){
      const id=entryYear+'-'+day.key,row=records[id]||{},type=row.type||(day.paid?'paid':day.rest?'off':'work'),tr=document.createElement('tr');
      tr.dataset.date=id;const td=document.createElement('td');td.textContent=day.date.getUTCDate()+'日（'+'日月火水木金土'[day.date.getUTCDay()]+'）';tr.append(td);
      const select=document.createElement('select');select.dataset.date=id;select.dataset.field='type';select.setAttribute('aria-label',id+' 区分');for(const [value,text]of [['work','勤務'],['off','休み'],['paid','有給'],['holiday','法定休日勤務']]){const o=document.createElement('option');o.value=value;o.textContent=text;select.append(o);}select.value=type;inputCell(tr,select);
      inputCell(tr,input(id,'start','time','始業',row.start));inputCell(tr,input(id,'end','time','終業',row.end));inputCell(tr,input(id,'next','checkbox','終業は翌日',row.next));inputCell(tr,input(id,'pause','number','休憩分',row.pause??config.breakHours*60));inputCell(tr,input(id,'night','number','深夜実労働時間',row.night??0));
      for(const field of ['labor','ot']){const cell=document.createElement('td');cell.dataset.result=field;cell.textContent='—';tr.append(cell);}
      tbody.append(tr);setDisabled(tr,type);
    }
    refresh();
  }
  function setDisabled(tr,type){for(const el of tr.querySelectorAll('input'))el.disabled=type==='off'||type==='paid';}
  function refresh(){
    const selected=entryConfig();plan=E.calculate(selected);report=E.actualAttendance(selected,records);const m=report.months[month];
    const p=plan.monthly[month];
    const noPremium=E.noPremiumCapacity(config);
    $('no-premium-title').textContent='日給 '+money(config.daily)+' 以内：割増なしの最大残業時間';
    $('no-premium-daily').textContent=noPremium===null?'日給が不足しています':time(noPremium);
    $('no-premium-daily-cost').textContent=noPremium===null?'所定労働分の賃金を賄えません。':'通常時給だけでの日額 '+money(report.rate*(config.standard+noPremium));
    $('no-premium-month-title').textContent=monthLabel()+'末の合計（割増なしの仮定）';
    $('no-premium-month-ot').textContent=noPremium===null?'—':'追加労働 '+time(noPremium*p.work);
    $('no-premium-month-labor').textContent=noPremium===null?'—':'実労働合計 '+time((config.standard+noPremium)*p.work);
    $('no-premium-month-days').textContent='計画上の出勤 '+p.work+'日 × 1日の最大時間';
    $('plan-month-days-label').textContent=monthLabel()+'の計画上の出勤';
    $('plan-month-ot-label').textContent=monthLabel()+'の法定時間外';
    $('plan-month-bound-label').textContent=monthLabel()+'の拘束時間';
    $('plan-month-days').textContent=p.work+'日';
    $('plan-month-days-detail').textContent='公休 '+p.rest+'日・有給 '+p.paid+'日';
    $('plan-month-ot').textContent=p.ot.toLocaleString('ja-JP',{maximumFractionDigits:1})+' h';
    $('plan-month-bound').textContent=p.bound.toLocaleString('ja-JP',{maximumFractionDigits:1})+' h';
    $('plan-month-bound-detail').textContent='試算上限 '+(config.extension?310:284)+'時間';
    for(const tr of $('attendance-rows').children){const d=report.days.find(x=>x.id===tr.dataset.date);for(const field of ['labor','ot'])tr.querySelector('[data-result="'+field+'"]').textContent=d.error?'入力確認':d.missing?'未入力':time(d[field]);tr.classList.toggle('entry-error',!!d.error);}
    $('month-summary-title').textContent=monthLabel()+'末の合計'+(m.errors?'（エラー行を除く暫定値）':'');
    for(const [id,value]of Object.entries({'actual-labor':time(m.labor),'actual-bound':time(m.bound),'actual-ot':time(m.ot),'actual-days':m.work+'日','actual-low':time(m.low),'actual-high':time(m.high),'actual-low-premium':money(m.lowPremium),'actual-high-premium':money(m.highPremium),'actual-low-pay':money(m.lowPay),'actual-high-pay':money(m.highPay)}))$(id).textContent=value;
    $('actual-other').textContent='基礎時給 '+money(report.rate)+' ／ 深夜加算 '+money(m.nightPremium)+' ／ 法定休日加算 '+money(m.holidayPremium)+' ／ 有給 '+m.paid+'日';
    $('attendance-status').textContent=(entryYear>=2028?'2028年以降の祝日は暫定日程です。 ':'')+'未入力の勤務日 '+m.missing+'日。休日・有給の区分は左の予定を初期値としているため、実績に合わせて変更してください。';
    $('attendance-errors').replaceChildren();for(const e of report.errors.filter(x=>x.id.startsWith(picker.value+'-'))){const p=document.createElement('p');p.className='negative';p.textContent=e.id+'：'+e.message;$('attendance-errors').append(p);}
  }
  function edit(event){
    const el=event.target;if(!el.dataset.field||!config)return;
    const id=el.dataset.date;records[id]={...(records[id]||{}),[el.dataset.field]:el.type==='checkbox'?el.checked:el.value};
    if(el.dataset.field==='type')setDisabled(el.closest('tr'),el.value);
    refresh();
    try{localStorage.setItem(key,JSON.stringify(records));}catch{$('attendance-status').textContent+=' 実績を保存できません。このブラウザーの保存設定を確認してください。';}
  }
  $('attendance-rows').addEventListener('input',edit);picker.addEventListener('change',()=>{const [y,m]=picker.value.split('-').map(Number);entryYear=y;month=m-1;try{localStorage.setItem('personal-wage-attendance-month',picker.value);}catch{}draw();});
  window.Attendance={update(c){config=c;draw();},result(){return report;},config(){return entryConfig();}};
})();
