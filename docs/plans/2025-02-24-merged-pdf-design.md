# Merged PDF Feature Design

**Date:** 2025-02-24
**Status:** Approved

## Overview

Implement the `/generate-merged-pdf` endpoint to combine multiple webpages into a single PDF document. Webpages will be merged sequentially with natural page flow.

## Requirements

- Combine multiple webpage URLs into a single PDF file
- Each webpage flows naturally across as many pages as needed
- No table of contents needed
- No visual separators between webpages
- Handle errors gracefully (continue with remaining URLs)
- Maintain consistency with existing `/generate-pdf` endpoint

## Architecture

### Approach: Single Browser Session

Use one Puppeteer browser instance to generate all PDFs, then merge using PDF-lib.

### Data Flow

```
Request → Validate URLs → Launch Browser
                              ↓
                    For each URL:
                      Navigate → Generate PDF → Store Buffer
                              ↓
                    Close Browser
                              ↓
                    Merge PDFs with PDF-lib
                              ↓
                    Return base64 + metadata
```

## Backend Changes

### New Dependency

```json
{
  "dependencies": {
    "pdf-lib": "^1.17.1"
  }
}
```

### Modified `/generate-merged-pdf` Endpoint

**Input:**
```javascript
{
  urls: ["https://example.com", "https://github.com"],
  options: { format: "A4", landscape: false, margin: {...}, printBackground: true }
}
```

**Logic:**
1. Validate URLs array
2. Launch single Puppeteer browser instance
3. For each URL:
   - Create new page
   - Set viewport and user agent
   - Navigate with networkidle2, 30s timeout
   - Wait 2s for page load
   - Generate PDF buffer
   - Store buffer or record error
4. Close browser
5. If no successful PDFs, return error
6. Merge all PDF buffers using PDF-lib
7. Return merged PDF as base64

**Output:**
```javascript
{
  success: true,
  pdf: "<base64 encoded merged PDF>",
  filename: "merged_webpages.pdf",
  totalUrls: 5,
  successful: 4,
  failed: 1,
  errors: [
    { url: "https://failed.com", error: "Error message" }
  ]
}
```

### Error Handling

- **All URLs fail:** Return 500 error with details
- **Some URLs fail:** Return successful merged PDF with `errors` array
- **Individual URL fails:** Log error, continue with remaining URLs
- **Browser launch fails:** Return 500 error

## Frontend Changes

No changes required. The frontend already expects this response format.

## Testing Considerations

- Test with 1 URL
- Test with multiple URLs
- Test with mix of valid and invalid URLs
- Test with timeout URLs
- Test PDF options (orientation, margins, page size)
- Verify merged PDF contains all pages in correct order

## Implementation Notes

- Reuse `defaultPdfOptions` from existing code
- Match error reporting style of `/generate-pdf` endpoint
- Keep browser launch args consistent: `['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']`
- Use existing timeout: 30s navigation + 2s wait
