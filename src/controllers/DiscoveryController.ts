import dgram from 'dgram';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { buildProbeMessage, parseProbeMatch } from '../utils/discoveryUtils';
import { Logger } from '../utils/Logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Use CommonJS require for node-onvif since it has no types
const Onvif = require('node-onvif');

// Get configuration from environment variables
const DISCOVERY_TIMEOUT = parseInt(process.env.DISCOVERY_TIMEOUT || '20000', 10);
const DISCOVERY_MULTICAST_ADDRESS = process.env.DISCOVERY_MULTICAST_ADDRESS || '239.255.255.250';
const DISCOVERY_MULTICAST_PORT = parseInt(process.env.DISCOVERY_MULTICAST_PORT || '3702', 10);
const MAX_RETRIES = parseInt(process.env.DISCOVERY_MAX_RETRIES || '3', 10);
const MAX_TOTAL_DISCOVERY_TIME = 20000; // 20 seconds maximum total discovery time
const RETRY_INTERVAL = 1000; // 1 second between retries

// Track discovered devices across multiple discovery attempts
const discoveredDevicesSet = new Set<string>();
const discoveredDevicesMap = new Map<string, any>();
let discoveryStartTime = 0;
let noNewDevicesCount = 0;
const MAX_NO_NEW_DEVICES = 2; // Stop after 2 attempts with no new devices

export class DiscoveryController {
  static async discoverDevices(req: Request, res: Response): Promise<void> {
    Logger.info('Starting ONVIF device discovery');
    
    // Reset the discovered devices set for a fresh discovery
    discoveredDevicesSet.clear();
    discoveredDevicesMap.clear();
    discoveryStartTime = Date.now();
    noNewDevicesCount = 0;
    
    // Start both discovery methods in parallel
    this.startUdpDiscovery(req, res);
    this.startNodeOnvifDiscovery(req, res);
  }
  
  private static async startNodeOnvifDiscovery(req: Request, res: Response): Promise<void> {
    Logger.info('Starting node-onvif discovery');
    const startTime = Date.now();
    
    try {
      // Run multiple discovery attempts in parallel
      const discoveryPromises = [];
      for (let i = 0; i < MAX_RETRIES; i++) {
        discoveryPromises.push(this.runNodeOnvifDiscovery(i + 1));
      }
      
      // Wait for all discovery attempts to complete
      await Promise.all(discoveryPromises);
      
      const endTime = Date.now();
      Logger.info(`node-onvif discovery completed in ${endTime - startTime}ms`);
      
      // Send response if this is the last discovery method to complete
      if (Date.now() - discoveryStartTime > MAX_TOTAL_DISCOVERY_TIME) {
        this.sendDiscoveryResponse(res);
      }
    } catch (error) {
      Logger.error('Error in node-onvif discovery:', error);
    }
  }
  
  private static async runNodeOnvifDiscovery(attemptNumber: number): Promise<void> {
    const startTime = Date.now();
    Logger.info(`Starting node-onvif discovery attempt ${attemptNumber}`);
    
    try {
      // Use node-onvif's discovery method
      const devices = await Onvif.Discovery.probe();
      
      // Process discovered devices
      for (const device of devices) {
        const deviceKey = this.getDeviceKeyFromNodeOnvif(device);
        if (deviceKey) {
          const isNewDevice = !discoveredDevicesSet.has(deviceKey);
          discoveredDevicesSet.add(deviceKey);
          
          // Store the full device information
          discoveredDevicesMap.set(deviceKey, {
            address: device.name,
            xaddrs: device.xaddrs,
            types: device.types,
            scopes: device.scopes,
            manufacturer: device.hardware || '',
            model_name: device.name || '',
            ipv4: device.hostname,
            ipv4_path: device.xaddrs,
            ipv4_port: `${device.hostname}:${device.port || '80'}`
          });
          
          if (isNewDevice) {
            Logger.info(`New device found via node-onvif: ${device.name} (${device.hostname})`);
          }
        }
      }
      
      const endTime = Date.now();
      Logger.info(`node-onvif discovery attempt ${attemptNumber} completed in ${endTime - startTime}ms, found ${devices.length} devices`);
    } catch (error) {
      Logger.error(`Error in node-onvif discovery attempt ${attemptNumber}:`, error);
    }
  }
  
  private static startUdpDiscovery(req: Request, res: Response): void {
    Logger.info('Starting UDP discovery');
    const startTime = Date.now();
    
    // Start the discovery process with retries
    this.startDiscoveryWithRetries(req, res, 0, startTime);
  }
  
