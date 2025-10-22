/**
 * Dummy Test Endpoint - Tests parameter handling
 * Shows how HubSpot parameters are automatically injected
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

  console.log('=== DUMMY ENDPOINT DEBUG ===');
  console.log('Method:', req.method);
  console.log('Query params:', req.query);
  console.log('Body:', req.body);
  console.log('Headers:', Object.keys(req.headers));
  console.log('Full URL:', req.url);
  console.log('============================');

  // Extract HubSpot parameters that are automatically added
  const hubspotParams = {
    userId: req.query.userId,
    appId: req.query.appId,
    portalId: req.query.portalId,
    userEmail: req.query.userEmail
  };

  // Extract our custom parameters
  const customParams = { ...req.query };
  delete customParams.userId;
  delete customParams.appId;
  delete customParams.portalId;
  delete customParams.userEmail;

  // Check if this looks like a HubSpot request
  const isHubSpotRequest = !!(hubspotParams.userId || hubspotParams.appId);

  return res.status(200).json({
    success: true,
    message: "Dummy endpoint working!",
    timestamp: new Date().toISOString(),
    request_analysis: {
      method: req.method,
      is_hubspot_request: isHubSpotRequest,
      total_params: Object.keys(req.query).length,
      hubspot_params: hubspotParams,
      custom_params: customParams,
      has_signature_header: !!req.headers['x-hubspot-signature-v3'],
      has_timestamp_header: !!req.headers['x-hubspot-request-timestamp']
    },
    demo_data: {
      test_value: customParams.test || "ikke sendt",
      demo_value: customParams.demo || "ikke sendt",
      random_number: Math.floor(Math.random() * 1000)
    }
  });
}