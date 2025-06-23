export function extractTypeFromTopic(topic: string): string {
  const parts = topic.split('/');
  return parts[parts.length - 1].toLowerCase();
}

export function getLabelFromTopic(topic: string): string {
  const type = extractTypeFromTopic(topic);

  const labelMap: Record<string, string> = {
    motion: 'Motion Detection',
    motionalarm: 'Motion Alarm',
    facedetect: 'Face Detection',
    peopledetect: 'People Detection',
    vehicledetect: 'Vehicle Detection',
    dogcatdetect: 'Animal Detection',
    configurationchanged: 'Config Change',
    profilechanged: 'Profile Change',
    imagingservice: 'Image Quality Issue',
  };

  return labelMap[type] || 'Generic Event';
}

