import test from 'node:test';
import assert from 'node:assert/strict';
import {customPeriod,frequencyBuckets,periodForPreset,periodForStep,recordsInPeriod,summarizePeriod,yearlyCounts} from '../period-stats.js';

const record=(date,game='게임')=>({date,game:{name:game,bggId:''}});

test('month presets cross January and cap same elapsed day at the previous month end',()=>{
 assert.deepEqual(periodForPreset('this-month','2026-01-01').previous,{start:'2025-12-01',end:'2025-12-01'});
 assert.deepEqual(periodForPreset('this-month','2025-03-31').previous,{start:'2025-02-01',end:'2025-02-28'});
 assert.deepEqual(periodForPreset('last-month','2026-01-15').current,{start:'2025-12-01',end:'2025-12-31'});
});

test('year comparison preserves leap-day boundaries safely',()=>{
 assert.deepEqual(periodForPreset('this-year','2024-02-29').previous,{start:'2023-01-01',end:'2023-02-28'});
 assert.deepEqual(periodForPreset('last-year','2026-06-01').previous,{start:'2024-01-01',end:'2024-12-31'});
});

test('custom period uses the immediately preceding equal inclusive duration',()=>{
 assert.deepEqual(customPeriod('2026-05-10','2026-05-10'),{label:'직전 동일 기간',current:{start:'2026-05-10',end:'2026-05-10'},previous:{start:'2026-05-09',end:'2026-05-09'}});
 assert.equal(customPeriod('2026-05-11','2026-05-10'),null);
 assert.equal(customPeriod('2026-02-30','2026-03-01'),null);
});

test('summary and details use identical inclusive filtering',()=>{const records=[record('2026-01-01','A'),record('2026-01-02','A'),record('2026-01-03','B')],period={start:'2026-01-01',end:'2026-01-02'};assert.deepEqual(summarizePeriod(records,period),{plays:2,days:2,games:1});assert.deepEqual(recordsInPeriod(records,period).map(x=>x.date),['2026-01-01','2026-01-02']);});

test('frequency includes empty daily, weekly, and monthly buckets',()=>{
 const daily=frequencyBuckets([record('2026-01-01'),record('2026-01-03')],{start:'2026-01-01',end:'2026-01-03'});assert.deepEqual(daily.buckets.map(x=>x.count),[1,0,1]);
 const weekly=frequencyBuckets([],{start:'2026-01-01',end:'2026-02-02'});assert.equal(weekly.unit,'week');assert.ok(weekly.buckets.every(x=>x.count===0));
 const monthly=frequencyBuckets([record('2024-01-01'),record('2025-02-01')],{start:'2024-01-01',end:'2025-02-01'});assert.equal(monthly.unit,'month');assert.equal(monthly.buckets.length,14);
});

test('month start, month end, December-January and leap February boundaries',()=>{
 assert.deepEqual(periodForPreset('this-month','2026-10-01'),{label:'지난달',current:{start:'2026-10-01',end:'2026-10-01'},previous:{start:'2026-09-01',end:'2026-09-01'}});
 assert.deepEqual(periodForPreset('this-month','2026-10-22').previous,{start:'2026-09-01',end:'2026-09-22'});
 assert.deepEqual(periodForPreset('this-month','2026-12-31').previous,{start:'2026-11-01',end:'2026-11-30'});
 assert.deepEqual(periodForPreset('last-month','2026-02-10').previous,{start:'2025-12-01',end:'2025-12-31'});
 assert.deepEqual(periodForPreset('this-month','2024-03-30').previous,{start:'2024-02-01',end:'2024-02-29'});
 assert.deepEqual(periodForPreset('last-month','2024-03-05').current,{start:'2024-02-01',end:'2024-02-29'});
 assert.deepEqual(customPeriod('2024-03-01','2024-03-01').previous,{start:'2024-02-29',end:'2024-02-29'});
 assert.equal(frequencyBuckets([],{start:'2024-02-01',end:'2024-02-29'}).buckets.length,29);
});

test('empty periods summarize to zero and exclude records outside the range',()=>{const records=[record('2026-09-30'),record('2026-11-01')],period={start:'2026-10-01',end:'2026-10-31'};assert.deepEqual(summarizePeriod(records,period),{plays:0,days:0,games:0});assert.deepEqual(recordsInPeriod(records,period),[]);assert.deepEqual(periodForPreset('all','2026-10-22',[]),{label:'',current:{start:'2026-10-22',end:'2026-10-22'},previous:null});});

test('all-time periods and yearly counts span multiple years',()=>{const records=[record('2023-05-01'),record('2025-01-01'),record('2025-02-01')];assert.deepEqual(periodForPreset('all','2026-10-22',records).current,{start:'2023-05-01',end:'2025-02-01'});assert.deepEqual(yearlyCounts(records),[{year:'2023',count:1},{year:'2025',count:2}]);});

test('period navigator steps whole months and years across boundaries',()=>{
 assert.deepEqual(periodForStep('month',0,'2026-10-22'),{...periodForPreset('this-month','2026-10-22'),title:'2026년 10월'});
 assert.deepEqual(periodForStep('month',-10,'2026-10-22'),{label:'이전 달',current:{start:'2025-12-01',end:'2025-12-31'},previous:{start:'2025-11-01',end:'2025-11-30'},title:'2025년 12월'});
 assert.deepEqual(periodForStep('month',-1,'2026-01-15'),{label:'이전 달',current:{start:'2025-12-01',end:'2025-12-31'},previous:{start:'2025-11-01',end:'2025-11-30'},title:'2025년 12월'});
 assert.deepEqual(periodForStep('month',-1,'2026-02-03').previous,{start:'2025-12-01',end:'2025-12-31'});
 assert.deepEqual(periodForStep('month',-7,'2024-09-10').current,{start:'2024-02-01',end:'2024-02-29'});
 assert.deepEqual(periodForStep('year',0,'2024-02-29'),{...periodForPreset('this-year','2024-02-29'),title:'2024년'});
 assert.deepEqual(periodForStep('year',-2,'2026-10-22'),{label:'이전 해',current:{start:'2024-01-01',end:'2024-12-31'},previous:{start:'2023-01-01',end:'2023-12-31'},title:'2024년'});
});
