import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// ------------------------------------------------------------------
// 1. 설정 및 기본 데이터 맵핑
// ------------------------------------------------------------------

const apiClient = axios.create({
  baseURL: 'https://api.pubg.com/shards/steam',
  headers: {
    'Authorization': `Bearer ${process.env.PUBG_API_KEY}`,
    'Accept': 'application/vnd.api+json'
  }
});

let cachedWeaponMeta = [];

const WEAPON_MAP = {
  "BerylM762": "베릴 M762",
  "HK416": "M416",
  "Mini14": "미니14",
  "SLR": "SLR",
  "AK47": "AKM",
  "SKS": "SKS",
  "Kar98k": "Kar98k",
  "M24": "M24",
  "UMP": "UMP45",
  "Vector": "벡터",
  "SCAR": "SCAR-L",
  "M16": "M16A4",
  "ACE32": "ACE32",
  "Dragunov": "드라구노프",
  "AUG": "AUG",
  "Mk12": "Mk12",
  "AWM": "AWM",
  "Groza": "그로자",
  "Famas": "파마스",
  "P90": "P90",
  "MG3": "MG3",
  "G36C": "G36C",
  "QBZ": "QBZ",
  "DP28": "DP-28",
  "VSS": "VSS",
  "M249": "M249",
  "DBS": "DBS",
  "S1897": "펌프 액션",
  "S686": "더블 배럴",
  "UZI": "우지",
  "MP5K": "MP5K",
  "Crossbow": "석궁",
  "LynxAMR": "링스 AMR",
  "Mk47Mutant": "Mk47 뮤턴트",
  "Mosin": "모신 나간트",
  "K2": "K2",
  "O12": "O12",
  "OriginS12": "O12",
  "JS9": "JS9",
  "MP9": "MP9"
};

const ATTACHMENT_MAP = {
  // --- 총구 (Muzzle) ---
  "Muzzle_Compensator_Large": "AR 보정기",
  "Muzzle_Compensator_Medium": "SMG 보정기",
  "Muzzle_Compensator_Sniper": "SR 보정기",
  "Muzzle_FlashHider_Large": "AR 소염기",
  "Muzzle_FlashHider_Medium": "SMG 소염기",
  "Muzzle_FlashHider_Sniper": "SR 소염기",
  "Muzzle_Suppressor_Large": "AR 소음기",
  "Muzzle_Suppressor_Medium": "SMG 소음기",
  "Muzzle_Suppressor_Sniper": "SR 소음기",

  // --- 손잡이 (Grip) ---
  "Lower_VerticalGrip": "수직 손잡이",
  "Lower_HalfGrip": "하프 그립",
  "Lower_AngledGrip": "앵글 손잡이",
  "Lower_ThumbGrip": "엄지 그립",
  "Lower_LightGrip": "라이트 그립",
  "Lower_Foregrip": "수직 손잡이",
  "Lower_TiltedGrip": "앵글 손잡이",

  // --- 탄창 (Magazine) ---
  "Magazine_ExtendedQuickDraw_Large": "AR 대용량 퀵드로우",
  "Magazine_ExtendedQuickDraw_Medium": "SMG 대용량 퀵드로우",
  "Magazine_ExtendedQuickDraw_Sniper": "SR 대용량 퀵드로우",
  "Magazine_Extended_Large": "AR 대용량 탄창",
  "Magazine_Extended_Medium": "SMG 대용량 탄창",
  "Magazine_Extended_Sniper": "SR 대용량 탄창",
  "Magazine_QuickDraw_Large": "AR 퀵드로우",
  "Magazine_QuickDraw_Medium": "SMG 퀵드로우",
  "Magazine_QuickDraw_Sniper": "SR 퀵드로우",

  // --- 개머리판 (Stock) ---
  "Stock_Tactical": "전술 개머리판",
  "Stock_AR_Composite": "중량 개머리판",
  "Stock_Sniper": "치크패드",
  "Stock_AR_HeavyStock": "중량 개머리판",
  "Stock_Sniper_Rifle_CheekPad": "치크패드",
  "Stock_Sniper_Rifle_BulletLoops": "SR 탄띠",

  // --- 조준경 (Sight/Scope) ---
  "Upper_DotSight": "레드도트",
  "Upper_Holosight": "홀로그램",
  "Upper_ACOG": "4배율 스코프",
  "Upper_Scope6x": "6배율 스코프",
  "Upper_CQBSS": "8배율 스코프"
};

