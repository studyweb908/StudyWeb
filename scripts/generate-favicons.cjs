const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

function createIco(pngEntries) {
  // pngEntries: array of { width, height, buffer }
  const count = pngEntries.length;
  const headerSize = 6;
  const entrySize = 16;
  let offset = headerSize + count * entrySize;
  
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images
  
  const entries = [];
  for (const item of pngEntries) {
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0); // Width
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1); // Height
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8); // Size of image data
    entry.writeUInt32LE(offset, 12); // Offset
    entries.push(entry);
    offset += item.buffer.length;
  }
  
  return Buffer.concat([header, ...entries, ...pngEntries.map(p => p.buffer)]);
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  const logoPath = path.join(__dirname, '..', 'public', 'logo.png');
  const imgData = fs.readFileSync(logoPath).toString('base64');
  
  await page.setContent(`
    <html>
      <body style='margin:0'>
        <canvas id='c'></canvas>
      </body>
    </html>
  `);
  
  // Extract emblem bounds dynamically from logo.png
  const bounds = await page.evaluate(async (b64) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.getElementById('c');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height).data;
        
        let minX = c.width, minY = c.height, maxX = 0, maxY = 0;
        for (let y = 0; y < c.height; y++) {
          for (let x = 0; x < c.width; x++) {
            const idx = (y * c.width + x) * 4;
            if (data[idx + 3] > 15) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        resolve({ minX, minY, w: maxX - minX + 1, h: maxY - minY + 1 });
      };
      img.src = 'data:image/png;base64,' + b64;
    });
  }, imgData);
  
  console.log('Detected emblem bounds:', bounds);
  
  const sizes = [16, 32, 48, 180, 192, 512];
  const generatedBuffers = {};
  
  for (const size of sizes) {
    const dataUrl = await page.evaluate(async ({ b64, bounds, size }) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.getElementById('c');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, size, size);
          
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // Tight 3% padding so the brand logo fills 94% of the favicon canvas prominently
          const padding = Math.max(1, Math.round(size * 0.03));
          const availSize = size - padding * 2;
          
          const scale = availSize / Math.max(bounds.w, bounds.h);
          const drawW = bounds.w * scale;
          const drawH = bounds.h * scale;
          const drawX = (size - drawW) / 2;
          const drawY = (size - drawH) / 2;
          
          ctx.drawImage(img, bounds.minX, bounds.minY, bounds.w, bounds.h, drawX, drawY, drawW, drawH);
          resolve(canvas.toDataURL('image/png'));
        };
        img.src = 'data:image/png;base64,' + b64;
      });
    }, { b64: imgData, bounds, size });
    
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    generatedBuffers[size] = Buffer.from(base64Data, 'base64');
  }
  
  await browser.close();
  
  const publicDir = path.join(__dirname, '..', 'public');
  
  // Write all standard sizes
  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), generatedBuffers[16]);
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), generatedBuffers[32]);
  fs.writeFileSync(path.join(publicDir, 'favicon-48x48.png'), generatedBuffers[48]);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatedBuffers[180]);
  fs.writeFileSync(path.join(publicDir, 'favicon-192x192.png'), generatedBuffers[192]);
  fs.writeFileSync(path.join(publicDir, 'favicon-512x512.png'), generatedBuffers[512]);
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), generatedBuffers[512]);
  
  // Generate multi-resolution favicon.ico
  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: generatedBuffers[16] },
    { width: 32, height: 32, buffer: generatedBuffers[32] },
    { width: 48, height: 48, buffer: generatedBuffers[48] }
  ]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  
  console.log('Favicon generation completed successfully!');
})();
