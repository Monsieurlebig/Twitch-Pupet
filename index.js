import puppeteer from 'puppeteer';

(async () => {
  const url = 'https://www.twitch.tv/mother3rd/clip/UgliestSourKangarooBudStar-m-1ELlDE0wvrnK0_'; // Remplace par l’URL du clip
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // Interception pour choper les flux médias si besoin
  let videoUrl = null;
  page.on('response', async response => {
    if (response.request().resourceType() === 'media') {
      const candidate = response.url();
      if (candidate.endsWith('.mp4') || candidate.includes('.m3u8')) {
        videoUrl = candidate;
      }
    }
  });

  await page.goto(url, { waitUntil: 'networkidle2' });

  // Clique sur le bouton "Commencer à regarder" si présent
  const button = await page.$('[data-a-target="content-classification-gate-overlay-start-watching-button"]');
  if (button) {
    await button.click();
    await page.waitForTimeout(1000);
  }

  // Attendre que la vidéo soit présente
  await page.waitForFunction(() => document.querySelector('video')?.src, { timeout: 15000 }).catch(() => {});

  // Essayer de récupérer l’URL directement
  if (!videoUrl) {
    videoUrl = await page.$eval('video', v => v.src).catch(() => null);
  }

  // Si toujours rien, attendre l’interception réseau
  if (!videoUrl) {
    await page.waitForTimeout(5000);
  }

  console.log('Video URL:', videoUrl);

  await browser.close();
})();