const MAP_NAME = {
  "Baltic_Main": "에란겔",
  "Desert_Main": "미라마",
  "Tiger_Main": "태이고",
  "DihorOtok_Main": "비켄디",
  "Savage_Main": "사녹",
  "Summerland_Main": "카라킨",
  "Chimera_Main": "파라모",
  "Heaven_Main": "헤이븐",
  "Kiki_Main": "데스턴",
  "Neon_Main": "론도"
};

// ------------------------------------------------------------------
// 2. 헬퍼 함수
// ------------------------------------------------------------------

export const normalizeWeaponName = (rawName) => {
  if (!rawName) return null;
  for (const [key, val] of Object.entries(WEAPON_MAP)) {
    if (rawName.includes(key)) return val;
  }
  return null;
};

const normalizeAttachmentName = (rawName) => {
  if (!rawName) return null;
  for (const [key, val] of Object.entries(ATTACHMENT_MAP)) {
    if (rawName.includes(key)) return val;
  }
  return rawName.replace("Item_Attach_Weapon_", "").replace("_C", "");
};

// ------------------------------------------------------------------
// 3. API 통신 및 데이터 수집 함수
// ------------------------------------------------------------------

export const collectSampleMatches = async () => {
  const sampleRes = await apiClient.get('/samples');
  const matches = sampleRes.data.data.relationships.matches.data;
  return matches.slice(0, 8).map(m => m.id);
};

export const downloadTelemetry = async (matchId) => {
  const matchRes = await apiClient.get(`/matches/${matchId}`);
  const matchData = matchRes.data;
  const assets = matchData.included.filter(item => item.type === 'asset');
  
  if (assets.length === 0) throw new Error("Telemetry URL 없음");
  
  const telemetryUrl = assets[0].attributes.URL;
  const mapNameRaw = matchData.data.attributes.mapName;
  
  const telemetryRes = await axios.get(telemetryUrl, {
    headers: { 'Accept-Encoding': 'gzip' },
    timeout: 20000 
  });
  
  return { telemetryData: telemetryRes.data, mapNameRaw };
};

// ------------------------------------------------------------------
// 4. 개별 매치 텔레메트리 분석 엔진 (🔥 플레이어 중심 추적 🔥)
// ------------------------------------------------------------------

export const analyzeTelemetry = (telemetryData) => {
  const weaponEquips = {}; 
  const weaponKills = {};  
  const weaponAttachments = {}; 

  const playerWeapons = {}; // accountId -> Set of weapons
  const playerKills = {};   // accountId -> kill count
  const playerRanks = {};   // accountId -> rank

  for (let i = 0; i < telemetryData.length; i++) {
    const event = telemetryData[i];

    // [1] 장착(Equip) 집계: 플레이어가 어떤 무기들을 들었는지 기록
    if (event._T === "LogItemEquip" && event.item && event.item.category === "Weapon") {
      const weaponName = normalizeWeaponName(event.item.itemId);
      const accountId = event.character?.accountId;
      if (weaponName && accountId) {
        if (!playerWeapons[accountId]) playerWeapons[accountId] = new Set();
        if (!playerWeapons[accountId].has(weaponName)) {
          playerWeapons[accountId].add(weaponName);
          weaponEquips[weaponName] = (weaponEquips[weaponName] || 0) + 1;
        }
      }
    }

    // [2] 킬(Kill) 및 파츠 집계
    if (event._T === "LogPlayerKill" || event._T === "LogPlayerKillV2") {
      const killerId = event.killer?.accountId;
      if (killerId) {
        playerKills[killerId] = (playerKills[killerId] || 0) + 1; // 플레이어 개인 킬수 누적
      }

      let rawWeapon = null;
      if (event.finishDamageInfo?.damageCauserName) rawWeapon = event.finishDamageInfo.damageCauserName;
      else if (event.killerDamageInfo?.damageCauserName) rawWeapon = event.killerDamageInfo.damageCauserName;
      else if (event.dBNODamageInfo?.damageCauserName) rawWeapon = event.dBNODamageInfo.damageCauserName;
      else if (event.damageCauserName) rawWeapon = event.damageCauserName;

      const weaponName = normalizeWeaponName(rawWeapon);
      if (weaponName) {
        weaponKills[weaponName] = (weaponKills[weaponName] || 0) + 1;

        let attachments = [];
        if (event.killer?.weaponAttachments) attachments = event.killer.weaponAttachments;
        else if (Array.isArray(event.finishDamageInfo?.additionalInfo)) attachments = event.finishDamageInfo.additionalInfo;

        if (attachments.length > 0) {
          if (!weaponAttachments[weaponName]) weaponAttachments[weaponName] = {};
          attachments.forEach(att => {
            const attStr = typeof att === 'string' ? att : (att.itemId || "unknown");
            const normalizedAtt = normalizeAttachmentName(attStr);
            if (normalizedAtt) {
              weaponAttachments[weaponName][normalizedAtt] = (weaponAttachments[weaponName][normalizedAtt] || 0) + 1;
            }
          });
        }
      }
    }

    // [3] 매치 결과 순위 집계 (LogMatchEnd)
    if (event._T === "LogMatchEnd") {
      if (event.characters) {
        event.characters.forEach(c => {
          if (c.character?.accountId && c.character.ranking) {
            playerRanks[c.character.accountId] = c.character.ranking;
          }
        });
      } else if (event.gameResultOnFinished?.results) {
        event.gameResultOnFinished.results.forEach(res => {
          if (res.accountId && res.rank) {
            playerRanks[res.accountId] = res.rank;
          }
        });
      }
    }
  }

  // [4] 무기별로 '해당 무기를 쓴 유저들'의 K/D와 순위 계산
  const weaponPlayerStats = {};
  for (const [accountId, weapons] of Object.entries(playerWeapons)) {
    const kills = playerKills[accountId] || 0;
    const rank = playerRanks[accountId];

    for (const weapon of weapons) {
      if (!weaponPlayerStats[weapon]) {
        weaponPlayerStats[weapon] = { rankSum: 0, rankCount: 0, kdSum: 0, kdCount: 0 };
      }
      
      weaponPlayerStats[weapon].kdSum += kills;
      weaponPlayerStats[weapon].kdCount += 1;

      if (rank) {
        weaponPlayerStats[weapon].rankSum += rank;
        weaponPlayerStats[weapon].rankCount += 1;
      }
    }
  }

  return { weaponEquips, weaponKills, weaponAttachments, weaponPlayerStats };
};

