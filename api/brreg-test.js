/**
 * Brreg Test Endpoint - Clean Brreg API calls without URL parameters
 * Uses POST body to avoid HubSpot parameter pollution
 */

export default async function handler(req, res) {
  // Set CORS headers for HubSpot integration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-HubSpot-Signature-v3');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('=== BRREG TEST DEBUG ===');
  console.log('Method:', req.method);
  console.log('Query params:', req.query);
  console.log('Body:', req.body);
  console.log('Body type:', typeof req.body);
  console.log('Headers:', req.headers);
  console.log('========================');

  // Extract HubSpot metadata (will be present in all requests)
  const hubspotMeta = {
    userId: req.query.userId,
    appId: req.query.appId,
    portalId: req.query.portalId,
    userEmail: req.query.userEmail
  };

  console.log('HubSpot metadata:', hubspotMeta);

  try {
    let searchQuery = "PROPER AS"; // Default test case
    let action = "search";

    // Parse request data - CLEAN OUT HUBSPOT PARAMS FIRST!
    if (req.method === 'POST' && req.body) {
      // HubSpot sends body as object, not JSON string
      const bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      searchQuery = bodyData.query || searchQuery;
      action = bodyData.action || action;
      console.log('✅ CLEANED POST body data:', bodyData);
    } else if (req.method === 'GET') {
      // 🧹 CLEAN OUT HUBSPOT PARAMETERS - this is the key fix!
      const { userId, appId, portalId, userEmail, ...cleanQuery } = req.query;
      
      console.log('🚫 HubSpot params removed:', { userId, appId, portalId, userEmail });
      console.log('✅ Clean query params:', cleanQuery);
      
      searchQuery = cleanQuery.query || searchQuery;
      action = cleanQuery.action || action;
    }

    console.log(`Brreg test: ${action} for "${searchQuery}"`);

    // Make clean call to Brreg API (no query parameters from HubSpot)
    const brregUrl = `https://data.brreg.no/enhetsregisteret/api/enheter?navn=${encodeURIComponent(searchQuery)}&size=5`;
    
    console.log(`Calling Brreg: ${brregUrl}`);
    
    const response = await fetch(brregUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BusinessInfoProxy/1.0 BrregTest'
      }
    });

    if (!response.ok) {
      throw new Error(`Brreg API error: ${response.status} ${response.statusText}`);
    }

    const brregData = await response.json();
    
    // Extract useful info
    const companies = brregData._embedded?.enheter || [];
    const results = companies.map(company => ({
      name: company.navn,
      orgNumber: company.organisasjonsnummer,
      status: company.organisasjonsform?.beskrivelse || 'Unknown',
      municipality: company.forretningsadresse?.kommune || 'Unknown'
    }));

    return res.status(200).json({
      success: true,
      message: `Brreg test completed for "${searchQuery}"`,
      timestamp: new Date().toISOString(),
      hubspot_request: !!(hubspotMeta.userId || hubspotMeta.appId),
      search: {
        query: searchQuery,
        action: action,
        results_count: results.length
      },
      data: results,
      raw_count: companies.length,
      brreg_response_ok: response.ok
    });

  } catch (error) {
    console.error('Brreg test error:', error);
    
    return res.status(500).json({
      success: false,
      message: `Brreg test failed: ${error.message}`,
      timestamp: new Date().toISOString(),
      error: error.message,
      hubspot_request: !!(hubspotMeta.userId || hubspotMeta.appId)
    });
  }
}