import express from 'express';
import cors from 'cors';
import proxyRoutes from './routes/proxy.js';

const app = express();
const PORT = process.env.PROXY_PORT || 8001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/proxy', proxyRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy server running on port ${PORT}`);
});
