import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

app.use(
  '/api',
  createProxyMiddleware({
    target: 'https://cargo-trans-mvp-production.up.railway.app',
    changeOrigin: true,
  })
);

app.listen(5173, () => {
  console.log("Server listening");
});
