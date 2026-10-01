(function(root){
  'use strict';
  const holidays={
    2026:['01-01','01-12','02-11','02-23','03-20','04-29','05-03','05-04','05-05','05-06','07-20','08-11','09-21','09-22','09-23','10-12','11-03','11-23'],
    2027:['01-01','01-11','02-11','02-23','03-21','03-22','04-29','05-03','05-04','05-05','07-19','08-11','09-20','09-23','10-11','11-03','11-23']
  };
  // Future holidays are provisional until official publication.
  for(const year of [2028,2029]){
    const dates=new Set(['01-01','02-11','02-23','03-20','04-29','05-03','05-04','05-05','08-11',year===2028?'09-22':'09-23','11-03','11-23']);
    for(const [month,nth] of [[1,2],[7,3],[9,3],[10,2]]){
      const first=new Date(Date.UTC(year,month-1,1)).getUTCDay();
      dates.add(String(month).padStart(2,'0')+'-'+String(1+(8-first)%7+7*(nth-1)).padStart(2,'0'));
    }
    const original=[...dates];
    for(const md of original){const d=new Date(year+'-'+md+'T00:00:00Z');if(d.getUTCDay()===0){do{d.setUTCDate(d.getUTCDate()+1);}while(dates.has(d.toISOString().slice(5,10)));dates.add(d.toISOString().slice(5,10));}}
    for(let d=new Date(Date.UTC(year,0,2));d.getUTCFullYear()===year;d.setUTCDate(d.getUTCDate()+1)){
      const before=new Date(+d-86400000),after=new Date(+d+86400000);
      if(d.getUTCDay()!==0&&original.includes(before.toISOString().slice(5,10))&&original.includes(after.toISOString().slice(5,10)))dates.add(d.toISOString().slice(5,10));
    }
    holidays[year]=[...dates].sort();
  }
  const defaults={year:2026,daily:19000,budget:418000,mode:'inclusive',hourly:1195,minimum:1195,standard:8,overtime:4,breakHours:1,night:0,paidWage:19000,weekend:'two',holiday:true,special:false,extension:false,carry:0,ranges:'01-01..01-03\n05-02..05-06\n08-13..08-16\n12-27..12-31',paid:'02-02\n04-06\n06-01\n09-07\n11-02'};
  function mdDate(year,s){
    if(!/^\d{2}-\d{2}$/.test(s))throw Error('日付は MM-DD で入力してください：'+s);
    const [m,d]=s.split('-').map(Number),date=new Date(Date.UTC(year,m-1,d));
    if(date.getUTCFullYear()!==year||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)throw Error('存在しない日付です：'+s);
    return date;
  }
  function key(d){return d.toISOString().slice(5,10);}
  function lines(s){return s.split(/[\n,、]/).map(x=>x.trim()).filter(Boolean);}
  function calendar(c){
    const off=new Set();
    for(const row of lines(c.ranges)){
      const parts=row.split('..');if(parts.length>2)throw Error('休日の期間を確認してください：'+row);
      const start=mdDate(c.year,parts[0]),end=mdDate(c.year,parts[1]||parts[0]);
      if(end<start)throw Error('年をまたぐ期間は2行に分けてください：'+row);
      for(let d=new Date(start);d<=end;d.setUTCDate(d.getUTCDate()+1))off.add(key(d));
    }
    const paid=new Set();for(const s of lines(c.paid)){mdDate(c.year,s);paid.add(s);}
    const national=new Set(c.holiday?holidays[c.year]:[]),days=[],ignored=[];
    for(let d=new Date(Date.UTC(c.year,0,1));d.getUTCFullYear()===c.year;d.setUTCDate(d.getUTCDate()+1)){
      const k=key(d),w=d.getUTCDay(),rest=w===0||(c.weekend==='two'&&w===6)||off.has(k)||national.has(k);
      if(rest&&paid.has(k))ignored.push(k);
      days.push({date:new Date(d),key:k,month:d.getUTCMonth(),rest,paid:!rest&&paid.has(k),work:!rest&&!paid.has(k)});
    }return {days,ignored};
  }
  function validate(c){
    if(!holidays[c.year])throw Error('2026年〜2029年を選んでください。');
    const ranges={daily:[0,1000000],budget:[0,10000000],hourly:[1,100000],minimum:[1,100000],standard:[0.25,8],overtime:[0,16],breakHours:[0,8],night:[0,24],paidWage:[0,1000000],carry:[0,40]};
    for(const [k,[lo,hi]]of Object.entries(ranges))if(!Number.isFinite(c[k])||c[k]<lo||c[k]>hi)throw Error('入力値を確認してください：'+k+'（'+lo+'〜'+hi+'）');
    if(c.standard+c.overtime+c.breakHours>24)throw Error('労働時間と休憩の合計は24時間以内にしてください。');
    if(c.night>c.standard+c.overtime)throw Error('深夜時間は実労働時間以内にしてください。');
    if(!['inclusive','base'].includes(c.mode)||!['one','two'].includes(c.weekend))throw Error('選択条件が正しくありません。');
    calendar(c);
  }
  function calculate(c,override){
    const cal=calendar(c),ot=override===undefined?c.overtime:override;
    const rate=c.mode==='base'?c.daily/c.standard:c.hourly;
    const monthly=Array.from({length:12},(_,i)=>({month:i+1,work:0,paid:0,rest:0,ot:0,normal:0,labor:0,bound:0,required:0,pay:0,short:0}));
    let weekly=c.carry;const workDays=[];
    for(const d of cal.days){
      if(d.date.getUTCDay()===1)weekly=0;
      const m=monthly[d.month];
      if(d.rest){m.rest++;continue;}if(d.paid){m.paid++;continue;}
      m.work++;const labor=c.standard+ot,dailyExtra=Math.max(0,labor-8),eligible=Math.min(8,labor),weekExtra=Math.max(0,weekly+eligible-40);
      const legalOt=dailyExtra+weekExtra;weekly=Math.min(40,weekly+eligible);
      const low=Math.min(legalOt,Math.max(0,60-m.ot)),high=legalOt-low;
      workDays.push({date:d.key,cost:rate*labor+rate*(low*.25+high*.5)+rate*.25*Math.min(c.night,labor),ot:legalOt});
      m.ot+=legalOt;m.normal+=labor-legalOt;m.labor+=labor;m.bound+=labor+c.breakHours;
    }
    for(const m of monthly){
      const premium=rate*(Math.min(60,m.ot)*0.25+Math.max(0,m.ot-60)*0.5);
      m.required=rate*m.labor+premium+rate*0.25*Math.min(c.night,c.standard+ot)*m.work;
      const offered=c.daily*m.work;
      m.short=c.mode==='inclusive'?Math.max(0,m.required-offered):0;
      m.pay=(c.mode==='inclusive'?Math.max(offered,m.required):m.required)+c.paidWage*m.paid;
      m.agreed=(c.mode==='inclusive'?offered:m.required)+c.paidWage*m.paid;
      m.balance=c.budget-m.pay;
    }
    const total={};for(const k of ['work','paid','rest','ot','normal','labor','bound','pay','short','agreed'])total[k]=monthly.reduce((n,m)=>n+m[k],0);
    return {monthly,total,ignored:cal.ignored,rate,dailyBound:c.standard+ot+c.breakHours,workDays};
  }
  function longestRun(monthly){let longest=0,run=0;for(const m of monthly){run=m.bound>284+1e-7?run+1:0;longest=Math.max(longest,run);}return longest;}
  function checks(c,r){
    const list=[],annualOt=c.special?960:360,annualBound=c.extension?3400:3300,monthlyBound=c.extension?310:284;
    const add=(level,text)=>list.push({level,text});
    if(r.rate<c.minimum)add('bad','基礎時給が比較用最低賃金を下回っています。');
    if(r.total.short>0.01)add('bad','残業代込み日給では賃金が不足する月があります。差額を追加した支給額を表示しています。');
    if(r.total.ot>annualOt+1e-7)add('bad','年間法定時間外が '+annualOt+' 時間を超えています。');
    if(!c.special&&r.monthly.some(m=>m.ot>45+1e-7))add('bad','特別条項なしの月45時間を超える月があります。');
    if(c.special&&r.monthly.some(m=>m.ot>45))add('warn','特別条項は臨時的な特別の事情がある場合の条件です。毎日の恒常的な残業を許可するものではありません。');
    if(r.total.bound>annualBound+1e-7)add('bad','年間拘束時間が '+annualBound+' 時間を超えています。');
    if(r.monthly.some(m=>m.bound>monthlyBound+1e-7))add('bad','月の拘束時間が '+monthlyBound+' 時間を超える月があります。');
    if(c.extension){
      if(r.monthly.filter(m=>m.bound>284+1e-7).length>6)add('bad','284時間を超える月は年6か月以内が条件です。');
      if(longestRun(r.monthly)>3)add('bad','284時間を超える月が4か月以上連続しています。');
      if(r.monthly.some(m=>m.ot>=100))add('warn','延長時は月の時間外・休日労働を100時間未満にする努力義務があります。');
    }
    if(r.dailyBound>15+1e-7)add('bad','1日の拘束時間が通常の上限15時間を超えています。');
    else if(r.dailyBound>13+1e-7)add('warn','1日の拘束が原則13時間を超えています。休息期間や14時間超の回数も確認が必要です。');
    const labor=c.standard+c.overtime,need=labor>8?1:labor>6?0.75:0;
    if(c.breakHours<need)add('bad','実労働時間に必要な休憩時間が不足しています。');
    if(r.monthly.some(m=>m.balance<-0.01))add('warn','賃金予算 '+c.budget.toLocaleString('ja-JP')+' 円を超える月があります。');
    if(r.ignored.length)add('warn','有給の日付 '+r.ignored.join('、')+' は休日と重なるため、有給取得日に数えていません。');
    if(r.total.paid<5)add('warn','有給取得日は5日未満です。年5日の取得義務の対象者は日付を追加してください。');
    if(!list.some(x=>x.level==='bad'))add('ok','この入力で集計した賃金・時間の数値には上限超過がありません。未判定の項目は下記を確認してください。');
    return list;
  }
  function budgetCapacity(c,index){
    // Hypothetical uniform daily extra hours; not a legal authorization.
    const zero=calculate(c,0).monthly[index];if(!zero.work)return {hours:0,possible:zero.pay<=c.budget};
    if(zero.pay>c.budget)return {hours:0,possible:false};
    let lo=0,hi=24-c.standard-c.breakHours;
    for(let i=0;i<28;i++){const mid=(lo+hi)/2;if(calculate(c,mid).monthly[index].pay<=c.budget)lo=mid;else hi=mid;}
    return {hours:calculate(c,lo).monthly[index].ot,possible:true};
  }
  function solveUniform(c){
    const passes=h=>{const r=calculate(c,h);return r.total.ot<=(c.special?960:360)+1e-7&&r.total.bound<=(c.extension?3400:3300)+1e-7&&r.dailyBound<=13+1e-7&&r.monthly.every(m=>m.bound<=(c.extension?310:284)+1e-7&&(c.special||m.ot<=45+1e-7)&&m.pay<=c.budget+1e-7)&&(!c.extension||(r.monthly.filter(m=>m.bound>284+1e-7).length<=6&&longestRun(r.monthly)<=3));};
    if(!passes(0))return null;
    let lo=0,hi=Math.max(0,13-c.standard-c.breakHours);for(let i=0;i<28;i++){let mid=(lo+hi)/2;if(passes(mid))lo=mid;else hi=mid;}
    const hours=Math.floor(lo*60+1e-5)/60;
    if(c.breakHours<((c.standard+hours)>8?1:(c.standard+hours)>6?0.75:0)||calculate(c,hours).rate<c.minimum)return null;
    return hours;
  }
  function dailyBudgetCapacity(c){
    // Each actual workday must fit the daily amount; allocate the monthly
    // 60-hour premium chronologically instead of averaging it across days.
    const fits=h=>calculate(c,h).workDays.every(d=>d.cost<=c.daily+1e-7);
    if(!calculate(c,0).workDays.length)return {hours:null,reason:'no-work'};
    if(!fits(0))return {hours:null,reason:'insufficient'};
    let lo=0,hi=Math.min(16,24-c.standard-c.breakHours);
    for(let i=0;i<35;i++){const mid=(lo+hi)/2;if(fits(mid))lo=mid;else hi=mid;}
    const hours=Math.floor(lo*60+1e-6)/60;
    return {hours,cost:Math.max(...calculate(c,hours).workDays.map(d=>d.cost))};
  }
  function noPremiumCapacity(c){
    const rate=c.mode==='base'?c.daily/c.standard:c.hourly;
    if(rate<=0)return null;
    const extra=c.daily/rate-c.standard;
    return extra<0?null:Math.floor(extra*60+1e-7)/60;
  }
  function actualAttendance(c,records){
    const rate=c.mode==='base'?c.daily/c.standard:c.hourly;
    const months=Array.from({length:12},(_,i)=>({month:i+1,work:0,paid:0,labor:0,bound:0,ot:0,night:0,holiday:0,missing:0,errors:0}));
    const days=[],errors=[];let weekly=c.carry;
    const jan1=new Date(Date.UTC(c.year,0,1)),offset=(jan1.getUTCDay()+6)%7;
    if(offset&&holidays[c.year-1]){
      const weekStart=new Date(+jan1-offset*86400000).toISOString().slice(0,10);
      const priorKeys=Object.keys(records).filter(id=>id>=weekStart&&id<jan1.toISOString().slice(0,10));
      if(priorKeys.length){
        const prior=actualAttendance({...c,year:c.year-1},records);
        weekly=Math.min(40,prior.days.filter(d=>d.id>=weekStart&&d.type!=='holiday'&&!d.error&&!d.missing).reduce((sum,d)=>sum+d.labor-d.ot,0));
      }
    }
    const clock=s=>{if(typeof s!=='string'||!/^\d{2}:\d{2}$/.test(s))return null;const [h,m]=s.split(':').map(Number);return h<24&&m<60?h*60+m:null;};
    for(const d of calendar(c).days){
      if(d.date.getUTCDay()===1)weekly=0;
      const id=c.year+'-'+d.key,row=records[id]||{},type=row.type||(d.paid?'paid':d.rest?'off':'work'),m=months[d.month];
      const result={id,type,labor:0,bound:0,ot:0};
      try{
        if(!['work','off','paid','holiday'].includes(type))throw Error('勤務区分を確認してください。');
        if(type==='paid'){m.paid++;days.push(result);continue;}
        if(type==='off'){days.push(result);continue;}
        if(!row.start&&!row.end){m.missing++;result.missing=true;days.push(result);continue;}
        const start=clock(row.start),end=clock(row.end);
        if(start===null||end===null)throw Error('始業・終業の両方を入力してください。');
        const bound=end+(row.next?1440:0)-start;
        if(bound<=0||bound>1440)throw Error('終業が翌日なら「翌日」にチェックしてください（拘束24時間以内）。');
        const pause=Number(row.pause??c.breakHours*60),night=Number(row.night??0);
        if(!Number.isFinite(pause)||pause<0||pause>bound)throw Error('休憩は拘束時間以内の分数を入力してください。');
        const labor=(bound-pause)/60;
        if(!Number.isFinite(night)||night<0||night>labor)throw Error('深夜実労働は実労働以内の時間数を入力してください。');
        let nightWindow=0;for(let minute=start;minute<start+bound;minute++){const t=minute%1440;if(t<300||t>=1320)nightWindow++;}
        if(night*60>nightWindow+1e-7)throw Error('深夜実労働が22時〜翌5時の時間帯を超えています。');
        let ot=0;
        if(type!=='holiday'){const eligible=Math.min(8,labor);ot=Math.max(0,labor-8)+Math.max(0,weekly+eligible-40);weekly=Math.min(40,weekly+eligible);m.ot+=ot;}else m.holiday+=labor;
        m.work++;m.labor+=labor;m.bound+=bound/60;m.night+=night;
        Object.assign(result,{start:row.start,end:row.end,next:!!row.next,pause,night,labor,bound:bound/60,ot});days.push(result);
      }catch(err){m.errors++;errors.push({id,message:err.message});result.error=err.message;days.push(result);}
    }
    for(const m of months){
      m.low=Math.min(60,m.ot);m.high=Math.max(0,m.ot-60);
      m.lowPremium=rate*m.low*.25;m.highPremium=rate*m.high*.5;
      m.lowPay=rate*m.low*1.25;m.highPay=rate*m.high*1.5;
      m.nightPremium=rate*m.night*.25;m.holidayPremium=rate*m.holiday*.35;
      m.required=rate*m.labor+m.lowPremium+m.highPremium+m.nightPremium+m.holidayPremium;
      m.pay=(c.mode==='inclusive'?Math.max(c.daily*m.work,m.required):m.required)+c.paidWage*m.paid;
    }
    return {months,days,errors,rate};
  }
  function actualCsv(c,r){
    const rows=[['対象年',c.year],['基礎時給',r.rate],['注意','未入力は0時間。エラー行は集計対象外。法定休日は60時間の集計から除外。'],['月','勤務日','有給日','未入力日','エラー行','実労働h','拘束h','法定時間外h','60時間までh','60時間超h','25%割増加算円','50%割増加算円','60時間まで残業代円','60時間超残業代円','深夜加算円','法定休日加算円','支給見込み円']];
    for(const m of r.months)rows.push([m.month,m.work,m.paid,m.missing,m.errors,...['labor','bound','ot','low','high'].map(k=>m[k].toFixed(2)),...['lowPremium','highPremium','lowPay','highPay','nightPremium','holidayPremium','pay'].map(k=>Math.ceil(m[k]-1e-7)||0)]);
    rows.push([],['日付','区分','始業','終業','翌日','休憩分','深夜実労働h','実労働h','法定時間外h','状態']);
    for(const d of r.days)rows.push([d.id,d.type,d.start||'',d.end||'',d.next?'翌日':'',d.pause??'',d.night??'',d.labor.toFixed(2),d.ot.toFixed(2),d.error||(d.missing?'未入力':'')]);
    return '\uFEFF'+rows.map(row=>row.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\r\n');
  }
  function buildCsv(c,r,capacities){
    const rows=[['対象年',c.year],['日給の扱い',c.mode==='inclusive'?'残業代込み':'基本日給＋残業代'],['基礎時給',r.rate],['月額賃金予算',c.budget],['特別条項',c.special?'試算あり':'なし'],['拘束延長労使協定',c.extension?'あり':'なし'],['注意','賃金と時間の試算。休息・運転時間等は未判定。会社負担保険料等を含まない。'],[],['月','出勤日','有給日','公休日','支給見込み円','日給契約等の額円','残業込み日給の不足円','予算との差円','法定時間外h','拘束h','賃金予算だけの残業上限h']];
    r.monthly.forEach((m,i)=>rows.push([m.month,m.work,m.paid,m.rest,Math.ceil(m.pay-1e-7)||0,Math.ceil(m.agreed-1e-7)||0,Math.ceil(m.short-1e-7)||0,Math.floor(m.balance+1e-7)||0,m.ot.toFixed(2),m.bound.toFixed(2),capacities[i].possible?capacities[i].hours.toFixed(2):'予算不足']));
    rows.push(['年間',r.total.work,r.total.paid,r.total.rest,Math.ceil(r.total.pay-1e-7)||0,Math.ceil(r.total.agreed-1e-7)||0,Math.ceil(r.total.short-1e-7)||0,Math.floor(c.budget*12-r.total.pay+1e-7)||0,r.total.ot.toFixed(2),r.total.bound.toFixed(2),'']);
    return '\uFEFF'+rows.map(row=>row.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\r\n');
  }
  const api={holidays,defaults,validate,calendar,calculate,checks,budgetCapacity,solveUniform,longestRun,dailyBudgetCapacity,noPremiumCapacity,buildCsv,actualAttendance,actualCsv};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.WageEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
