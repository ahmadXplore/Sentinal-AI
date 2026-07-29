const axios = require('axios');

class ThreatIntelService {
  constructor() {
    this.abuseIPDBKey = process.env.ABUSEIPDB_API_KEY;
    this.otxKey = process.env.OTX_API_KEY;
  }

  async checkIPReputation(ip) {
    if (!this.abuseIPDBKey) {
      console.warn('AbuseIPDB API key not configured, skipping check.');
      return { risk: 0, reports: 0 };
    }
    
    try {
      const response = await axios.get('https://api.abuseipdb.com/api/v2/check', {
        params: { ipAddress: ip, maxAgeInDays: 90 },
        headers: {
          'Accept': 'application/json',
          'Key': this.abuseIPDBKey
        }
      });
      
      const data = response.data.data;
      return {
        risk: data.abuseConfidenceScore,
        reports: data.totalReports,
        country: data.countryCode,
        domain: data.domain
      };
    } catch (error) {
      console.error('AbuseIPDB Error:', error.message);
      return { risk: 0, reports: 0 };
    }
  }

  async enrichIOC(ioc, type = 'ip') {
    if (!this.otxKey) {
      console.warn('AlienVault OTX API key not configured, skipping enrichment.');
      return { pulses: 0 };
    }
    
    let indicatorType = 'IPv4';
    if (type === 'hash') indicatorType = 'file';
    if (type === 'domain') indicatorType = 'domain';
    
    try {
      const response = await axios.get(`https://otx.alienvault.com/api/v1/indicators/${indicatorType}/${ioc}/general`, {
        headers: { 'X-OTX-API-KEY': this.otxKey }
      });
      
      return {
        pulses: response.data.pulse_info.count,
        tags: response.data.pulse_info.pulses.flatMap(p => p.tags)
      };
    } catch (error) {
      console.error('AlienVault OTX Error:', error.message);
      return { pulses: 0 };
    }
  }
}

module.exports = new ThreatIntelService();
