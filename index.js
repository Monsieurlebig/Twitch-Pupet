import puppeteer from 'puppeteer';

const startUrls = [
    'https://www.twitch.tv/mother3rd/clip/UgliestSourKangarooBudStar-m-1ELlDE0wvrnK0_', // à remplacer par tes vraies URLs
];

const scrapeClip = async (url) => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--disable-gpu', '--no-sandbox'],
    });

    const page = await browser.newPage();
    console.log(`Scraping ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Vérifie si le bouton "Commencer à regarder" est présent
    const button = await page.$('[data-a-target="content-classification-gate-overlay-start-watching-button"]');
    if (button) {
        console.log("Bouton trouvé, on clique dessus...");
        await button.click();
        await page.waitForTimeout(1000);
    } else {
        console.log("Pas de bouton, on continue...");
    }

    // Attendre qu'une vidéo soit présente
    let videoUrl = null;
    try {
        await page.waitForFunction(() => document.querySelector('video')?.src, { timeout: 15000 });
        videoUrl = await page.$eval('video', video => video.src);
    } catch (err) {
        console.log("Pas de vidéo directe trouvée. Tentative dans les iframes...");
    }

    // Chercher dans les iframes si rien trouvé
    if (!videoUrl) {
        for (const frame of page.frames()) {
            try {
                videoUrl = await frame.$eval('video', video => video.src);
                if (videoUrl) {
                    console.log(`Vidéo trouvée dans iframe : ${videoUrl}`);
                    break;
                }
            } catch (e) {
                continue;
            }
        }
    }

    // Intercepter les requêtes réseau si toujours rien
    if (!videoUrl) {
        console.log('Tentative de récupération via les requêtes réseau...');
        page.on('response', async (response) => {
            if (response.request().resourceType() === 'media') {
                const url = response.url();
                console.log(`URL media détectée : ${url}`);
                videoUrl = url;
            }
        });
        await page.waitForTimeout(5000); // attendre que les requêtes passent
    }

    if (videoUrl) {
        console.log('✅ Clip trouvé !');
        console.log(JSON.stringify({ url, videoUrl }, null, 2));
    } else {
        console.warn(`⚠️ Aucun lien vidéo trouvé pour ${url}`);
    }

    await browser.close();
};

for (const url of startUrls) {
    await scrapeClip(url);
}
