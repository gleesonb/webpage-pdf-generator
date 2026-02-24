# Merged PDF Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the `/generate-merged-pdf` endpoint to combine multiple webpages into a single PDF document.

**Architecture:** Single Puppeteer browser session generates individual PDF buffers for each URL, then PDF-lib merges them into one document.

**Tech Stack:** Node.js, Express, Puppeteer, PDF-lib

---

## Task 1: Add PDF-lib Dependency

**Files:**
- Modify: `package.json`

**Step 1: Add PDF-lib to dependencies**

Edit `package.json` and add to dependencies section:
```json
"pdf-lib": "^1.17.1"
```

**Step 2: Install the dependency**

Run: `npm install`

**Step 3: Verify installation**

Run: `npm list pdf-lib`
Expected: `pdf-lib@1.17.1`

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add pdf-lib for PDF merging"
```

---

## Task 2: Refactor PDF Generation to Reusable Function

**Files:**
- Modify: `server.js:33-70`

**Step 1: Extract browser launch logic**

The current `generatePdfFromUrl` function launches a new browser each time. We need a version that accepts an existing browser instance.

Add new function after `defaultPdfOptions` constant:

```javascript
// Generate PDF from URL using existing browser instance
async function generatePdfFromUrlWithBrowser(browser, url, options = {}) {
  try {
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

    await page.close();
    return pdf;
  } catch (error) {
    console.error(`Error generating PDF for ${url}:`, error);
    throw error;
  }
}
```

**Step 2: Commit**

```bash
git add server.js
git commit -m "refactor: add reusable PDF generation function"
```

---

## Task 3: Implement Merged PDF Endpoint

**Files:**
- Modify: `server.js:117-165`

**Step 1: Replace the placeholder implementation**

Replace the entire `/generate-merged-pdf` endpoint with:

```javascript
app.post('/generate-merged-pdf', async (req, res) => {
  try {
    const { urls, options } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one URL' });
    }

    let browser;
    const pdfBuffers = [];
    const errors = [];

    try {
      // Launch browser once for all URLs
      browser = await puppeteer.launch({
        headless: 'new',
        executablePath: puppeteer.executablePath(),
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      // Generate PDF for each URL
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        try {
          const pdf = await generatePdfFromUrlWithBrowser(browser, url, options);
          pdfBuffers.push(pdf);
        } catch (error) {
          errors.push({ url, error: error.message });
        }
      }

    } finally {
      if (browser) {
        await browser.close();
      }
    }

    // Check if we successfully generated any PDFs
    if (pdfBuffers.length === 0) {
      return res.status(500).json({
        error: 'Failed to generate PDFs from any of the provided URLs',
        errors
      });
    }

    // Merge PDFs using PDF-lib
    const mergedPdf = await PDFDocument.create();
    const pdfOptions = { ...defaultPdfOptions, ...options };

    for (const pdfBuffer of pdfBuffers) {
      const pdf = await PDFDocument.load(pdfBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    // Generate merged PDF bytes
    const mergedPdfBytes = await mergedPdf.save();

    res.json({
      success: true,
      pdf: Buffer.from(mergedPdfBytes).toString('base64'),
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
```

**Step 2: Update require statements**

Add PDF-lib import at the top of server.js after existing imports:

```javascript
const { PDFDocument } = require('pdf-lib');
```

**Step 3: Commit**

```bash
git add server.js
git commit -m "feat: implement merged PDF endpoint"
```

---

## Task 4: Test with Local Server

**Step 1: Start the server**

Run: `npm start`

**Step 2: Verify server starts**

Expected output: `PDF Generator server running on http://localhost:3000`

**Step 3: Test individual PDF endpoint still works**

Run: `curl -X GET http://localhost:3000/health`
Expected: `{"status":"OK","timestamp":"..."}`

**Step 4: Open browser and test UI**

1. Navigate to `http://localhost:3000`
2. Add 2-3 valid URLs
3. Click "Generate Merged PDF"
4. Verify download works

**Step 5: Test error handling**

1. Add mix of valid and invalid URLs
2. Click "Generate Merged PDF"
3. Verify partial PDF is returned with error details

**Step 6: Commit**

```bash
git add .
git commit -m "test: verify merged PDF functionality works"
```

---

## Task 5: Docker Testing

**Files:**
- Test: `docker-compose.yml`

**Step 1: Build and run with Docker**

Run: `docker-compose up -d --build`

**Step 2: Check container health**

Run: `docker-compose ps`
Expected: Status shows "Up (healthy)"

**Step 3: Test merged PDF via container**

1. Navigate to `http://localhost:3000`
2. Test with multiple URLs
3. Verify merged PDF downloads correctly

**Step 4: Check logs**

Run: `docker-compose logs pdf-generator`
Expected: No errors, successful PDF generation

**Step 5: Stop containers**

Run: `docker-compose down`

**Step 6: Commit**

```bash
git add .
git commit -m "test: verify merged PDF works in Docker"
```

---

## Task 6: Update README with Docker Instructions

**Files:**
- Modify: `README.md`

**Step 1: Update Quick Start section**

After the existing "Access the application" line, add:

```markdown
### Using Docker (Recommended for Development)

**Quick start with existing image:**
```bash
docker pull ghcr.io/gleesonb/webpage-pdf-generator:latest
docker run -p 3000:3000 ghcr.io/gleesonb/webpage-pdf-generator:latest
```

**Build and run locally:**
```bash
docker-compose up -d
```

**View logs:**
```bash
docker-compose logs -f pdf-generator
```

**Stop the application:**
```bash
docker-compose down
```
```

**Step 2: Add Docker troubleshooting section**

Before the "License" section, add:

```markdown
### Docker Quick Reference

| Command | Description |
|---------|-------------|
| `docker-compose up -d` | Start in detached mode |
| `docker-compose logs -f` | Follow logs in real-time |
| `docker-compose down` | Stop and remove containers |
| `docker-compose restart` | Restart the service |
| `docker-compose ps` | Check container status |
| `docker exec -it pdf-generator sh` | Access container shell |

**Common Docker Issues:**

1. **Port already in use:**
   ```bash
   # Check what's using port 3000
   lsof -i :3000
   # Or use a different port
   docker-compose run -p 3001:3000 pdf-generator
   ```

2. **Container won't start:**
   ```bash
   # Check logs
   docker-compose logs pdf-generator
   # Rebuild from scratch
   docker-compose build --no-cache
   ```

3. **Permission denied on volume:**
   ```bash
   # Fix downloads directory permissions
   sudo chmod -R 755 ./downloads
   ```
```

**Step 3: Add API usage examples section**

After the "API Endpoints" section, add:

```markdown
### API Usage Examples

**Generate individual PDFs:**
```bash
curl -X POST http://localhost:3000/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://example.com"],
    "options": {
      "format": "A4",
      "landscape": false
    }
  }'
```

**Generate merged PDF:**
```bash
curl -X POST http://localhost:3000/generate-merged-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://example.com",
      "https://github.com"
    ],
    "options": {
      "format": "A4",
      "landscape": false,
      "margin": {
        "top": "1cm",
        "right": "1cm",
        "bottom": "1cm",
        "left": "1cm"
      }
    }
  }'
```
```

**Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add comprehensive Docker instructions and API examples"
```

---

## Task 7: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update the merged PDF note**

Find the "Known Issue" section and replace with:

```markdown
**Merged PDF**: The `/generate-merged-pdf` endpoint now fully works. It generates a single PDF by merging multiple webpages sequentially using PDF-lib. Each webpage flows naturally across pages. If some URLs fail, the endpoint returns a partial merge with error details.
```

**Step 2: Add PDF-lib to tech stack**

In the Architecture section, update the Puppeteer line:
```markdown
- **Puppeteer** for headless Chrome PDF generation
- **PDF-lib** for merging multiple PDFs into one document
```

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with merged PDF implementation details"
```

---

## Task 8: Final Verification

**Step 1: Run full test suite**

1. Start server: `npm start`
2. Test individual PDF generation
3. Test merged PDF with 2+ URLs
4. Test with invalid URLs
5. Test different PDF options
6. Stop server

**Step 2: Test in Docker**

1. `docker-compose up -d --build`
2. Test all endpoints via web UI
3. Check logs for errors
4. `docker-compose down`

**Step 3: Verify documentation**

1. Check README.md for accuracy
2. Check CLAUDE.md for accuracy
3. Verify all commands work

**Step 4: Create tag**

```bash
git tag -a v1.1.0 -m "Release v1.1.0: Add merged PDF functionality"
git push origin main --tags
```

**Step 5: Final commit**

```bash
git add .
git commit -m "release: v1.1.0 - merged PDF feature complete"
```

---

## Summary

This plan implements the merged PDF functionality through:
1. Adding PDF-lib dependency
2. Refactoring for reusable PDF generation
3. Implementing the merged endpoint with proper error handling
4. Comprehensive testing (local and Docker)
5. Documentation updates (README and CLAUDE.md)

**Total estimated time:** 45-60 minutes
**Total commits:** 8
