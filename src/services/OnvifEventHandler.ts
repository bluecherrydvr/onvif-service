import { OnvifDeviceWrapper, SUPPORTED_EVENT_TYPES } from './OnvifDeviceWrapper';
import { seenEventTopics, extractTypeFromTopic, getLabelFromTopic } from '../utils/TopicUtils';
import { Server } from '../server';
import { Logger } from '../utils/Logger';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Error types for better categorization
export enum OnvifErrorType {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  DEVICE_OFFLINE = 'DEVICE_OFFLINE',
  UNKNOWN = 'UNKNOWN'
}

interface DeviceStatus {
  lastError: string;
  errorType: OnvifErrorType;
  lastAttemptTime: Date;
  consecutiveFailures: number;
}

// Track device connection status
const deviceStatus = new Map<number, DeviceStatus>();

// Maximum number of consecutive failures before pausing attempts
const MAX_CONSECUTIVE_FAILURES = 5;
// Cooldown period in milliseconds (30 minutes)
const COOLDOWN_PERIOD = 30 * 60 * 1000;
// Notification retry settings
const NOTIFICATION_MAX_RETRIES = 3;
const NOTIFICATION_RETRY_DELAY = 5000; // 5 seconds

interface OnvifEventMessage {
  topic: string;
  type: string;
  label: string;
  data: {
    state: boolean;
    eventType: 'start' | 'stop';
    timestamp: string;
    message: any;
  };
}

interface OnvifDeviceInfo {
  ip_address: string;
  onvif_port: number;
  rtsp_username: string;
  rtsp_password: string;
}

// Map to store active device wrappers
export const deviceWrappers = new Map<number, OnvifDeviceWrapper>();

/**
 * Notify about a device connection issue
 * 
 * TODO: Implement a proper API endpoint in Bluecherry API to receive device status updates.
 * This would allow the main application to be aware of device connection issues.
 * The endpoint should be at /api/onvif/device-status and accept POST requests with device status information.
 */
async function notifyServerAboutDeviceIssue(deviceId: number, errorType: OnvifErrorType, errorMessage: string): Promise<void> {
  try {
    // Log the device issue locally instead of sending to Bluecherry service
    Logger.warn(`Device ${deviceId} connection issue: ${errorType} - ${errorMessage}`);
    
    // Store the error in our local tracking system
    const status = deviceStatus.get(deviceId) || {
      lastError: '',
      errorType: OnvifErrorType.UNKNOWN,
      lastAttemptTime: new Date(),
      consecutiveFailures: 0
    };
    
    status.lastError = errorMessage;
    status.errorType = errorType;
    status.lastAttemptTime = new Date();
    status.consecutiveFailures++;
    
    deviceStatus.set(deviceId, status);
    
    // Log detailed information about the device status
    Logger.info(`Device ${deviceId} status updated:`, {
      errorType,
      errorMessage,
      consecutiveFailures: status.consecutiveFailures,
      lastAttemptTime: status.lastAttemptTime,
      nextAttemptAllowed: shouldAttemptConnection(deviceId)
    });
  } catch (error) {
    Logger.error(`Failed to log device ${deviceId} issue:`, error);
  }
}

/**
 * Determine the error type from the error message
 */
function determineErrorType(error: Error): OnvifErrorType {
  const errorMessage = error.message.toLowerCase();
  
  if (errorMessage.includes('timeout') || errorMessage.includes('connect') || errorMessage.includes('network')) {
    return OnvifErrorType.CONNECTION_FAILED;
  }
  
  if (errorMessage.includes('auth') || errorMessage.includes('login') || errorMessage.includes('password') || errorMessage.includes('unauthorized')) {
    return OnvifErrorType.AUTHENTICATION_FAILED;
  }
  
  if (errorMessage.includes('soap') || errorMessage.includes('xml') || errorMessage.includes('response') || errorMessage.includes('wrong onvif soap response')) {
    return OnvifErrorType.INVALID_RESPONSE;
  }
  
  if (errorMessage.includes('offline') || errorMessage.includes('unreachable')) {
    return OnvifErrorType.DEVICE_OFFLINE;
  }
  
  return OnvifErrorType.UNKNOWN;
}

