/**
 * Business Info API Proxy - Norwegian Brreg Integration
 * Universal proxy for business information services
 * Supports HubSpot integrations with proper CORS headers
 */

import crypto from 'crypto';

// HubSpot signature validation (lightweight version to avoid 431 errors)
function validateHubSpotSignature(req) {
  const signature = req.headers['x-hubspot-signature-v3'];
  const timestamp = req.headers['x-hubspot-request-timestamp'];
  
  // Just log if HubSpot headers are present - don't validate yet
  if (signature && timestamp) {
    console.log('HubSpot headers detected - signature length:', signature.length);
    return true;
  }
  
  console.log('No HubSpot signature headers found');
  return false;
}

export default async function handler(req, res) {
  // Set CORS headers for HubSpot integration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-HubSpot-Signature-v3');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Support both GET and POST requests
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ 
      error: 'Method not allowed', 
      message: 'Only GET and POST requests are supported',
      allowedMethods: ['GET', 'POST']
    });
  }

  try {
    let searchType, searchValue, provider;

    console.log('=== INCOMING REQUEST DEBUG ===');
    console.log('Method:', req.method);
    console.log('Query params:', req.query);
    console.log('Body:', req.body);
    console.log('Headers:', req.headers);
    console.log('Full URL:', req.url);
    console.log('================================');
    
    // Validate HubSpot signature (temporarily disabled to avoid 431 error)
    const isHubSpotRequest = validateHubSpotSignature(req);
    console.log('HubSpot request detected:', isHubSpotRequest);
    
    // Continue without blocking - we'll implement proper validation later

    // Parse parameters based on request method
    if (req.method === 'GET') {
      // GET: Extract from query parameters (ignore HubSpot's extra params)
      const { navn, organisasjonsnummer, userId, appId, portalId, userEmail, ...cleanQuery } = req.query;
      
      console.log('HubSpot extra params detected:', { userId, appId, portalId, userEmail: userEmail ? 'present' : 'missing' });
      console.log('Clean query params:', cleanQuery);
      
      if (navn) {
        searchType = 'navn';
        searchValue = navn;
      } else if (organisasjonsnummer) {
        searchType = 'organisasjonsnummer';
        searchValue = organisasjonsnummer;
      }
      
      provider = cleanQuery.provider || 'brreg';
      
    } else {
      // POST: Extract from body (legacy support)
      ({ searchType, searchValue, provider = 'brreg' } = req.body);
      
      // Also support simplified POST format
      if (!searchType && !searchValue && req.body.navn) {
        searchType = 'navn';
        searchValue = req.body.navn;
      }
    }

    // Validate required parameters
    if (!searchType || !searchValue) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Either "navn" or "organisasjonsnummer" parameter is required',
        examples: {
          GET: '/api/business-info?navn=PROPER+AS',
          POST: '{"navn": "PROPER AS"} or {"searchType": "navn", "searchValue": "PROPER AS"}'
        },
        debug: {
          method: req.method,
          queryParams: req.query,
          bodyParams: req.body,
          receivedParams: { searchType, searchValue, provider }
        }
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