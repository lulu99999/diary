/**
 * 可选后端：静态页面 + 按设备 ID 存储数据
 * 启动：cd server && npm install && npm start
 * 浏览器打开 http://localhost:3000
 */
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const HTML_DIR = path.join(__dirname, '..', 'html');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(express.json({ limit: '15mb' }));
app.use(express.static(HTML_DIR));

function dataFile(deviceId) {
  const safe = String(deviceId).replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(DATA_DIR, safe + '.json');
}

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.get('/api/data/:deviceId', (req, res) => {
  const file = dataFile(req.params.deviceId);
  if (!fs.existsSync(file)) {
    return res.json({ entries: [], settings: {} });
  }
  try {
    res.json(JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch {
    res.status(500).json({ error: 'read failed' });
  }
});

app.put('/api/data/:deviceId', (req, res) => {
  const file = dataFile(req.params.deviceId);
  fs.writeFileSync(file, JSON.stringify(req.body, null, 2), 'utf8');
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log('拾光日记已启动: http://localhost:' + PORT);
  console.log('数据目录:', DATA_DIR);
});
