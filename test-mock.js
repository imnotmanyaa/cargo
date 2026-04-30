import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const backend = express();
backend.all('*', (req, res) => {
  console.log("BACKEND RECEIVED:", req.method, req.url);
  res.send("OK");
});
backend.listen(8080);

const app = express();
app.use('/api', createProxyMiddleware({ target: 'http://localhost:8080', changeOrigin: true }));
app.listen(5173, () => console.log("Proxy listening"));
