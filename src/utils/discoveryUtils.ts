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
  const parsed = await parseStringPromise(xml, { explicitArray: false });

  const envelope = parsed['s:Envelope'] || parsed['env:Envelope'] || parsed['SOAP-ENV:Envelope'];
  if (!envelope) return [];

  const body = envelope['s:Body'] || envelope['SOAP-ENV:Body'] || envelope['env:Body'];
  if (!body) return [];

  const matches =
    body['d:ProbeMatches']?.['d:ProbeMatch'] ||
    body['wsdd:ProbeMatches']?.['wsdd:ProbeMatch'] ||
    body['ProbeMatches']?.['ProbeMatch'];

  if (!matches) return [];

  const probeMatches = Array.isArray(matches) ? matches : [matches];

  // Normalize and deduplicate by address
  const uniqueMap = new Map<string, any>();

  for (const match of probeMatches) {
    const xaddrs = match['d:XAddrs'] || match['wsdd:XAddrs'] || match['XAddrs'] || '';
    const types = match['d:Types'] || match['wsdd:Types'] || match['Types'] || '';
    const scopes = match['d:Scopes'] || match['wsdd:Scopes'] || match['Scopes'] || '';

    const address =
      match['wsa:EndpointReference']?.['wsa:Address'] ||
      match['a:EndpointReference']?.['a:Address'] ||
      match['wsadis:EndpointReference']?.['wsadis:Address'] ||
      match['EndpointReference']?.['Address'] || '';

    const normalizedAddress = address.replace(/^urn:/, '').trim();

    if (!uniqueMap.has(normalizedAddress)) {
      uniqueMap.set(normalizedAddress, {
        address,
        xaddrs: xaddrs.split(' '),
        types: types.split(' '),
        scopes: typeof scopes === 'string' ? scopes.split(' ') : [],
      });
    }
  }

  return Array.from(uniqueMap.values());
}

