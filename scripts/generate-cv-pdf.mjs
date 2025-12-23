import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function generatePDF() {
  const templatePath = join(__dirname, '../public/cv-template.html');
  const outputPath = join(__dirname, '../public/cv-aaron-perez.pdf');

  // Verificar que el template existe
  if (!existsSync(templatePath)) {
    console.error('❌ Template not found:', templatePath);
    process.exit(1);
  }

  console.log('🔄 Generating CV PDF...');
  const startTime = Date.now();

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--font-render-hinting=none',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  try {
    const page = await browser.newPage();

    // Cargar el HTML template
    await page.goto(`file://${templatePath}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Esperar a que las fuentes carguen
    await page.evaluateHandle('document.fonts.ready');

    // Pequeña pausa para asegurar renderizado completo
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generar PDF
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ CV PDF generated in ${duration}s: ${outputPath}`);

  } catch (error) {
    console.error('❌ PDF generation failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

generatePDF();
