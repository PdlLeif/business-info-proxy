// Settings API endpoint for PD Brreg field mapping configuration
// Platform 2025.2 compatible settings storage with Supabase

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Default field mappings for new portals
const DEFAULT_MAPPINGS = {
  'organisasjonsnummer': 'organizationnumber',
  'navn': 'name',
  'organisasjonsform.beskrivelse': 'company_type',
  'naeringskode1.beskrivelse': 'industry',
  'antallAnsatte': 'numberofemployees',
  'forretningsadresse.adresselinje1': 'address',
  'forretningsadresse.poststed': 'city',
  'forretningsadresse.postnummer': 'zip',
  'hjemmeside': 'website',
  'telefon': 'phone'
};

export default async (req, res) => {
  console.log('=== SETTINGS API REQUEST ===');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  console.log('Query params:', req.query);

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Simple API key validation - check header first, then query, then body (support short and long names)
  const apiKey = req.headers['x-api-key'] || req.query.k || req.body?.apiKey || req.body?.k || 'brreg2025';
  const validApiKey = process.env.BRREG_API_KEY || 'brreg2025';
  
  if (apiKey !== validApiKey) {
    console.log('❌ Invalid API key provided:', apiKey);
    return res.status(403).json({
      error: 'Invalid API key'
    });
  }

  try {
    // Support both short and long parameter names to reduce header size
    const portalId = req.query.portalId || req.query.p || req.body?.portalId || req.body?.p || 'default';
    const type = req.query.type || req.query.t || req.body?.type || req.body?.t;

    console.log('Portal ID:', portalId);
    console.log('Type:', type);

    if (req.method === 'GET') {
      // Retrieve settings from Supabase
      console.log('Getting settings for portal:', portalId);
      
      if (!portalId || (type !== 'field_mappings' && type !== 'fm')) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing portalId or invalid type' 
        });
      }

      const { data, error } = await supabase
        .from('field_mappings')
        .select('mappings, updated_at')
        .eq('portal_id', portalId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK
        console.error('Supabase error:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(200).json({
        success: true,
        data: data?.mappings || DEFAULT_MAPPINGS,
        updated_at: data?.updated_at,
        portal_id: portalId
      });

        } else if (req.method === 'POST') {
      // Store settings in Supabase
      const mappings = req.body?.data || req.body?.d || req.body?.mappings;
      
      if (!portalId || !mappings || (type !== 'field_mappings' && type !== 'fm')) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing portalId, mappings, or invalid type' 
        });
      }

    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error) {
    console.error('Settings API error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};