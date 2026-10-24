// 막 단위 시나리오로 진행하는 협력 게임은 미션 번호를 "시나리오 N · M막"으로 보여 줍니다. 저장은 미션 번호 그대로입니다.
const scenarioGames=[{names:['전지적추리시점'],acts:4}];
const compact=value=>String(value||'').replace(/\s+/g,'').toLowerCase();

export function missionFormat(game){const name=compact(typeof game==='string'?game:game?.name);return name&&scenarioGames.find(item=>item.names.includes(name))||null;}
export function missionName(game,mission){const format=missionFormat(game),value=Number(mission);if(!format||!Number.isInteger(value)||value<1)return `미션 ${mission}`;return `시나리오 ${Math.ceil(value/format.acts)} · ${(value-1)%format.acts+1}막`;}
export function missionRange(game,first,last){if(!missionFormat(game))return `미션 ${first}${last!==first?' → '+last:''}`;return missionName(game,first)+(last!==first?' → '+missionName(game,last):'');}
