# Webpage PDF Generator

A powerful web application that converts multiple webpages into perfect PDF documents with customizable options.

## Features

- **Batch Processing**: Convert multiple URLs simultaneously
- **Individual PDFs**: Generate separate PDF files for each webpage
- **Merged PDF**: Combine all webpages into a single PDF document
- **Customizable Options**:
  - Page size (A4, A3, A5, Letter, Legal)
  - Orientation (Portrait/Landscape)
  - Adjustable margins
  - Background printing option
- **Modern UI**: Clean, responsive interface with real-time status updates
- **Error Handling**: Detailed error reporting for failed conversions
- **Docker Support**: Ready for containerized deployment

## Quick Start

### Using Docker Compose (Recommended)

1. **Clone and build**:
   ```bash
   git clone <repository-url>
   cd webpage-pdf-generator
   docker-compose up -d
   ```

2. **Access the application**: Open `http://localhost:3000`

### Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Install Puppeteer Chrome**:
   ```bash
   npx puppeteer browsers install chrome
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Open browser**: Navigate to `http://localhost:3000`

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

## Docker Deployment

### From Local Build

**Basic Deployment**:
```bash
docker-compose up -d
```

**Production Deployment**:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### From Git Repository (Recommended for CI/CD)

**Set your repository URL**:
```bash
./deploy.sh set-repo https://github.com/yourusername/webpage-pdf-generator.git
```

**Deploy from Git**:
```bash
# Development
./deploy.sh deploy-dev

# Production
./deploy.sh deploy-prod
```

**Update running application**:
```bash
./deploy.sh update
```

**Manual Git-based deployment**:
```bash
# Basic
docker-compose -f docker-compose.git.yml up -d

# Production with Nginx
docker-compose -f docker-compose.git-prod.yml up -d
```

### Docker Commands

- **Build image**: `docker build -t pdf-generator .`
- **Run container**: `docker run -p 3000:3000 pdf-generator`
- **View logs**: `docker-compose logs -f pdf-generator`
- **Stop service**: `docker-compose down`

## Configuration

### Environment Variables

- `NODE_ENV`: Set to `production` for production deployment
- `PORT`: Server port (default: 3000)

### Docker Volumes

- `./downloads:/app/downloads`: Persistent storage for downloaded PDFs

### Resource Limits

Production configuration includes:
- Memory limit: 1GB
- CPU limit: 0.5 cores
- Health checks every 30 seconds

## Usage

1. **Add URLs**: Enter webpage URLs (one per line or comma-separated) and click "Parse URLs"
2. **Configure Options**: Set your preferred PDF settings
3. **Generate PDFs**: Choose between individual PDFs or merged PDF
4. **Download**: Click the download button for each generated PDF

## API Endpoints

- `POST /generate-pdf`: Generate individual PDFs from URLs
- `POST /generate-merged-pdf`: Generate a single merged PDF from URLs
- `GET /health`: Server health check

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

## Technology Stack

- **Backend**: Node.js with Express
- **PDF Generation**: Puppeteer (headless Chrome)
- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
- **Containerization**: Docker with Alpine Linux
- **Proxy**: Nginx (production)

## Security Features

- Non-root Docker user
- Content Security Policy
- Rate limiting ready
- Health checks
- Resource limits

## Requirements

- Docker 20.10+
- Docker Compose 2.0+
- (For development) Node.js 14+

## Troubleshooting

### Docker Issues

1. **Chrome not found**: Ensure Chromium is installed in the container
2. **Permission errors**: Check volume permissions for downloads directory
3. **Memory issues**: Increase memory limits in docker-compose.prod.yml

### Common Issues

- **Timeout errors**: Increase proxy timeout in nginx.conf
- **PDF generation failures**: Check URL accessibility and network connectivity
- **Download issues**: Verify browser download settings

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

## License

MIT License
