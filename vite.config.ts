import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import dotenv from 'dotenv';
import reportHandler from './api/analyze-report';

dotenv.config({ path: '.env.local' });
dotenv.config();

function unifiedApiProxyPlugin(): Plugin {
  const KPI_ENDPOINT = 'https://2zkaym7w85.execute-api.ap-south-1.amazonaws.com/operational_kpi';
  const GRAPHDATA_ENDPOINT = 'https://2zkaym7w85.execute-api.ap-south-1.amazonaws.com/operational_graphdata';
  const TEST_ROUTE_ENDPOINT = 'https://2zkaym7w85.execute-api.ap-south-1.amazonaws.com/test_route';
  const DASHBOARD_ENDPOINT = 'https://2zkaym7w85.execute-api.ap-south-1.amazonaws.com/dashboard';
  const FINANCIAL_ENDPOINT = 'https://2zkaym7w85.execute-api.ap-south-1.amazonaws.com/financial_intel';
  const WELDING_ENDPOINT = 'https://2zkaym7w85.execute-api.ap-south-1.amazonaws.com/welding';

  const proxyMiddleware = async (req: any, res: any, next: any) => {
    if (!req.url) {
      next();
      return;
    }

    if (req.url.split('?')[0] === '/api/analyze-report') {
      await reportHandler(req, res);
      return;
    }

    // 1. Management dashboard POST /api/dashboard
    if (req.url.startsWith('/api/dashboard')) {
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
        res.end();
        return;
      }
      if (req.method === 'POST') {
        let bodyStr = '';
        req.on('data', (chunk: any) => { bodyStr += chunk; });
        req.on('end', async () => {
          try {
            const resp = await fetch(DASHBOARD_ENDPOINT, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              body: bodyStr || '{}',
            });
            const data = await resp.json();
            res.statusCode = resp.status;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify(data));
          } catch (err: any) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Dashboard proxy failed' }));
          }
        });
        return;
      }
    }

    // 2. Operational KPI & Graphdata & Test Route (CNC)
    const isKpi = req.url.startsWith('/operational_kpi') || req.url.startsWith('/api/operational_kpi');
    const isGraphData = req.url.startsWith('/operational_graphdata') || req.url.startsWith('/api/operational_graphdata');
    const isTestRoute = req.url.startsWith('/test_route') || req.url.startsWith('/api/test_route');
    if (isKpi || isGraphData || isTestRoute) {
      if (req.method !== 'GET') {
        res.statusCode = 405;
        res.end('Method Not Allowed');
        return;
      }

      const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const compressorParam = urlObj.searchParams.get('compressor') || '';
      const pkParam = urlObj.searchParams.get('pk') || '';
      const isRobo =
        pkParam.includes('TXMMIGI') ||
        pkParam.includes('ROBO') ||
        compressorParam.includes('TXMMIGI') ||
        compressorParam === 'ROBO#01' ||
        compressorParam === 'ROBO01';

      const ROBO_PK = 'MACHINE#PI4G/TXMMIGI/26001';
      const CNC_PK = 'MACHINE#PI4G/TXMCNCI/26001';

      const isCnc =
        !isRobo && (
          isTestRoute ||
          pkParam.includes('TXMCNCI') ||
          pkParam.includes('CNC') ||
          compressorParam === 'CNC#01' ||
          compressorParam === 'CNC01' ||
          compressorParam.includes('TXMCNCI') ||
          pkParam.includes('MACHINE') ||
          compressorParam.includes('MACHINE')
        );

      try {
        const endpoint = isKpi
          ? KPI_ENDPOINT
          : (isTestRoute ? TEST_ROUTE_ENDPOINT : GRAPHDATA_ENDPOINT);
        const targetUrl = new URL(endpoint);

        urlObj.searchParams.forEach((val, key) => {
          targetUrl.searchParams.set(key, val);
        });

        if (isRobo) {
          if (isKpi) {
            targetUrl.searchParams.set('compressor', ROBO_PK);
            targetUrl.searchParams.delete('pk');
          } else {
            targetUrl.searchParams.set('pk', pkParam || ROBO_PK);
            targetUrl.searchParams.delete('compressor');
          }
        } else if (isCnc) {
          if (isKpi) {
            targetUrl.searchParams.set('compressor', CNC_PK);
            targetUrl.searchParams.delete('pk');
          } else {
            targetUrl.searchParams.set('pk', pkParam || CNC_PK);
            targetUrl.searchParams.delete('compressor');
          }
        } else {
          if (!targetUrl.searchParams.has('compressor')) {
            targetUrl.searchParams.set('compressor', compressorParam || 'CMP#02');
          }
        }

        if (isKpi) {
          let startDate = urlObj.searchParams.get('start_date');
          let endDate = urlObj.searchParams.get('end_date');
          const option =
            urlObj.searchParams.get('option') ||
            urlObj.searchParams.get('preset') ||
            urlObj.searchParams.get('range');

          if (!startDate || !endDate || startDate.trim() === '' || endDate.trim() === '') {
            const now = new Date();
            const format = (d: Date) => {
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              return `${y}-${m}-${day}`;
            };
            const currentDateStr = format(now);

            const opt = (option || '30days').toLowerCase().replace(/[\s_-]/g, '');
            if (opt === 'today') {
              startDate = currentDateStr;
              endDate = currentDateStr;
            } else if (opt === '7days' || opt === '7day' || opt === '7') {
              const d = new Date(now);
              d.setDate(now.getDate() - 7);
              startDate = format(d);
              endDate = currentDateStr;
            } else {
              const d = new Date(now);
              d.setDate(now.getDate() - 30);
              startDate = format(d);
              endDate = currentDateStr;
            }
          }

          targetUrl.searchParams.set('start_date', startDate);
          targetUrl.searchParams.set('end_date', endDate);
        }

        const response = await fetch(targetUrl.toString(), {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });

        const data = await response.json();
        res.statusCode = response.status;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify(data));
      } catch (err: any) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify({ error: err.message || 'Failed to fetch endpoint' }));
      }
      return;
    }

    // 3. Financial Intel (GET, POST & OPTIONS)
    const isFinancial =
      req.url.startsWith('/financial_intel') ||
      req.url.startsWith('/api/financial_intel');
    if (isFinancial) {
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
        res.end();
        return;
      }

      if (req.method === 'POST') {
        let bodyStr = '';
        req.on('data', (chunk: any) => { bodyStr += chunk; });
        req.on('end', async () => {
          try {
            const resp = await fetch(FINANCIAL_ENDPOINT, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: bodyStr || '{}',
            });
            const data = await resp.json();
            res.statusCode = resp.status;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify(data));
          } catch (err: any) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({ error: err.message || 'Financial intel POST proxy failed' }));
          }
        });
        return;
      }

      if (req.method === 'GET') {
        try {
          const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
          const targetUrl = new URL(FINANCIAL_ENDPOINT);
          urlObj.searchParams.forEach((val, key) => {
            targetUrl.searchParams.set(key, val);
          });
          const resp = await fetch(targetUrl.toString(), {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
          });
          const data = await resp.json();
          res.statusCode = resp.status;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify(data));
        } catch (err: any) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ error: err.message || 'Financial intel GET proxy failed' }));
        }
        return;
      }
    }

    // 4. Welding endpoint GET /welding or /api/welding
    const isWelding = req.url.startsWith('/welding') || req.url.startsWith('/api/welding');
    if (isWelding) {
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
        res.end();
        return;
      }
      if (req.method === 'GET') {
        try {
          const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
          const targetUrl = new URL(WELDING_ENDPOINT);
          urlObj.searchParams.forEach((val, key) => {
            targetUrl.searchParams.set(key, val);
          });
          const resp = await fetch(targetUrl.toString(), {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
          });
          const data = await resp.json();
          res.statusCode = resp.status;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify(data));
        } catch (err: any) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({ error: err.message || 'Welding proxy failed' }));
        }
        return;
      }
    }

    next();
  };

  return {
    name: 'unified-api-proxy',
    configureServer(server) {
      server.middlewares.use(proxyMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(proxyMiddleware);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), unifiedApiProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    envPrefix: ['VITE_', 'OPERATIONAL_', 'MANAGEMENT_', 'FINANCIAL_', 'ANALYZE_'],
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
