import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5173;

// Proxy API requests — rewrite path to restore /api prefix stripped by Express mount
app.use(
  '/api',
  createProxyMiddleware({
    target: 'https://cargo-trans-mvp-production.up.railway.app',
    changeOrigin: true,
    pathRewrite: { '^/': '/api/' },
  })
);

// Proxy WebSocket requests
app.use(
  '/socket.io',
  createProxyMiddleware({
    target: 'https://cargo-trans-mvp-production.up.railway.app',
    ws: true,
    changeOrigin: true,
    pathRewrite: { '^/': '/socket.io/' },
  })
);

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback: redirect unmatched routes to index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Production server running on port ${PORT}`);
});
