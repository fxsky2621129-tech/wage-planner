(()=>{
  'use strict';
  const E=WageEngine,form=document.getElementById('settings'),storageKey='personal-wage-planner-v1';
  const $=id=>document.getElementById(id),numeric=['year','daily','budget','hourly','minimum','standard','overtime','breakHours','night','paidWage','carry'],bools=['holiday','special','extension'];
  const money=n=>(Math.ceil(n-1e-7)||0).toLocaleString('ja-JP')+'円',decimal=n=>n.toLocaleString('ja-JP',{maximumFractionDigits:1}),time=n=>{let mins=Math.round(n*60);return Math.floor(mins/60)+'時間'+String(mins%60).padStart(2,'0')+'分';};
  let current=null,result=null,capacities=[];
  function fill(c){for(const k of Object.keys(E.defaults)){const el=form.elements.namedItem(k);if(bools.includes(k))el.checked=c[k];else el.value=c[k];}}
  function read(){const c={};for(const k of Object.keys(E.defaults)){const el=form.elements.namedItem(k);c[k]=bools.includes(k)?el.checked:numeric.includes(k)?(el.value.trim()===''?NaN:Number(el.value)):el.value;}return c;}
  function cell(row,value,className){let td=document.createElement('td');td.textContent=value;if(className)td.className=className;row.append(td);}
  function render(){
    try{
      const c=read();E.validate(c);const r=E.calculate(c);current=c;result=r;
      $('error').hidden=true;$('result-content').hidden=false;$('csv').disabled=false;
      $('hourly-label').hidden=c.mode==='base';
      $('wage-note').textContent=c.mode==='base'?'基礎時給は「日給 ÷ 所定労働時間」＝ '+money(r.rate)+' / 時。残業・深夜の賃金を別途加算します。':'総額だけでは基礎時給は決まりません。契約上の基本給に対応する時給を入力してください。';
      const dailyCap=E.dailyBudgetCapacity(c);
      $('daily-cap-title').textContent='日給 '+money(c.daily)+' 以内での1日の最大残業時間';
      $('daily-cap').textContent=dailyCap.hours===null?(dailyCap.reason==='no-work'?'出勤日がありません':'日給が不足しています'):time(dailyCap.hours);
      $('daily-cap-sub').textContent=dailyCap.hours===null?'勤務日・日給・基礎時給の条件を確認してください。':'毎日同じ残業時間とし、各出勤日の必要賃金が日給以内に収まる上限（分単位で切り捨て）。';
      $('daily-cap-cost').textContent=dailyCap.hours===null?'—':money(dailyCap.cost);
      $('work-days').textContent=r.total.work+'日';$('day-detail').textContent='公休 '+r.total.rest+'日・有給 '+r.total.paid+'日';$('annual-ot').textContent=decimal(r.total.ot)+' h';$('ot-limit').textContent='試算上限 '+(c.special?960:360)+'時間';$('annual-bound').textContent=decimal(r.total.bound)+' h';$('bound-limit').textContent='試算上限 '+(c.extension?'3,400':'3,300')+'時間';$('daily-bound').textContent=time(r.dailyBound);
      Attendance.update(c);
      try{localStorage.setItem(storageKey,JSON.stringify(c));$('save-status').textContent='✓ この端末のブラウザーに条件を保存しました';}catch{$('save-status').textContent='このブラウザーでは保存できません。計算は利用できます。';}
    }catch(err){current=null;result=null;$('error').textContent=err.message;$('error').hidden=false;$('result-content').hidden=true;$('csv').disabled=true;$('save-status').textContent='入力エラーがあるため保存していません。';}
  }
  let timer;form.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(render,160);});form.addEventListener('submit',e=>e.preventDefault());
  $('reset').addEventListener('click',()=>{fill({...E.defaults});render();});
  $('csv').addEventListener('click',()=>{
    if(!result||!current)return;
    const csv=E.actualCsv(Attendance.config(),Attendance.result());const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='wage-plan-'+Attendance.config().year+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  let c={...E.defaults};try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved){const merged={...c};for(const k of Object.keys(c))if(Object.hasOwn(saved,k))merged[k]=saved[k];E.validate(merged);c=merged;}}catch{}
  fill(c);render();
})();

