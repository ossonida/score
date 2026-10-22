import {gameKey} from './records-core.js?v=125';

const DAY=86400000;
const pad=value=>String(value).padStart(2,'0');
const parse=date=>{const [year,month,day]=date.split('-').map(Number);return new Date(Date.UTC(year,month-1,day));};
const format=date=>`${date.getUTCFullYear()}-${pad(date.getUTCMonth()+1)}-${pad(date.getUTCDate())}`;
const shift=(date,days)=>{const value=parse(date);value.setUTCDate(value.getUTCDate()+days);return format(value);};
const monthEnd=(year,month)=>format(new Date(Date.UTC(year,month,0)));
const clampDay=(year,month,day)=>Math.min(day,Number(monthEnd(year,month).slice(8)));
const range=(start,end)=>({start,end});
const comparison=(label,current,previous)=>({label,current,previous});

export function periodForPreset(preset,today,records=[]){
 const now=parse(today),year=now.getUTCFullYear(),month=now.getUTCMonth()+1,day=now.getUTCDate();
 if(preset==='this-month'){
  const previousMonth=month===1?12:month-1,previousYear=month===1?year-1:year;
  return comparison('지난달',range(`${year}-${pad(month)}-01`,today),range(`${previousYear}-${pad(previousMonth)}-01`,`${previousYear}-${pad(previousMonth)}-${pad(clampDay(previousYear,previousMonth,day))}`));
 }
 if(preset==='last-month'){
  const currentMonth=month===1?12:month-1,currentYear=month===1?year-1:year,previousMonth=currentMonth===1?12:currentMonth-1,previousYear=currentMonth===1?currentYear-1:currentYear;
  return comparison('전전달',range(`${currentYear}-${pad(currentMonth)}-01`,monthEnd(currentYear,currentMonth)),range(`${previousYear}-${pad(previousMonth)}-01`,monthEnd(previousYear,previousMonth)));
 }
 if(preset==='this-year')return comparison('지난해',range(`${year}-01-01`,today),range(`${year-1}-01-01`,`${year-1}-${pad(month)}-${pad(clampDay(year-1,month,day))}`));
 if(preset==='last-year')return comparison('전년',range(`${year-1}-01-01`,`${year-1}-12-31`),range(`${year-2}-01-01`,`${year-2}-12-31`));
 const dates=records.map(record=>record.date).filter(Boolean).sort();
 return {label:'',current:range(dates[0]||today,dates.at(-1)||today),previous:null};
}

export function periodForStep(unit,offset,today){
 const now=parse(today),year=now.getUTCFullYear(),month=now.getUTCMonth()+1;
 if(unit==='year'){const target=year+offset,title=`${target}년`;if(!offset)return {...periodForPreset('this-year',today),title};return {...comparison('이전 해',range(`${target}-01-01`,`${target}-12-31`),range(`${target-1}-01-01`,`${target-1}-12-31`)),title};}
 const index=year*12+month-1+offset,targetYear=Math.floor(index/12),targetMonth=index%12+1,previousYear=Math.floor((index-1)/12),previousMonth=(index-1)%12+1,title=`${targetYear}년 ${targetMonth}월`;
 if(!offset)return {...periodForPreset('this-month',today),title};
 return {...comparison('이전 달',range(`${targetYear}-${pad(targetMonth)}-01`,monthEnd(targetYear,targetMonth)),range(`${previousYear}-${pad(previousMonth)}-01`,monthEnd(previousYear,previousMonth))),title};
}

export function customPeriod(start,end){
 const valid=date=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&format(parse(date))===date;
 if(!valid(start)||!valid(end)||start>end)return null;
 const days=Math.round((parse(end)-parse(start))/DAY)+1,previousEnd=shift(start,-1);
 return comparison('직전 동일 기간',range(start,end),range(shift(previousEnd,1-days),previousEnd));
}

export const recordsInPeriod=(records,selected)=>records.filter(record=>record.date>=selected.start&&record.date<=selected.end);

export function summarizePeriod(records,selected){
 const subset=recordsInPeriod(records,selected);
 return {plays:subset.length,days:new Set(subset.map(record=>record.date)).size,games:new Set(subset.map(record=>gameKey(record.game))).size};
}

function bucketUnit(selected,all){const days=Math.round((parse(selected.end)-parse(selected.start))/DAY)+1;return all||days>366?'month':days>31?'week':'day';}
export function frequencyBuckets(records,selected,{all=false}={}){
 const unit=bucketUnit(selected,all),subset=recordsInPeriod(records,selected),counts=new Map();
 for(const record of subset)counts.set(record.date,(counts.get(record.date)||0)+1);
 const buckets=[];
 if(unit==='day')for(let date=selected.start;date<=selected.end;date=shift(date,1))buckets.push({start:date,end:date,label:`${Number(date.slice(5,7))}/${Number(date.slice(8))}`,count:counts.get(date)||0});
 else if(unit==='week')for(let start=selected.start,index=1;start<=selected.end;start=shift(start,7),index++){const end=[shift(start,6),selected.end].sort()[0];buckets.push({start,end,label:`${index}주`,count:subset.filter(record=>record.date>=start&&record.date<=end).length});}
 else {let cursor=selected.start.slice(0,7)+'-01';const final=selected.end.slice(0,7);for(;cursor.slice(0,7)<=final;){const key=cursor.slice(0,7),[year,month]=key.split('-').map(Number);buckets.push({start:key+'-01',end:monthEnd(year,month),label:`${year}.${month}`,count:subset.filter(record=>record.date.startsWith(key)).length});cursor=month===12?`${year+1}-01-01`:`${year}-${pad(month+1)}-01`;}}
 return {unit,buckets};
}

export function yearlyCounts(records){const counts=new Map();for(const record of records){const year=record.date.slice(0,4);counts.set(year,(counts.get(year)||0)+1);}return [...counts].sort(([a],[b])=>a.localeCompare(b)).map(([year,count])=>({year,count}));}
