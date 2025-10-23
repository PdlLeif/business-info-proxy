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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Simple API key validation (optional for GET, required for POST)
  const apiKey = req.headers['x-api-key'] || req.body?.apiKey;
  const expectedApiKey = process.env.BRREG_API_KEY || 'brreg2025'; // Fallback for testing
  
  if (req.method === 'POST') {
    if (!apiKey || apiKey !== expectedApiKey) {
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid or missing API key' 
      });
    }
  }

  try {
    const portalId = req.query.portalId || req.body?.portalId || 'default';
    const type = req.query.type || req.body?.type;

    console.log('Portal ID:', portalId);
    console.log('Type:', type);

    if (req.method === 'GET') {
      // Retrieve settings from Supabase
      console.log('Getting settings for portal:', portalId);
      
      if (!portalId || type !== 'field_mappings') {
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
      // Save settings to Supabase
      console.log('Saving settings for portal:', portalId);
      console.log('Request body:', req.body);

      const { data: mappings } = req.body;

      if (!portalId || type !== 'field_mappings' || !mappings) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields' 
        });
      }

      const { data, error } = await supabase
        .from('field_mappings')
        .upsert({
          portal_id: portalId,
          mappings: mappings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'portal_id'
        })
        .select();

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(200).json({
        success: true,
        data: data[0],
        message: 'Field mappings saved successfully',
        portal_id: portalId
      });

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