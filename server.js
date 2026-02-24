const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs').promises;
const { PDFDocument } = require('pdf-lib');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// PDF generation options
const defaultPdfOptions = {
  format: 'A4',
  printBackground: true,
  margin: {
    top: '1cm',
    right: '1cm',
    bottom: '1cm',
    left: '1cm'
  }
};

// Reusable PDF generation function that accepts a browser instance
async function generatePdfFromUrlWithBrowser(browser, url, options = {}) {
  let page;
  try {
    page = await browser.newPage();

    // Set viewport and user agent
    await page.setViewport({ width: 1200, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    // Navigate to URL with timeout
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for page to fully load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate PDF with merged options
    const pdfOptions = { ...defaultPdfOptions, ...options };
    const pdf = await page.pdf(pdfOptions);

    return pdf;
  } catch (error) {
    console.error(`Error generating PDF for ${url}:`, error);
    throw error;
  } finally {
    if (page) {
      await page.close();
    }
  }
}

// Generate PDF from single URL
async function generatePdfFromUrl(url, options = {}) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: puppeteer.executablePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1200, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    // Navigate to URL with timeout
    await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    // Wait for page to fully load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate PDF
    const pdfOptions = { ...defaultPdfOptions, ...options };
    const pdf = await page.pdf(pdfOptions);
    
    return pdf;
  } catch (error) {
    console.error(`Error generating PDF for ${url}:`, error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/generate-pdf', async (req, res) => {
  try {
    const { urls, options } = req.body;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one URL' });
    }
    
    const pdfs = [];
    const errors = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      try {
        const pdf = await generatePdfFromUrl(url, options);
        pdfs.push({
          url,
          pdf: Buffer.from(pdf).toString('base64'),
          filename: `webpage_${i + 1}.pdf`
        });
      } catch (error) {
        errors.push({ url, error: error.message });
      }
    }
    
    res.json({
      success: true,
      pdfs,
      errors,
      totalProcessed: urls.length,
      successful: pdfs.length,
      failed: errors.length
    });
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/generate-merged-pdf', async (req, res) => {
  try {
    const { urls, options } = req.body;

    // Validate urls array
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one URL' });
    }

    let browser;
    const pdfBuffers = [];
    const errors = [];

    try {
      // Launch browser once
      browser = await puppeteer.launch({
        headless: 'new',
        executablePath: puppeteer.executablePath(),
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      // For each URL, generate PDF and store buffers or errors
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        try {
          const pdf = await generatePdfFromUrlWithBrowser(browser, url, options);
          pdfBuffers.push({
            url,
            buffer: pdf,
            index: i
          });
        } catch (error) {
          console.error(`Failed to generate PDF for ${url}:`, error);
          errors.push({
            url,
            error: error.message,
            index: i
          });
        }
      }

    } finally {
      // Close browser in finally
      if (browser) {
        await browser.close();
      }
    }

    // If no PDFs succeeded, return 500 error
    if (pdfBuffers.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate any PDFs from the provided URLs',
        totalUrls: urls.length,
        successful: 0,
        failed: errors.length,
        errors
      });
    }

    // Use PDF-lib to merge PDFs
    const mergedPdf = await PDFDocument.create();

    for (const pdfData of pdfBuffers) {
      try {
        // Load each PDF
        const pdf = await PDFDocument.load(pdfData.buffer);
        // Copy pages from source PDF
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        // Add all pages to merged PDF
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      } catch (error) {
        console.error(`Failed to merge PDF from ${pdfData.url}:`, error);
        errors.push({
          url: pdfData.url,
          error: `Failed to merge: ${error.message}`,
          index: pdfData.index
        });
      }
    }

    // Save merged PDF
    const mergedPdfBytes = await mergedPdf.save();
    const mergedPdfBase64 = Buffer.from(mergedPdfBytes).toString('base64');

    // Return response
    res.json({
      success: true,
      pdf: mergedPdfBase64,
      filename: 'merged_webpages.pdf',
      totalUrls: urls.length,
      successful: pdfBuffers.length,
      failed: errors.length,
      errors
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Download PDF endpoint
app.get('/download-pdf/:filename', (req, res) => {
  const { filename } = req.params;
  // This is a placeholder - in a real app you'd store PDFs temporarily
  res.status(404).json({ error: 'PDF not found on server' });
});

// Start server
app.listen(PORT, () => {
  console.log(`PDF Generator server running on http://localhost:${PORT}`);
});
