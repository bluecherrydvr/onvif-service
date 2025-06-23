// File: src/utils/TopicUtils.ts

/**
 * A shared set to store topics received from live ONVIF event subscriptions.
 */
export const seenEventTopics = new Set<string>();

/**
 * Extracts the "type" from a topic string by taking the last segment,
 * lowercasing it and removing any whitespace.
 * 
 * For example, "RuleEngine/MyRuleDetector/FaceDetect" becomes "facedetect".
 */
export function extractTypeFromTopic(topic: string): string {
  return topic.split('/').pop()?.toLowerCase().replace(/\s+/g, '') || 'unknown';
}

/**
 * Returns a human-readable label for a given topic string.
 * It uses simple keyword matching to decide the label.
 * 
 * For example:
 * - If the topic contains "motionalarm", returns "Motion Detection"
 * - If the topic contains "face", returns "Face Detection"
 * - If the topic contains "people", returns "Person Detection"
 * - If the topic contains "vehicle", returns "Vehicle Detection"
 * - If the topic contains "dogcat", returns "Animal Detection"
 * 
 * Defaults to "Motion Detection" if no keyword is matched.
 */
export function getLabelFromTopic(topic: string): string {
  const lower = topic.toLowerCase();

  if (lower.includes('motionalarm')) return 'Motion Detection';
  if (lower.includes('cellmotiondetector')) return 'Motion Detection';
  if (lower.includes('face')) return 'Face Detection';
  if (lower.includes('people')) return 'Person Detection';
  if (lower.includes('vehicle')) return 'Vehicle Detection';
  if (lower.includes('dogcat')) return 'Animal Detection';

  return 'Motion Detection';
}

/**
 * Returns an array of live topics with both the extracted type and its corresponding label.
 */
export function getLiveTopics(): { type: string; label: string }[] {
  return Array.from(seenEventTopics).map(topic => ({
    type: extractTypeFromTopic(topic),
    label: getLabelFromTopic(topic)
  }));
}

