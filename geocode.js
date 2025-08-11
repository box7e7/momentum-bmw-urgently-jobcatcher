#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Simple test script to call the geocode endpoint with the required api-key header.
 * Usage: node geocode.js
 *
 * Make sure your .env contains a key named GEOCODE_API_KEY (or API_KEY).
 * Example:
 *   GEOCODE_API_KEY=NQqjUgEZ801iP9dFpO
 */

async function main() {
  const apiKey = process.env.GEOCODE_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.error('Missing GEOCODE_API_KEY (or API_KEY) in .env');
    process.exit(1);
  }

  const url = 'http://38.114.122.151:9096/geocode?address=7003%20bellerive%20dr%20houston,%20tx&zip=77074';
  try {
    const res = await fetch(url, {
      headers: {
        'api-key': apiKey
      },
      // optional: set a reasonable timeout by using AbortController if needed
    });

    console.log('HTTP status:', res.status, res.statusText);

    const text = await res.text();
    try {
      const json = JSON.parse(text);
      console.log('Response JSON:');
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Response (non-JSON):');
      console.log(text);
    }
  } catch (error) {
    console.error('Request failed:', error);
    process.exit(1);
  }
}

main();
