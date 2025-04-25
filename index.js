import puppeteer from 'puppeteer-core';

const startUrls = [
  'https://www.twitch.tv/mother3rd/clip/UgliestSourKangarooBudStar-m-1ELlDE0wvrnK0_', // remplace par tes clips
];

const scrapeClip = async (url) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: '/usr/bin/chromium-browser', // chemin classique sur Leapcell / Docker
  });

  const page = await browser.newPage();
  console.log(`🔍 Scraping ${url}`);
  await page.goto(url, { waitUntil: 'networkidle2' });

  const button = await page.$('[data-a-target="content-classification-gate-overlay-start-watching-button"]');
  if (button) {
    console.log("👉 Bouton 'Commencer à regarder' trouvé, clic...");
    await button.click();
    await page.waitForTimeout(1000);
  }

  let videoUrl = null;

  try {
    await page.waitForFunction(() => document.querySelector('video')?.src, { timeout: 15000 });
    videoUrl = await page.$eval('video', video => video.src);
  } catch {
    console.log("🚫 Vidéo directe introuvable, on tente les iframes...");
  }

  if (!videoUrl) {
    for (const frame of page.frames()) {
      try {
        videoUrl = await frame.$eval('video', video => video.src);
        if (videoUrl) {
          console.log(`📹 Vidéo trouvée dans une iframe : ${videoUrl}`);
          break;
        }
      } catch {
        continue;
      }
    }
  }

  if (!videoUrl) {
    console.log('📡 Recherche dans les requêtes réseau...');
    page.on('response', async (response) => {
      if (response.request().resourceType() === 'media') {
        const url = response.url();
        if (url.endsWith('.mp4')) {
          console.log(`🎯 Clip détecté : ${url}`);
          videoUrl = url;
        }
      }
    });

    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForTimeout(5000);
  }

  if (videoUrl) {
    console.log('✅ Clip trouvé !');
    console.log(JSON.stringify({ url, videoUrl }, null, 2));
  } else {
    console.warn(`⚠️ Aucun lien vidéo trouvé pour ${url}`);
  }

  await browser.close();
};

(async () => {
  for (const url of startUrls) {
    await scrapeClip(url);
  }
})();
