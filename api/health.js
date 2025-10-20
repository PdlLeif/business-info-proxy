/**
 * Health Check Endpoint for Business Info Proxy
 * Monitors service status and API connectivity
 */

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test Brreg API connectivity
    const brregTest = await fetch('https://data.brreg.no/enhetsregisteret/api/enheter/974760673', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BusinessInfoProxy/1.0 HealthCheck'
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    const healthStatus = {
      service: 'business-info-proxy',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      providers: {
        brreg: {
          status: brregTest.ok ? 'healthy' : 'degraded',
          responseTime: brregTest.ok ? 'normal' : 'timeout',
          lastCheck: new Date().toISOString()
        }
      },
      endpoints: [
        {
          path: '/api/business-info',
          method: 'POST',
          description: 'Main business information lookup'
        },
        {
          path: '/api/health',
          method: 'GET',
          description: 'Service health check'
        }
      ]
    };

    return res.status(200).json(healthStatus);

  } catch (error) {
    console.error('Health check error:', error);
    
    const errorStatus = {
      service: 'business-info-proxy',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      providers: {
        brreg: {
          status: 'unreachable',
          error: 'Connection timeout or network error'
        }
      }
    };

    return res.status(503).json(errorStatus);
  }
}