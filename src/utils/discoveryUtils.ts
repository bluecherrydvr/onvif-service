import { parseStringPromise } from 'xml2js';

export function buildProbeMessage(messageId: string): string {
  return `
    <?xml version="1.0" encoding="UTF-8"?>
    <e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope"
                xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing"
                xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"
                xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
      <e:Header>
        <w:MessageID>uuid:${messageId}</w:MessageID>
        <w:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To>
        <w:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action>
      </e:Header>
      <e:Body>
        <d:Probe>
          <d:Types>dn:NetworkVideoTransmitter</d:Types>
        </d:Probe>
      </e:Body>
    </e:Envelope>
  `.trim();
}

export async function parseProbeMatch(xml: string): Promise<any[]> {
  // Clean up XML namespaces for parsing
  xml = xml.replace(/xmlns([^=]*?)=(".*?")/g, '');
  
  const parsed = await parseStringPromise(xml, { 
    explicitArray: false,
    attrkey: 'attr',
    charkey: 'payload',
    explicitCharkey: true,
    tagNameProcessors: [(name) => name.replace(/^[a-zA-Z]+:/, '')] // Strip namespace
  });

  const envelope = parsed['Envelope'] || parsed['env:Envelope'] || parsed['SOAP-ENV:Envelope'];
  if (!envelope) return [];

  const body = envelope['Body'] || envelope['SOAP-ENV:Body'] || envelope['env:Body'];
  if (!body) return [];

  const matches =
    body['ProbeMatches']?.['ProbeMatch'] ||
    body['wsdd:ProbeMatches']?.['wsdd:ProbeMatch'] ||
    body['ProbeMatches']?.['ProbeMatch'];

  if (!matches) return [];

  const probeMatches = Array.isArray(matches) ? matches : [matches];
  const devices: any[] = [];

  for (const match of probeMatches) {
    try {
      // Safely extract values with type checking
      let xaddrs = '';
      let types = '';
      let scopes = '';
      
      // Handle different possible structures for XAddrs
      if (match['XAddrs']) {
        if (typeof match['XAddrs'] === 'string') {
          xaddrs = match['XAddrs'];
        } else if (match['XAddrs'].payload) {
          xaddrs = match['XAddrs'].payload;
        } else if (Array.isArray(match['XAddrs'])) {
          xaddrs = match['XAddrs'].join(' ');
        }
      } else if (match['wsdd:XAddrs']) {
        if (typeof match['wsdd:XAddrs'] === 'string') {
          xaddrs = match['wsdd:XAddrs'];
        } else if (match['wsdd:XAddrs'].payload) {
          xaddrs = match['wsdd:XAddrs'].payload;
        } else if (Array.isArray(match['wsdd:XAddrs'])) {
          xaddrs = match['wsdd:XAddrs'].join(' ');
        }
      }
      
      // Handle different possible structures for Types
      if (match['Types']) {
        if (typeof match['Types'] === 'string') {
          types = match['Types'];
        } else if (match['Types'].payload) {
          types = match['Types'].payload;
        } else if (Array.isArray(match['Types'])) {
          types = match['Types'].join(' ');
        }
      } else if (match['wsdd:Types']) {
        if (typeof match['wsdd:Types'] === 'string') {
          types = match['wsdd:Types'];
        } else if (match['wsdd:Types'].payload) {
          types = match['wsdd:Types'].payload;
        } else if (Array.isArray(match['wsdd:Types'])) {
          types = match['wsdd:Types'].join(' ');
        }
      }
      
      // Handle different possible structures for Scopes
      if (match['Scopes']) {
        if (typeof match['Scopes'] === 'string') {
          scopes = match['Scopes'];
        } else if (match['Scopes'].payload) {
          scopes = match['Scopes'].payload;
        } else if (Array.isArray(match['Scopes'])) {
          scopes = match['Scopes'].join(' ');
        }
      } else if (match['wsdd:Scopes']) {
        if (typeof match['wsdd:Scopes'] === 'string') {
          scopes = match['wsdd:Scopes'];
        } else if (match['wsdd:Scopes'].payload) {
          scopes = match['wsdd:Scopes'].payload;
        } else if (Array.isArray(match['wsdd:Scopes'])) {
          scopes = match['wsdd:Scopes'].join(' ');
        }
      }
      
      // Extract device name and hardware from scopes
      let hardware = "";
      let name = "";
      const scopeArray = typeof scopes === 'string' ? scopes.split(' ') : [];
      
      for (let i = 0; i < scopeArray.length; i++) {
        if (scopeArray[i].includes('onvif://www.onvif.org/name')) {
          name = decodeURI(scopeArray[i].substring(27));
        }
        if (scopeArray[i].includes('onvif://www.onvif.org/hardware')) {
          hardware = decodeURI(scopeArray[i].substring(31));
        }
      }

      // Extract address with fallbacks
      let address = '';
      if (match['EndpointReference'] && match['EndpointReference']['Address']) {
        if (typeof match['EndpointReference']['Address'] === 'string') {
          address = match['EndpointReference']['Address'];
        } else if (match['EndpointReference']['Address'].payload) {
          address = match['EndpointReference']['Address'].payload;
        }
      } else if (match['a:EndpointReference'] && match['a:EndpointReference']['a:Address']) {
        if (typeof match['a:EndpointReference']['a:Address'] === 'string') {
          address = match['a:EndpointReference']['a:Address'];
        } else if (match['a:EndpointReference']['a:Address'].payload) {
          address = match['a:EndpointReference']['a:Address'].payload;
        }
      }

      // Extract IP and port from xaddrs
      const xaddrsArray = typeof xaddrs === 'string' ? xaddrs.split(' ') : [];
      const url = xaddrsArray.length > 0 ? xaddrsArray[0] : '';
      let ipv4 = '';
      let port = '80';
      
      try {
        if (url) {
          const urlObj = new URL(url);
          ipv4 = urlObj.hostname;
          port = urlObj.port || '80';
        } else {
          // If URL parsing fails, try to extract IP from address
          const ipMatch = address.match(/\d+\.\d+\.\d+\.\d+/);
          if (ipMatch) {
            ipv4 = ipMatch[0];
          }
        }
      } catch (e) {
        // If URL parsing fails, try to extract IP from address
        const ipMatch = address.match(/\d+\.\d+\.\d+\.\d+/);
        if (ipMatch) {
          ipv4 = ipMatch[0];
        }
      }

      // Only add the device if we have at least an IP address
      if (ipv4 || address) {
        devices.push({
          address,
          xaddrs: xaddrsArray,
          types: typeof types === 'string' ? types.split(' ') : [],
          scopes: scopeArray,
          manufacturer: name,
          model_name: hardware,
          ipv4,
          ipv4_path: url,
          ipv4_port: ipv4 ? `${ipv4}:${port}` : ''
        });
      }
    } catch (e) {
      console.error('Error processing device information:', e);
    }
  }

  return devices;
}

