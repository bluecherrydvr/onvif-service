import { Discovery, Probe, Device, Events, PTZ } from 'onvif-nvt';
import { Server } from '../../server';
import { DeviceInfoService } from './DeviceInfoService';

export class OnvifNvtService {
    private device: Device | null = null;
    private events: Events | null = null;
    private ptz: PTZ | null = null;

    constructor(private deviceId: number) {}

    // Device Discovery
    public static async probeDevices(timeout: number = 5000): Promise<Probe[]> {
        try {
            const discovery = new Discovery();
            const devices = await discovery.startProbe({ timeout });
            Server.Logs.info(`Discovered ${devices.length} ONVIF devices`);
            return devices;
        } catch (error) {
            Server.Logs.error(`Device discovery failed: ${error}`);
            throw error;
        }
    }

    // Device Connection
// Add more detailed logging in OnvifNvtService.ts
public async connect(): Promise<void> {
    try {
        const deviceInfo = await DeviceInfoService.getDeviceConnectionInfo(this.deviceId);
        
        // Log the exact connection details
        Server.Logs.debug(`Attempting to connect to device with xaddr: http://${deviceInfo.ipAddress}:${deviceInfo.onvifPort}/onvif/device_service`);

        this.device = new Device({
            xaddr: `http://${deviceInfo.ipAddress}:${deviceInfo.onvifPort}/onvif/device_service`,
            user: deviceInfo.rtspUsername,
            pass: deviceInfo.rtspPassword
        });

        // Try to get raw response before initialization
        try {
            await this.device.init();
        } catch (initError) {
            Server.Logs.error(`Device init error details: ${JSON.stringify(initError)}`);
            throw initError;
        }
    } catch (error) {
        Server.Logs.error(`Failed to connect to device ${this.deviceId}: ${error}`);
        throw error;
    }
}


    // PTZ Commands
    public async ptzMove(x: number, y: number, zoom: number): Promise<void> {
        try {
            if (!this.ptz) throw new Error('PTZ not initialized');
            
            await this.ptz.absoluteMove({
                x, y, zoom,
                speed: { x: 1, y: 1, zoom: 1 }
            });
        } catch (error) {
            Server.Logs.error(`PTZ movement failed: ${error}`);
            throw error;
        }
    }

    // Event Subscription
    public async subscribeToEvents(topics: string[]): Promise<void> {
        try {
            if (!this.events) throw new Error('Events not initialized');

            const subscription = await this.events.subscribe({
                TopicFilter: {
                    TopicExpression: topics,
                    MessageContent: 'Message'
                }
            });

            // Handle incoming events
            subscription.on('event', (event) => {
                this.handleEvent(event);
            });

            Server.Logs.info(`Subscribed to events for device ${this.deviceId}`);
        } catch (error) {
            Server.Logs.error(`Event subscription failed: ${error}`);
            throw error;
        }
    }

    // Event Handler with Topic Filtering
    private handleEvent(event: any): void {
        try {
            // Filter and process events based on topic
            const topic = event.topic._;
            const message = event.message;

            switch (true) {
                case topic.includes('RuleEngine/MotionDetector'):
                    this.handleMotionEvent(message);
                    break;
                case topic.includes('RuleEngine/ObjectDetector/Person'):
                    this.handlePersonEvent(message);
                    break;
                case topic.includes('RuleEngine/ObjectDetector/Vehicle'):
                    this.handleVehicleEvent(message);
                    break;
                default:
                    Server.Logs.debug(`Unhandled event topic: ${topic}`);
            }
        } catch (error) {
            Server.Logs.error(`Event handling failed: ${error}`);
        }
    }

    private handleMotionEvent(message: any): void {
        Server.Logs.info(`Motion detected: ${JSON.stringify(message)}`);
        // Add your motion event handling logic here
    }

    private handlePersonEvent(message: any): void {
        Server.Logs.info(`Person detected: ${JSON.stringify(message)}`);
        // Add your person detection handling logic here
    }

    private handleVehicleEvent(message: any): void {
        Server.Logs.info(`Vehicle detected: ${JSON.stringify(message)}`);
        // Add your vehicle detection handling logic here

public async getPTZDetails(): Promise<any> {
    try {
        if (!this.ptz) throw new Error('PTZ not initialized');
        
        const capabilities = await this.device?.getCapabilities();
        const nodes = await this.ptz.getNodes();
        const config = await this.ptz.getConfigurations();
        
        return {
            capabilities: capabilities?.PTZ,
            nodes,
            configurations: config
        };
    } catch (error) {
        Server.Logs.error(`Failed to get PTZ details: ${error}`);
        throw error;
    }
}


    }
}