export const analyzeMatch = async (matchId) => {
  try {
    const { telemetryData, mapNameRaw } = await downloadTelemetry(matchId);
    const mapName = MAP_NAME[mapNameRaw] || mapNameRaw;
    const matchStats = analyzeTelemetry(telemetryData);
    return { mapName, ...matchStats };
  } catch (error) {
    return null;
  }
};

// ------------------------------------------------------------------
// 5. 전체 데이터 통합 및 프론트엔드 포맷 생성
// ------------------------------------------------------------------

export const createWeaponStats = (matchesStats) => {
  const aggregated = {};
  let globalTotalEquips = 0;
  let globalTotalKills = 0;

  for (const match of matchesStats) {
    if (!match) continue;

    for (const [weapon, eqCount] of Object.entries(match.weaponEquips)) {
      if (!aggregated[weapon]) {
        aggregated[weapon] = {
          name: weapon, equips: 0, kills: 0, mapStats: {},
          rankSum: 0, rankCount: 0, kdSum: 0, kdCount: 0, attachments: {}
        };
      }

      aggregated[weapon].equips += eqCount;
      globalTotalEquips += eqCount;

      const kCount = match.weaponKills[weapon] || 0;
      aggregated[weapon].kills += kCount;
      globalTotalKills += kCount;

      if (match.weaponPlayerStats[weapon]) {
        aggregated[weapon].rankSum += match.weaponPlayerStats[weapon].rankSum;
        aggregated[weapon].rankCount += match.weaponPlayerStats[weapon].rankCount;
        aggregated[weapon].kdSum += match.weaponPlayerStats[weapon].kdSum;
        aggregated[weapon].kdCount += match.weaponPlayerStats[weapon].kdCount;
      }

      aggregated[weapon].mapStats[match.mapName] = (aggregated[weapon].mapStats[match.mapName] || 0) + eqCount;

      if (match.weaponAttachments[weapon]) {
        for (const [att, count] of Object.entries(match.weaponAttachments[weapon])) {
          aggregated[weapon].attachments[att] = (aggregated[weapon].attachments[att] || 0) + count;
        }
      }
    }
  }

  const finalStats = [];

  for (const [weapon, stat] of Object.entries(aggregated)) {
    const pickRate = globalTotalEquips > 0 ? (stat.equips / globalTotalEquips * 100) : 0;
    const killRate = globalTotalKills > 0 ? (stat.kills / globalTotalKills * 100) : 0;
    const efficiency = stat.equips > 0 ? (stat.kills / stat.equips) : 0;
    const avgRank = stat.rankCount > 0 ? (stat.rankSum / stat.rankCount) : 0;
    const avgKD = stat.kdCount > 0 ? (stat.kdSum / stat.kdCount) : 0;

    let bestMap = "알 수 없음";
    let maxMapCount = -1;
    for (const [mName, mCount] of Object.entries(stat.mapStats)) {
      if (mCount > maxMapCount) {
        maxMapCount = mCount;
        bestMap = mName;
      }
    }

    const topAttachments = Object.entries(stat.attachments)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    finalStats.push({
      id: weapon,
      name: weapon,
      equips: stat.equips,
      kills: stat.kills,
      pickRate: parseFloat(pickRate.toFixed(2)),
      killRate: parseFloat(killRate.toFixed(2)),
      efficiency: parseFloat(efficiency.toFixed(2)),
      avgRank: parseFloat(avgRank.toFixed(1)),
      avgKD: parseFloat(avgKD.toFixed(2)),
      bestMap: bestMap,
      topAttachments: topAttachments,
      mapStats: stat.mapStats
    });
  }

  return finalStats.sort((a, b) => b.pickRate - a.pickRate);
};

