# Business Info Proxy

Universal business information API proxy designed for HubSpot integrations. Currently supports Norwegian Brønnøysundregistrene (Brreg) with extensible architecture for additional business data providers.

## 🚀 Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FPdlLeif%2Fbusiness-info-proxy)

## Features

- **Universal API**: Consistent interface for multiple business data providers
- **HubSpot Ready**: CORS-enabled for HubSpot custom cards and workflows
- **Norwegian Business Registry**: Full Brreg integration with search by name or organization number
- **Serverless**: Optimized for Vercel serverless functions
- **Extensible**: Easy to add new business data providers
- **Health Monitoring**: Built-in health checks and status monitoring

## API Endpoints

### POST /api/business-info
Main endpoint for business information lookup.

**Request Body:**
```json
{
  "searchType": "organisasjonsnummer" | "navn",
  "searchValue": "974760673" | "Equinor ASA",
  "provider": "brreg" // optional, defaults to "brreg"
}
```

**Response:**
```json
{
  "provider": "brreg",
  "searchType": "organisasjonsnummer",
  "searchValue": "974760673",
  "timestamp": "2025-10-20T12:00:00.000Z",
  "data": { /* Brreg API response */ },
  "success": true
}
```

### GET /api/health
Service health check and provider status.

**Response:**
```json
{
  "service": "business-info-proxy",
  "status": "healthy",
  "timestamp": "2025-10-20T12:00:00.000Z",
  "providers": {
    "brreg": {
      "status": "healthy",
      "responseTime": "normal"
    }
  }
}
```

## HubSpot Integration Example

```javascript
// In your HubSpot custom card
const lookupBusiness = async (orgNumber) => {
  try {
    const response = await fetch('https://your-deployment.vercel.app/api/business-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        searchType: 'organisasjonsnummer',
        searchValue: orgNumber,
        provider: 'brreg'
      })
    });

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Business lookup failed:', error);
    return null;
  }
};
```

## Deployment Instructions

### 1. GitHub Repository Setup
```bash
# Clone this repository
git clone https://github.com/PdlLeif/business-info-proxy.git
cd business-info-proxy
```

### 2. Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod
```

### 3. Alternative: Deploy via Vercel Dashboard
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Deploy with default settings

## Supported Providers

### Norwegian Brønnøysundregistrene (Brreg)
- **Search Types**: `organisasjonsnummer`, `navn`
- **API**: https://data.brreg.no/enhetsregisteret/api/
- **Coverage**: All Norwegian businesses and organizations

### Future Providers (Planned)
- **Swedish Bolagsverket**: Swedish business registry
- **Danish CVR**: Danish business registry  
- **EU Business Registers**: European business data
- **Custom Data Sources**: Internal business databases

## Development

### Local Development
```bash
npm install
npm run dev
```

### Testing
```bash
# Test health endpoint
curl https://your-deployment.vercel.app/api/health

# Test business lookup
curl -X POST https://your-deployment.vercel.app/api/business-info \
  -H "Content-Type: application/json" \
  -d '{"searchType":"organisasjonsnummer","searchValue":"974760673"}'
```

## Error Handling

The API provides comprehensive error responses:

- **400 Bad Request**: Missing or invalid parameters
- **405 Method Not Allowed**: Unsupported HTTP method
- **500 Internal Server Error**: Service or provider errors
- **503 Service Unavailable**: Provider connectivity issues

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- GitHub Issues: [business-info-proxy/issues](https://github.com/PdlLeif/business-info-proxy/issues)
- Email: proper-deal@business.com