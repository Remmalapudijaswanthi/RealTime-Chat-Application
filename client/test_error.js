import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('pageerror', err => {
    console.error('--- PAGE ERROR ---');
    console.error(err.message);
    console.error(err.stack);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('--- CONSOLE ERROR ---');
      console.error(msg.text());
    }
  });

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  console.log('Waiting 2 seconds...');
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
  console.log('Done.');
})();
