const puppeteer = require('puppeteer');
const { Hono } = require('hono');
const { serve } = require('@hono/node-server');

const app = new Hono();

app.get('/', async (c) => {
  // Récupère l'URL à scraper depuis l'URL : /?url=https://exemple.com
  const url = c.req.query('url') || 'https://apify.com';

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--disable-gpu', '--no-sandbox'],
  });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle2' });

  // Clique sur le bouton si besoin
  const button = await page.$('[data-a-target="content-classification-gate-overlay-start-watching-button"]');
  if (button) {
    await button.click();
    await page.waitForTimeout(1000);
  }

  // Cherche la vidéo
  await page.waitForFunction(() => document.querySelector('video')?.src, { timeout: 15000 }).catch(() => {});
  let videoUrl = await page.$eval('video', video => video.src).catch(() => null);

  // Cherche dans les iframes si besoin
  if (!videoUrl) {
    for (const frame of page.frames()) {
      try {
        videoUrl = await frame.$eval('video', video => video.src);
        if (videoUrl) break;
      } catch (e) { continue; }
    }
  }

  // Intercepte les requêtes médias si besoin
  if (!videoUrl) {
    page.on('response', async response => {
      if (response.request().resourceType() === 'media') {
        videoUrl = response.url();
      }
    });
    await page.waitForTimeout(5000);
  }

  await browser.close();

  // Retourne le résultat en JSON
  return c.json({
    page: url,
    videoUrl: videoUrl || null,
    status: videoUrl ? 'ok' : 'not found'
  });
});

serve({ fetch: app.fetch, port: 8080 });
console.log('Serveur lancé sur le port 8080');
