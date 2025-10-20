/**
 * Business Info API Proxy - Norwegian Brreg Integration
 * Universal proxy for business information services
 * Supports HubSpot integrations with proper CORS headers
 */

export default async function handler(req, res) {
  // Set CORS headers for HubSpot integration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests for data queries
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed', 
      message: 'Only POST requests are supported',
      allowedMethods: ['POST']
    });
  }

  try {
    const { searchType, searchValue, provider = 'brreg' } = req.body;

    // Validate required parameters
    if (!searchType || !searchValue) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'searchType and searchValue are required',
        receivedParams: { searchType, searchValue, provider }
      });
    }

    // Route to appropriate business info provider
    switch (provider.toLowerCase()) {
      case 'brreg':
      case 'norwegian':
        return await handleBrregRequest(searchType, searchValue, res);
      
      default:
        return res.status(400).json({
          error: 'Unsupported provider',
          message: `Provider '${provider}' is not supported`,
          supportedProviders: ['brreg', 'norwegian']
        });
    }

  } catch (error) {
    console.error('Business Info API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process business information request',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle Norwegian Brreg (Brønnøysundregistrene) requests
 */
async function handleBrregRequest(searchType, searchValue, res) {
  const validSearchTypes = ['organisasjonsnummer', 'navn'];
  
  if (!validSearchTypes.includes(searchType)) {
    return res.status(400).json({
      error: 'Invalid search type for Brreg',
      message: `searchType must be one of: ${validSearchTypes.join(', ')}`,
      received: searchType
    });
  }

  try {
    let brregUrl;
    
    if (searchType === 'organisasjonsnummer') {
      // Direct lookup by organization number
      brregUrl = `https://data.brreg.no/enhetsregisteret/api/enheter/${searchValue}`;
    } else if (searchType === 'navn') {
      // Search by name
      brregUrl = `https://data.brreg.no/enhetsregisteret/api/enheter?navn=${encodeURIComponent(searchValue)}&size=10`;
    }

    console.log(`Fetching from Brreg: ${brregUrl}`);
    
    const response = await fetch(brregUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BusinessInfoProxy/1.0 HubSpot-Integration'
      }
    });

    if (!response.ok) {
      console.error(`Brreg API error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({
        error: 'Brreg API error',
        message: `Failed to fetch data from Brreg: ${response.statusText}`,
        statusCode: response.status
      });
    }

    const data = await response.json();
    
    // Format response for consistent API structure
    const formattedResponse = {
      provider: 'brreg',
      searchType,
      searchValue,
      timestamp: new Date().toISOString(),
      data: data,
      success: true
    };

    return res.status(200).json(formattedResponse);

  } catch (error) {
    console.error('Brreg request error:', error);
    return res.status(500).json({
      error: 'Brreg service error',
      message: 'Failed to connect to Norwegian Business Registry',
      details: error.message
    });
  }
}