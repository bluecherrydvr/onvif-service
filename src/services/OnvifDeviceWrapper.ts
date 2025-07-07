// Make sure the ONVIF library patch is applied before importing
// The patch is applied in index.ts, but this comment serves as a reminder
import { Cam } from 'onvif';
import { Logger } from '../utils/Logger';
import { EventEmitter } from 'events';
import * as net from 'net';

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

interface EventState {
  topic: string;
  isActive: boolean;
  lastUpdate: Date;
}

// Define the event types we're interested in
export const SUPPORTED_EVENT_TYPES = [
  'tns1:RuleEngine/MyRuleDetector/PeopleDetect',
  'tns1:RuleEngine/MyRuleDetector/VehicleDetect',
  // Additional Reolink-specific event types
  'tns1:RuleEngine/MyRuleDetector/PersonDetect',
  'tns1:RuleEngine/MyRuleDetector/VehicleDetector',
  'tns1:RuleEngine/MyRuleDetector/PeopleDetector',
  'tns1:RuleEngine/MyRuleDetector/PersonDetector',
  'tns1:RuleEngine/MyRuleDetector/MotionDetector',
  'tns1:RuleEngine/MyRuleDetector/MotionDetect',
  'tns1:RuleEngine/MyRuleDetector/Motion',
  'tns1:RuleEngine/MyRuleDetector/People',
  'tns1:RuleEngine/MyRuleDetector/Person',
  'tns1:RuleEngine/MyRuleDetector/Vehicle',
  'tns1:RuleEngine/MyRuleDetector/VehicleDetection',
  'tns1:RuleEngine/MyRuleDetector/PeopleDetection',
  'tns1:RuleEngine/MyRuleDetector/PersonDetection',
  // Motion alarm event type
  'tns1:VideoSource/MotionAlarm'
];

export class OnvifDeviceWrapper extends EventEmitter {
  private device: Cam | null = null;
  private status: DeviceStatus;
  private readonly MAX_CONSECUTIVE_FAILURES = 5;
  private readonly COOLDOWN_PERIOD = 30 * 60 * 1000; // 30 minutes
  private eventStates: Map<string, EventState> = new Map();
  private allowedEventTypes: string[];
  private subscriptionRenewTimer: NodeJS.Timeout | null = null;
  private subscriptionLeaseSeconds: number = 60; // Default lease time (can be updated from camera response)
  private subscription: any = null;

  constructor(
    private readonly ip: string,
    private readonly port: number,
    private readonly username: string,
    private readonly password: string,
    private readonly deviceId: number,
    allowedEventTypes: string[] = SUPPORTED_EVENT_TYPES
  ) {
    super();
    this.allowedEventTypes = allowedEventTypes;
    this.status = {
      lastError: '',
      errorType: OnvifErrorType.UNKNOWN,
      lastAttemptTime: new Date(),
      consecutiveFailures: 0
    };
  }

  private determineErrorType(error: Error): OnvifErrorType {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('timeout') || errorMessage.includes('connect') || errorMessage.includes('network')) {
      return OnvifErrorType.CONNECTION_FAILED;
    }
    
    if (errorMessage.includes('auth') || errorMessage.includes('login') || errorMessage.includes('password') || errorMessage.includes('unauthorized')) {
      return OnvifErrorType.AUTHENTICATION_FAILED;
    }
    
    if (errorMessage.includes('soap') || errorMessage.includes('xml') || errorMessage.includes('response')) {
      return OnvifErrorType.INVALID_RESPONSE;
    }
    
    if (errorMessage.includes('offline') || errorMessage.includes('unreachable')) {
      return OnvifErrorType.DEVICE_OFFLINE;
    }
    
