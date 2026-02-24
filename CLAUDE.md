# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Webpage PDF Generator - a Node.js/Express web application that converts multiple webpages into PDF documents using Puppeteer (headless Chrome). The application supports both individual PDF generation and merged PDFs from multiple URLs.

## Commands

### Development
```bash
npm install              # Install dependencies
npx puppeteer browsers install chrome  # Install Chrome for Puppeteer
npm start               # Start server (port 3000)
npm run dev             # Start with nodemon for auto-reload
```

### Docker
```bash
docker-compose up -d                    # Basic deployment
docker-compose -f docker-compose.prod.yml up -d  # Production with Nginx
./deploy.sh deploy-dev                  # Deploy from git (dev)
./deploy.sh deploy-prod                 # Deploy from git (production)
./deploy.sh set-repo <url>              # Set git repository URL
./deploy.sh update                      # Update running app
docker-compose logs -f pdf-generator    # View logs
docker-compose down                     # Stop services
```

### Testing Server
```bash
curl http://localhost:3000/health       # Health check
```

## Architecture

### Backend (server.js)
- **Express server** running on port 3000 (configurable via PORT env var)
- **Puppeteer** for headless Chrome PDF generation
- **PDF-lib** for merging multiple PDFs into a single document
- **Core function**: `generatePdfFromUrl(url, options)` - handles browser lifecycle, page navigation with networkidle2, and PDF generation
- **Middleware**: Helmet (security), CORS, express.json(), static file serving

### API Endpoints
- `GET /` - Serve the web UI
- `POST /generate-pdf` - Generate individual PDFs for each URL (returns array of base64-encoded PDFs)
- `POST /generate-merged-pdf` - Generate single combined PDF from multiple URLs using PDF-lib
- `GET /health` - Health check endpoint
- `GET /download-pdf/:filename` - Placeholder (not implemented)

### Frontend (public/index.html)
- **Single-file SPA** with embedded JavaScript
- **Tailwind CSS** via CDN for styling
- **Font Awesome** icons via CDN
- **Client-side features**:
  - URL parsing and validation (accepts newline or comma-separated)
  - PDF options: page size, orientation, margins (cm), background printing
  - Base64-to-blob conversion for client-side downloads
  - Real-time server health status

### PDF Generation Options (defaultPdfOptions)
```javascript
{
  format: 'A4',
  printBackground: true,
  margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
}
```

### Docker Configuration
- **Base image**: node:18-alpine with Chromium installed
- **Security**: Runs as non-root user (nodejs:nodejs, uid 1001)
- **Puppeteer config**: Uses system Chromium, skips download
- **Health check**: HTTP GET to /health every 30s
- **Production**: Includes Nginx reverse proxy with 60s timeouts for PDF generation

### Key Implementation Notes

**Puppeteer Browser Lifecycle**: Each PDF generation creates a new browser instance that is closed in the `finally` block. This prevents memory leaks but may impact performance for batch operations.

**Merged PDF Implementation**: The `/generate-merged-pdf` endpoint successfully merges multiple webpage PDFs into a single document using PDF-lib. Each URL is converted to a PDF buffer, then all PDFs are combined sequentially into a single merged document returned as base64.

**Client-side Downloads**: PDFs are returned as base64 strings and converted to Blob objects in the browser for download, not stored server-side.

**Timeout Configuration**: PDF generation can take 30+ seconds per URL. Nginx proxy timeouts are set to 60s to accommodate this.

## Environment Variables
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` - Set to true in Docker
- `PUPPETEER_EXECUTABLE_PATH` - Path to Chromium in Docker
