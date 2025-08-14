import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import { DateTime } from 'luxon';

export function formatToCentralTime(timestampMs) {
  return DateTime
    .fromMillis(timestampMs, { zone: 'America/Chicago' })
    .toFormat('M/d/yyyy h:mm:ss a');
}


async function getJobDetails(po, authToken) {
    const url = `https://ops-apis.urgent.ly/v3//ops/jobs/${po}`;
    const headers = {
      'Content-Type': 'application/json; charset=UTF-8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'auth-token': authToken
    };
    
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (e) {
      console.error(`Error fetching job details:`, e);
      throw e;
    }
  }


async function getCaseDetails(casePo, authToken) {
    const url = `https://ops-apis.urgent.ly/v3/ops/cases/${casePo}`;
    const headers = {
      'Content-Type': 'application/json; charset=UTF-8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'auth-token': authToken
    };

    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (e) {
      console.error('Error fetching case details:', e);
      throw e;
    }
  }


   // Function to decode JWT token and extract payload
   function decodeJWT(token) {
     try {
       const parts = token.split('.');
       if (parts.length !== 3) {
         throw new Error('Invalid JWT format');
       }
       
       const payload = parts[1];
       const decoded = Buffer.from(payload, 'base64').toString('utf8');
       return JSON.parse(decoded);
     } catch (error) {
       console.error('Error decoding JWT:', error);
       return null;
     }
   }

   // Function to check if JWT token is expired
   function isTokenExpired(token) {
     const payload = decodeJWT(token);
     if (!payload || !payload.exp) {
       return { expired: null, message: 'Unable to determine expiration' };
     }
     
     const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
     const expirationTime = payload.exp; // JWT exp is in seconds
     const expired = currentTime >= expirationTime;
     
     const expirationDate = new Date(expirationTime * 1000);
     const timeRemaining = expirationTime - currentTime;
     
     return {
       expired,
       expirationTime: expirationDate,
       timeRemaining: timeRemaining > 0 ? timeRemaining : 0,
       message: expired 
         ? `Token expired on ${formatToCentralTime(expirationTime * 1000)}`
         : `Token valid until ${formatToCentralTime(expirationTime * 1000)} (${Math.floor(timeRemaining / 60)} minutes remaining)`
     };
   }

   async function getAuthToken() {
      try {
        let auth_token_obj = await fs.readFile('./cookies.json');
        let auth_token = JSON.parse(auth_token_obj)["data"][0]["authToken"];
        
        // Check token expiration
        const tokenStatus = isTokenExpired(auth_token);
        console.log('Token Status:', tokenStatus.message);
        
        if (tokenStatus.expired) {
          console.warn('⚠️  WARNING: Auth token is expired!');
        } else {
          console.log('✅ Auth token is valid');
        }
        
        return {
          token: auth_token,
          isExpired: tokenStatus.expired
        };
      } catch (error) {
        console.error("Error reading auth token:", error);
        return {
          token: null,
          isExpired: null
        };
      }
    }


    // Extraction logic
  function extractJobInfo(obj) {
    // console.log("///// object raw ///////",obj)
    console.log("//// case ID ////: ",obj.caseDTO.id)
    let drop_off = null;
    let notes=obj?.service?.notes;
    notes=notes?.split("\n");   
    // console.log(notes); 

    if(notes){
    for (let i = 0; i < notes.length; i++) {
        if(notes[i].includes("dropped off")){
           drop_off = notes[i+1]; 
        }
    }
    }
    return {
     completionTime:formatToCentralTime(obj?.service?.completeTimestamp ? obj?.service?.completeTimestamp:  Date.now()),
     caseDTO:obj.caseDTO.id,
      po_number: obj?.service?.number ?? null,
      service_type: obj?.service?.serviceType ?? null,
      customer: obj?.service?.contactName ?? obj?.personalInfo?.name ?? null,
      phone: obj?.service?.contactPhoneNumber ?? obj?.personalInfo?.phone ?? null,
      price: obj?.provider?.costs?.[0]?.price ?? obj?.servicePrice?.totalOfferPrice ?? null,
      pickup_location: obj?.location?.address ?? null,
      drop_off: drop_off,
      vehicle: obj?.vehicle 
        ? `${obj.vehicle.year} ${obj.vehicle.make} ${obj.vehicle.model} ${obj.vehicle.color}` 
        : null,
      vin_number: obj?.vehicle?.vin ?? null
    };
  }
  
  export { getJobDetails,getAuthToken,extractJobInfo,getCaseDetails };