    return OnvifErrorType.UNKNOWN;
  }

  private updateStatus(error: Error): void {
    this.status.lastError = error.message;
    this.status.errorType = this.determineErrorType(error);
    this.status.lastAttemptTime = new Date();
    this.status.consecutiveFailures++;

    Logger.error(`Device ${this.deviceId} status updated: ${error.message} (${this.status.errorType})`);
    this.emit('statusUpdate', { deviceId: this.deviceId, status: this.status });
  }

  private shouldAttemptConnection(): boolean {
    if (this.status.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      const timeSinceLastAttempt = Date.now() - this.status.lastAttemptTime.getTime();
      if (timeSinceLastAttempt < this.COOLDOWN_PERIOD) {
        Logger.info(`Skipping connection attempt for device ${this.deviceId} due to too many failures. Next attempt in ${Math.ceil((this.COOLDOWN_PERIOD - timeSinceLastAttempt) / 60000)} minutes`);
        return false;
      }
      this.status.consecutiveFailures = 0;
    }
    return true;
  }

  private writeTriggerEvent(eventType: string, action: 'start' | 'stop'): void {
    const triggerSocket = '/tmp/bluecherry_trigger';
    const cameraId = this.deviceId;
    const description = `${eventType}|${action}`;
    const message = `${cameraId} ${description}\n`;
    
    // Connect to the UNIX socket and send the message
    const client = net.createConnection({ path: triggerSocket }, () => {
      client.write(message, () => {
        client.end();
        Logger.debug(`Sent trigger to UNIX socket: ${message.trim()}`);
      });
    });

    client.on('error', (err) => {
      Logger.error('Failed to send trigger to UNIX socket:', err);
    });
  }

  private processEventState(topic: string, message: any): void {
    // Log all incoming events for debugging
    Logger.debug(`Processing event state for device ${this.deviceId}:`, {
      topic,
      messageType: typeof message,
      messageSize: typeof message === 'string' ? message.length : JSON.stringify(message).length
    });

    // Only process events we're interested in
    if (!this.allowedEventTypes.includes(topic)) {
      Logger.debug(`Skipping unsupported event topic for device ${this.deviceId}:`, {
        topic,
        allowedTypes: this.allowedEventTypes
      });
      return;
    }

    const currentState = this.eventStates.get(topic) || {
      topic,
      isActive: false,
      lastUpdate: new Date()
    };

    Logger.debug(`Current state for topic on device ${this.deviceId}:`, {
      topic,
      currentState: currentState.isActive,
      lastUpdate: currentState.lastUpdate
    });

    // Extract the state value from the message
    let newState = false;
    let stateSource = 'unknown';
    
    // Parse the message if it's a string
    let parsedMessage = message;
    if (typeof message === 'string') {
      try {
        parsedMessage = JSON.parse(message);
        Logger.debug(`Successfully parsed message string for device ${this.deviceId}`);
      } catch (e: any) {
        Logger.error(`Failed to parse message string for device ${this.deviceId}:`, {
          error: e instanceof Error ? e.message : String(e),
          message: message.substring(0, 200) // Log first 200 chars of message
        });
      }
    }
    
    // Try different paths to find the state value
    if (parsedMessage.message?.data?.simpleItem?.$?.Value !== undefined) {
      const value = parsedMessage.message.data.simpleItem.$.Value;
      newState = value === 'true' || value === true;
      stateSource = 'simpleItem.Value';
    } else if (parsedMessage.message?.message?.data?.simpleItem?.$?.Value !== undefined) {
      const value = parsedMessage.message.message.data.simpleItem.$.Value;
      newState = value === 'true' || value === true;
      stateSource = 'message.message.data.simpleItem.Value';
    }

    Logger.debug(`State extraction result for device ${this.deviceId}:`, {
      topic,
      newState,
      stateSource,
      messageStructure: JSON.stringify(parsedMessage).substring(0, 200) // Log first 200 chars
    });

    // Only emit if the state has changed
    if (newState !== currentState.isActive) {
      Logger.info(`State change detected for device ${this.deviceId}:`, {
        topic,
        oldState: currentState.isActive,
        newState,
        timeSinceLastUpdate: Date.now() - currentState.lastUpdate.getTime()
      });

      currentState.isActive = newState;
      currentState.lastUpdate = new Date();
      this.eventStates.set(topic, currentState);

      // Get the event type from the topic
      const eventType = this.getEventLabel(topic).toLowerCase().replace(' ', '_');
      
      Logger.debug(`Preparing to write trigger event for device ${this.deviceId}:`, {
        eventType,
        action: newState ? 'start' : 'stop',
        topic,
        label: this.getEventLabel(topic)
      });

      // Write to trigger file
      this.writeTriggerEvent(eventType, newState ? 'start' : 'stop');

      // Emit the state change event
      const eventData = {
        topic,
        type: topic.split('/').pop()?.toLowerCase(),
        label: this.getEventLabel(topic),
        data: {
          ...parsedMessage,
          state: newState,
          eventType: newState ? 'start' : 'stop',
          timestamp: new Date().toISOString()
        }
      };

      Logger.debug(`Emitting event message for device ${this.deviceId}:`, {
        eventData
      });

      this.emit('messages', [eventData]);
    } else {
      Logger.debug(`No state change for device ${this.deviceId}:`, {
        topic,
        currentState: currentState.isActive,
        receivedState: newState
      });
    }
  }

  private getEventLabel(topic: string): string {
    const labels: { [key: string]: string } = {
      // Vehicle detection events
      'MyRuleDetector/VehicleDetect': 'Vehicle',
      'MyRuleDetector/VehicleDetector': 'Vehicle',
      'MyRuleDetector/Vehicle': 'Vehicle',
      'MyRuleDetector/VehicleDetection': 'Vehicle',
      
      // Person detection events
      'MyRuleDetector/PeopleDetect': 'Person',
      'MyRuleDetector/PersonDetect': 'Person',
      'MyRuleDetector/PeopleDetector': 'Person',
      'MyRuleDetector/PersonDetector': 'Person',
      'MyRuleDetector/People': 'Person',
      'MyRuleDetector/Person': 'Person',
      'MyRuleDetector/PeopleDetection': 'Person',
      'MyRuleDetector/PersonDetection': 'Person',
      'MyRuleDetector/FaceDetect': 'Person',
      
      // Animal detection events
      'MyRuleDetector/DogCatDetect': 'Animal',
      
      // Motion events (fallback)
      'CellMotionDetector/Motion': 'motion',
      'MyRuleDetector/MotionDetector': 'motion',
      'MyRuleDetector/MotionDetect': 'motion',
      'MyRuleDetector/Motion': 'motion',
      'VideoSource/MotionAlarm': 'motion',
      'tns1:VideoSource/MotionAlarm': 'motion'
    };

    // Try to match the full topic path first
    if (labels[topic]) {
      return labels[topic];
    }

    // Try to match just the last part of the topic
    const key = topic.split('/').pop() || '';
    if (labels[key]) {
      return labels[key];
    }

    // Try to match the last two parts of the topic
    const key2 = topic.split('/').slice(-2).join('/');
    if (labels[key2]) {
      return labels[key2];
    }

    // Default to 'motion' if no match is found
    return 'motion';
  }

  public async connect(): Promise<void> {
    if (!this.shouldAttemptConnection()) {
      throw new Error(`Skipping connection to device ${this.deviceId} due to previous failures`);
    }

    return new Promise((resolve, reject) => {
      try {
        const config = {
          hostname: this.ip,
          port: this.port,
          username: this.username,
          password: this.password,
          timeout: 10000,
          preserveAddress: true // Important for maintaining subscription URLs
        };

        this.device = new Cam(config);

        // Add robust error/disconnect listeners
        this.device.on('error', (err: Error) => {
          Logger.error(`ONVIF device error for device ${this.deviceId}:`, err);
          setTimeout(() => this.startEventSubscription().catch(() => {}), 10000);
        });
        this.device.on('close', () => {
          Logger.warn(`ONVIF device connection closed for device ${this.deviceId}`);
          setTimeout(() => this.startEventSubscription().catch(() => {}), 10000);
        });

        // Let the library handle the connection
        this.device.connect((err: Error | null) => {
          if (err) {
            this.updateStatus(err);
            reject(err);
            return;
          }
          Logger.info(`Successfully connected to camera ${this.deviceId}`);
          resolve();
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.updateStatus(err);
        reject(err);
      }
    });
  }

  public async startEventSubscription(): Promise<void> {
    if (!this.device) {
      throw new Error('Device not connected');
    }

    return new Promise((resolve, reject) => {
      // Set up event listener before creating subscription
      Logger.debug(`Setting up event listener for device ${this.deviceId}`);
      this.device!.on('event', (message: any, xml: string) => {
        Logger.debug(`Raw event received for device ${this.deviceId}:`, {
          message: typeof message === 'string' ? message : JSON.stringify(message),
          xml: xml.substring(0, 200) + '...' // Log just the beginning of the XML
        });
        
        // Parse the message if it's a string
        let parsedMessage = message;
        if (typeof message === 'string') {
          try {
            parsedMessage = JSON.parse(message);
          } catch (e) {
            Logger.error(`Failed to parse message for device ${this.deviceId}:`, e);
            return;
          }
        }
        
        const topic = parsedMessage.topic?._;
        if (topic) {
          // Only process allowed event types
          const allowedLabels = ['Person', 'Animal', 'Vehicle'];
          Logger.debug(`Allowed event labels: ${JSON.stringify(allowedLabels)}`);
          const label = this.getEventLabel(topic);
          if (allowedLabels.includes(label)) {
            Logger.debug(`Processing allowed event (${label}) with topic for device ${this.deviceId}: ${topic}`);
            this.processEventState(topic, parsedMessage);
          } else {
            Logger.debug(`Filtered out event with label ${label} for device ${this.deviceId}: ${topic}`);
          }
        } else {
          Logger.debug(`Event received without topic for device ${this.deviceId}:`, {
            message: JSON.stringify(parsedMessage)
          });
        }
      });

      Logger.debug(`Creating pull point subscription for device ${this.deviceId}`);
      this.device!.createPullPointSubscription((err: Error | null, subscription: any) => {
        if (err) {
          this.updateStatus(err);
          // Try to re-subscribe after a delay
          Logger.warn(`Subscription failed for device ${this.deviceId}, retrying in 10 seconds...`);
          setTimeout(() => this.startEventSubscription().catch(() => {}), 10000);
          reject(err);
          return;
        }

        Logger.info(`Event subscription started for device ${this.deviceId}`);
        Logger.debug(`Subscription details for device ${this.deviceId}:`, {
          subscription: JSON.stringify(subscription)
        });

        // Store subscription and lease time
        this.subscription = subscription;
        // Try to get actual lease time from subscription (if available)
        if (subscription && subscription.leaseTime) {
          this.subscriptionLeaseSeconds = parseInt(subscription.leaseTime, 10) || 60;
        }
        // Schedule renewal before lease expires (at 80% of lease time)
        this.scheduleSubscriptionRenewal();

        // The library will handle pulling messages automatically as long as there are event listeners
        resolve();
      });
    });
  }

  private scheduleSubscriptionRenewal(): void {
    if (this.subscriptionRenewTimer) {
      clearTimeout(this.subscriptionRenewTimer);
    }
    const renewMs = Math.floor(this.subscriptionLeaseSeconds * 0.8 * 1000);
    Logger.info(`Scheduling ONVIF subscription renewal for device ${this.deviceId} in ${renewMs / 1000} seconds`);
    this.subscriptionRenewTimer = setTimeout(() => {
      this.renewEventSubscription().catch((err) => {
        Logger.error(`Failed to renew ONVIF subscription for device ${this.deviceId}:`, err);
        // Try to re-subscribe if renewal fails
        this.startEventSubscription().catch(() => {});
      });
    }, renewMs);
  }

  private async renewEventSubscription(): Promise<void> {
    Logger.info(`Renewing ONVIF event subscription for device ${this.deviceId} (by re-subscribing)`);
    await this.startEventSubscription();
  }

  public cleanup(): void {
    if (this.device) {
      // Remove all event listeners
      this.device.removeAllListeners('event');
      
      // Unsubscribe from events
      this.device.unsubscribe((err: Error | null) => {
        if (err) {
          Logger.error(`Failed to unsubscribe from camera ${this.deviceId}: ${err.message}`);
        }
      });
      
      this.device = null;
    }
    if (this.subscriptionRenewTimer) {
      clearTimeout(this.subscriptionRenewTimer);
      this.subscriptionRenewTimer = null;
    }
    this.subscription = null;
  }

  /**
   * Check if the device is connected
   */
  public isConnected(): boolean {
    return this.device !== null;
  }

  public getDeviceInfo(): { ip: string; port: number; username: string; password: string } {
    return {
      ip: this.ip,
      port: this.port,
      username: this.username,
      password: this.password
    };
  }
}