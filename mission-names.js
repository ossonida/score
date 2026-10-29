// 막 단위 시나리오로 진행하는 협력 게임은 미션 번호를 "시나리오 N · M막"으로 보여 줍니다. 저장은 미션 번호 그대로입니다.
const scenarioGames=[{names:['전지적추리시점','전지적추리시점블루','perspectivesblue'],acts:4}];
const compact=value=>String(value||'').replace(/\s+/g,'').toLowerCase();
const place=(format,mission)=>({scenario:Math.ceil(mission/format.acts),act:(mission-1)%format.acts+1});
const valid=value=>Number.isInteger(Number(value))&&Number(value)>0;

export function missionFormat(game){const name=compact(typeof game==='string'?game:game?.name);return name&&scenarioGames.find(item=>item.names.includes(name))||null;}
export function missionName(game,mission){const format=missionFormat(game);if(!format||!valid(mission))return `미션 ${mission}`;const at=place(format,Number(mission));return `시나리오 ${at.scenario} · ${at.act}막`;}
// 같은 시나리오 안의 구간은 "시나리오 1 · 1→3막"으로 줄여 씁니다.
export function missionRange(game,first,last){
 const format=missionFormat(game);if(!format||!valid(first)||!valid(last))return `미션 ${first}${last!==first?' → '+last:''}`;if(last===first)return missionName(game,first);
 const a=place(format,Number(first)),b=place(format,Number(last));return a.scenario===b.scenario?`시나리오 ${a.scenario} · ${a.act}→${b.act}막`:`${missionName(game,first)} → ${missionName(game,last)}`;
}
// 공유 표지용 짧은 표기: 시나리오 게임은 "1-1~4막 4승"(시나리오-막 구간 · 클리어 수), 그 밖은 "미션 1 → 3 클리어"입니다.
export function missionCleared(game,first,last,cleared){
 const format=missionFormat(game);if(!format||!valid(first)||!valid(last))return `${missionRange(game,first,last)}${Number.isInteger(cleared)?` · ${cleared}개`:''} 클리어`;
 const a=place(format,Number(first)),b=place(format,Number(last)),span=last===first?`${a.scenario}-${a.act}막`:a.scenario===b.scenario?`${a.scenario}-${a.act}~${b.act}막`:`${a.scenario}-${a.act}~${b.scenario}-${b.act}막`;
 return Number.isInteger(cleared)?`${span} ${cleared}승`:span;
}