// ------------------------------------------------------------------
// 6. 메인 Export 함수 (server.js 호출용)
// ------------------------------------------------------------------

export const updateWeaponStatsAutomatically = async () => {
  console.log("🔄 [자동화] 무기 메타(유저 추적) 분석 시작...");
  try {
    const matchIds = await collectSampleMatches();
    if (!matchIds || matchIds.length === 0) return;

    const matchesStats = await Promise.all(matchIds.map(id => analyzeMatch(id)));
    const finalMeta = createWeaponStats(matchesStats);
    
    if (finalMeta.length > 0) {
      cachedWeaponMeta = finalMeta;
      console.log(`🎉 [업데이트 완료] ${finalMeta.length}개 무기의 정밀 메타 통계가 갱신되었습니다.`);
    }
  } catch (error) {
    console.error("❌ 통계 업데이트 중 오류:", error.message);
  }
};

export const getWeaponMeta = (mapName) => {
  if (!mapName || mapName === "전체") return cachedWeaponMeta;

  const FRONTEND_MAP_TO_KOR = {
    "Erangel": "에란겔",
    "Miramar": "미라마",
    "Taego": "태이고",
    "Rondo": "론도",
    "Sanhok": "사녹",
    "Vikendi": "비켄디",
    "Deston": "데스턴",
    "Karakin": "카라킨",
    "Paramo": "파라모"
  };

  try {
    const korMapName = FRONTEND_MAP_TO_KOR[mapName] || mapName;
    let totalMapEquips = 0;

    if (!cachedWeaponMeta || cachedWeaponMeta.length === 0) return [];

    const mapWeapons = cachedWeaponMeta.map(w => {
      const stats = w.mapStats || {};
      const equipsInMap = stats[korMapName] || 0;
      totalMapEquips += equipsInMap;
      
      return { ...w, mapEquips: equipsInMap };
    }).filter(w => w.mapEquips > 0);

    if (totalMapEquips === 0) return [];

    return mapWeapons.map(w => ({
      ...w,
      pickRate: parseFloat(((w.mapEquips / totalMapEquips) * 100).toFixed(2))
    })).sort((a, b) => b.pickRate - a.pickRate);

  } catch (error) {
    console.error(error);
    return [];
  }
};

export const searchPlayer = async (playerName) => {
  try {
    const playerRes = await apiClient.get(`/players?filter[playerNames]=${playerName}`);
    const accountId = playerRes.data.data[0].id;
    const statsRes = await apiClient.get(`/players/${accountId}/seasons/lifetime`);
    const squadStats = statsRes.data.data.attributes.gameModeStats.squad || {};

    const kills = squadStats.kills || 0;
    const losses = squadStats.losses || 1;
    const kdRatio = (kills / losses).toFixed(2);

    return {
      name: playerName,
      accountId: accountId,
      level: "500",
      tier: "Master",
      recentKD: parseFloat(kdRatio),
      totalDamage: squadStats.damageDealt || 0,
      matchesPlayed: squadStats.roundsPlayed || 0,
      wins: squadStats.wins || 0
    };
  } catch (error) {
    throw error;
  }
};