/**
 * Check if we should attempt to connect to a device based on its error history
 */
function shouldAttemptConnection(deviceId: number): boolean {
  const status = deviceStatus.get(deviceId);
  
  if (!status) {
    return true; // No previous errors, attempt connection
  }
  
  // If we've had too many consecutive failures, implement a cooldown period
  if (status.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    const timeSinceLastAttempt = Date.now() - status.lastAttemptTime.getTime();
    if (timeSinceLastAttempt < COOLDOWN_PERIOD) {
      Logger.info(`Skipping connection attempt for device ${deviceId} due to too many failures. Next attempt in ${Math.ceil((COOLDOWN_PERIOD - timeSinceLastAttempt) / 60000)} minutes`);
      return false;
    }
    
    // Reset consecutive failures after cooldown period
    status.consecutiveFailures = 0;
    return true;
  }
  
  return true;
}

/**
 * Update device status after a connection attempt
 */
function updateDeviceStatus(deviceId: number, error: Error, errorType: OnvifErrorType = OnvifErrorType.UNKNOWN): void {
  const status = deviceStatus.get(deviceId) || {
    lastError: '',
    errorType: OnvifErrorType.UNKNOWN,
    lastAttemptTime: new Date(),
    consecutiveFailures: 0
  };

  status.lastError = error.message;
  status.errorType = errorType;
  status.lastAttemptTime = new Date();
  status.consecutiveFailures++;

  deviceStatus.set(deviceId, status);
  Logger.error(`Device ${deviceId} status updated: ${error.message} (${errorType})`);
}

/**
 * Process an ONVIF event message
 */
function processEventMessage(deviceId: number, message: OnvifEventMessage): void {
  const { topic, type, label, data } = message;
  
  // Log all events for debugging
  Logger.debug(`Processing event for device ${deviceId}:`, {
    topic,
    type,
    label,
    data: JSON.stringify(data)
  });
  
  // Only process state change events
  if (data.eventType === 'start' || data.eventType === 'stop') {
    Logger.info(`Event ${data.eventType} for device ${deviceId}:`, {
      topic,
      type,
      label,
      timestamp: data.timestamp,
      state: data.state
    });

    // Write to the bluecherry_trigger file
    try {
      const triggerPath = '/tmp/bluecherry_trigger';
      const triggerMessage = `${deviceId}|${label}|${data.eventType}\n`;
      
      fs.appendFileSync(triggerPath, triggerMessage);
      Logger.debug(`Wrote to trigger file: ${triggerMessage.trim()}`);
    } catch (error) {
      Logger.error(`Failed to write to trigger file for device ${deviceId}:`, error);
    }

    // TODO: Send event to Bluecherry API
    // This is where you would implement the API call to notify Bluecherry
    // about the event state change
  } else {
    Logger.debug(`Skipping non-state-change event for device ${deviceId}:`, {
      topic,
      type,
      label,
      eventType: data.eventType
    });
  }
}

/**
 * Creates a continuous subscription to ONVIF events for a device
 */
export async function subscribeToEvents(
  ip: string,
  port: number,
  username: string,
  password: string,
  deviceId: number
): Promise<void> {
  try {
    // Clean up existing wrapper if it exists
    const existingWrapper = deviceWrappers.get(deviceId);
    if (existingWrapper) {
      existingWrapper.cleanup();
    }

    // Create new wrapper
    const wrapper = new OnvifDeviceWrapper(ip, port, username, password, deviceId);
    deviceWrappers.set(deviceId, wrapper);

    // Set up event handlers
    wrapper.on('messages', (messages: OnvifEventMessage[]) => {
      messages.forEach(msg => processEventMessage(deviceId, msg));
    });

    wrapper.on('statusUpdate', (update: { deviceId: number, status: any }) => {
      Logger.info(`Device ${update.deviceId} status updated:`, update.status);
    });

    // Connect and start subscription
    await wrapper.connect();
    await wrapper.startEventSubscription();

    Logger.info(`Successfully subscribed to events for device ${deviceId}`);

  } catch (error) {
    Logger.error(`Failed to subscribe to events for device ${deviceId}:`, error);
    throw error;
  }
}

