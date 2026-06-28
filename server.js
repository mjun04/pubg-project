import express from 'express';
import cors from 'cors';
import { getWeaponMeta, searchPlayer, updateWeaponStatsAutomatically } from './pubgService.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/api/weapons', async (req, res) => {
  const mapName = req.query.map || 'Erangel';
  try {
    const data = await getWeaponMeta(mapName);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '무기 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

app.get('/api/players/:name', async (req, res) => {
  try {
    const data = await searchPlayer(req.params.name);
    res.json(data);
  } catch (error) {
    res.status(404).json({ error: error.message || '플레이어를 찾을 수 없습니다.' });
  }
});

app.listen(PORT, async () => {
  console.log(`✅ 백엔드 서버 구동 완료: http://localhost:${PORT}`);
  
  await updateWeaponStatsAutomatically();
  
  setInterval(async () => {
    await updateWeaponStatsAutomatically();
  }, 1000 * 60 * 60);
});