  private static startDiscoveryWithRetries(req: Request, res: Response, retryCount: number, startTime: number): void {
    // Check if we've exceeded the maximum total discovery time
    if (Date.now() - discoveryStartTime > MAX_TOTAL_DISCOVERY_TIME) {
      Logger.info(`Discovery complete after ${MAX_TOTAL_DISCOVERY_TIME/1000} seconds (time limit reached)`);
      this.sendDiscoveryResponse(res);
      return;
    }
    
    if (retryCount >= MAX_RETRIES) {
      Logger.info(`UDP discovery complete after ${MAX_RETRIES} retries`);
      this.sendDiscoveryResponse(res);
      return;
    }
    
    retryCount++;
    Logger.info(`UDP discovery attempt ${retryCount} of ${MAX_RETRIES}...`);
    
    const socket = dgram.createSocket('udp4');
    const messageId = uuidv4();
    const probeMessage = Buffer.from(buildProbeMessage(messageId), 'utf8');
    
    const devicesFromThisAttempt: any[] = [];
    let newDevicesFound = false;
    const deviceResponseTimes = new Map<string, number>();
    
    socket.on('message', async (msg: Buffer) => {
      const receiveTime = Date.now();
      const xml = msg.toString('utf8');
      try {
        const parsed = await parseProbeMatch(xml);
        if (parsed && parsed.length > 0) {
          Logger.info(`Discovered ${parsed.length} devices from UDP response in attempt ${retryCount}`);
          devicesFromThisAttempt.push(...parsed);
          
          // Add to our global set of discovered devices
          for (const device of parsed) {
            const deviceKey = this.getDeviceKey(device);
            if (deviceKey) {
              const isNewDevice = !discoveredDevicesSet.has(deviceKey);
              discoveredDevicesSet.add(deviceKey);
              // Store the full device information
              discoveredDevicesMap.set(deviceKey, device);
              
              // Log response time for this device
              const responseTime = receiveTime - startTime;
              deviceResponseTimes.set(deviceKey, responseTime);
              
              if (isNewDevice) {
                newDevicesFound = true;
                Logger.info(`New device found via UDP: ${device.manufacturer || 'Unknown'} (${device.ipv4}) - Response time: ${responseTime}ms`);
              }
            }
          }
        }
      } catch (err) {
        Logger.error('Failed to parse discovery response:', err);
      }
    });
    
    socket.on('error', (err) => {
      Logger.error('Socket error during discovery:', err);
    });
    
    socket.bind(() => {
      socket.setBroadcast(true);
      socket.setMulticastTTL(128);
      Logger.info(`Sending ONVIF discovery probe to ${DISCOVERY_MULTICAST_ADDRESS}:${DISCOVERY_MULTICAST_PORT}`);
      socket.send(
        probeMessage,
        0,
        probeMessage.length,
        DISCOVERY_MULTICAST_PORT,
        DISCOVERY_MULTICAST_ADDRESS,
        (err) => {
          if (err) {
            Logger.error('Failed to send discovery probe:', err);
            socket.close();
            // Continue with next retry even if this one failed
            setTimeout(() => this.startDiscoveryWithRetries(req, res, retryCount, startTime), RETRY_INTERVAL);
          }
        }
      );
    });
    
    // Wait for responses to arrive, then close the socket and continue with next retry
    setTimeout(() => {
      socket.close();
      const endTime = Date.now();
      const attemptDuration = endTime - startTime;
      Logger.info(`UDP discovery attempt ${retryCount} complete in ${attemptDuration}ms. Found ${devicesFromThisAttempt.length} devices in this attempt`);
      
      // Log response times for all devices found in this attempt
      deviceResponseTimes.forEach((responseTime, deviceKey) => {
        const device = discoveredDevicesMap.get(deviceKey);
        if (device) {
          Logger.info(`Device response time: ${device.manufacturer || 'Unknown'} (${device.ipv4}) - ${responseTime}ms`);
        }
      });
      
      // Check if we found any new devices in this attempt
      if (!newDevicesFound) {
        noNewDevicesCount++;
        Logger.info(`No new devices found in UDP attempt ${retryCount}. Count: ${noNewDevicesCount}`);
        
        // If we've had multiple attempts with no new devices, stop the discovery
        if (noNewDevicesCount >= MAX_NO_NEW_DEVICES) {
          Logger.info(`Stopping UDP discovery after ${noNewDevicesCount} attempts with no new devices`);
          this.sendDiscoveryResponse(res);
          return;
        }
      } else {
        // Reset the counter if we found new devices
        noNewDevicesCount = 0;
      }
      
      // Continue with next retry
      setTimeout(() => this.startDiscoveryWithRetries(req, res, retryCount, startTime), DISCOVERY_TIMEOUT);
    }, DISCOVERY_TIMEOUT);
  }
  
  private static sendDiscoveryResponse(res: Response): void {
    Logger.info('Sending discovery response');
    
    // Convert the map to an array of devices
    const devices = Array.from(discoveredDevicesMap.values());
    
    // Always send a response, even if no devices are found
    res.json({
      status: 1,
      data: devices
    });
    
    Logger.info(`Discovery response sent with ${devices.length} devices`);
  }
  
  private static getDeviceKey(device: any): string | null {
    if (!device || !device.address) return null;
    
    // Create a unique key for the device
    const address = device.address.replace(/^urn:/, '').trim();
    return `${address}|${device.xaddrs ? device.xaddrs[0] : ''}`;
  }
  
  private static getDeviceKeyFromNodeOnvif(device: any): string | null {
    if (!device || !device.name) return null;
    
    // Create a unique key for the device
    return `${device.name}|${device.xaddrs || ''}`;
  }
}
