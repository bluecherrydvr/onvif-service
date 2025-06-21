type TopicMatch = {
  type: string;
  label: string;
};

/**
 * Scans the topic tree recursively to extract ONVIF event types.
 * This is used as a fallback when getEventProperties() is insufficient or fails.
 */
export function scanTopicTree(
  node: any,
  path: string,
  matches: TopicMatch[] = []
): TopicMatch[] {
  if (!node || typeof node !== 'object') return matches;

  for (const key of Object.keys(node)) {
    if (key === '$') continue; // Skip metadata

    const child = node[key];
    const newPath = path ? `${path}/${key}` : key;

    if (typeof child === 'object' && child.messageDescription) {
      // Determine a simplified type based on topic path
      const type = extractTypeFromPath(newPath);
      const label = getLabelFromType(type);

      matches.push({ type, label });
    }

    scanTopicTree(child, newPath, matches);
  }

  return matches;
}

/**
 * Extracts a simple type string from a full ONVIF topic path.
 */
function extractTypeFromPath(path: string): string {
  const parts = path.toLowerCase().split('/');
  return parts[parts.length - 1]; // last part
}

/**
 * Maps an event type to a user-friendly label.
 */
function getLabelFromType(type: string): string {
  switch (type) {
    case 'motion':
    case 'motionalarm':
    case 'cellmotiondetector':
      return 'Motion Detection';
    case 'facedetect':
      return 'Face Detection';
    case 'peopledetect':
      return 'Person Detection';
    case 'vehicledetect':
      return 'Vehicle Detection';
    case 'dogcatdetect':
      return 'Animal Detection';
    case 'sound':
      return 'Audio Detection';
    default:
      return 'Motion Detection'; // Default fallback
  }
}

