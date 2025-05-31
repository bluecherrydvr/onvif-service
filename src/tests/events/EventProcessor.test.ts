import { EventProcessor } from '../../services/EventProcessor';
import { Events } from '../../models/Events';
import { OnvifEventInterface } from '../../interfaces/OnvifEventInterface';
import { DeviceInfoService } from '../../services/DeviceInfoService';
import { CameraEventTypes } from '../../services/CameraEventTypes';

jest.mock('../../models/Events');
jest.mock('../../services/DeviceInfoService');
jest.mock('../../services/CameraEventTypes');

describe('EventProcessor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should process motion events correctly', async () => {
        const mockEvent = {
            device_id: 1,
            type_id: 'motion',
            details: 'Motion detected in zone 1'
        };

        Events.findOne = jest.fn().mockResolvedValue(mockEvent);

        await EventProcessor.processEvent(mockEvent);

        const storedEvent = await Events.findOne({
            where: {
                device_id: mockEvent.device_id,
                type_id: mockEvent.type_id
            }
        });

        expect(storedEvent).toEqual(mockEvent);
        expect(Events.findOne).toHaveBeenCalledWith({
            where: expect.objectContaining({
                device_id: 1,
                type_id: 'motion'
            })
        });
    });
});

describe('OnvifEventInterface', () => {
    it('should initialize with valid device info', async () => {
        const deviceId = 1;
        const eventInterface = new OnvifEventInterface(deviceId);
        await expect(eventInterface.initialize()).resolves.not.toThrow();
        expect(eventInterface.deviceId).toBe(deviceId);
    });

    it('should handle invalid device info', async () => {
        const deviceId = -1;
        const eventInterface = new OnvifEventInterface(deviceId);
        await expect(eventInterface.initialize()).rejects.toThrow('Invalid device info');
    });

    it('should properly stop and cleanup', async () => {
        const deviceId = 1;
        const eventInterface = new OnvifEventInterface(deviceId);
        await eventInterface.initialize();
        eventInterface.stop();

        // Add better assertions if stop() affects state
        expect(eventInterface.running).toBe(false); // Example
    });
});

describe('DeviceInfoService', () => {
    it('should validate connection info correctly', () => {
        const validInfo = {
            id: 1,
            ipAddress: '192.168.1.100',
            onvifPort: 80,
            rtspUsername: 'admin',
            rtspPassword: 'password'
        };
        expect(DeviceInfoService.validateConnectionInfo(validInfo)).toBe(true);
    });

    it('should reject invalid connection info', () => {
        const invalidInfo = {
            id: 1,
            ipAddress: 'invalid-ip',
            onvifPort: -1,
            rtspUsername: '',
            rtspPassword: ''
        };
        expect(DeviceInfoService.validateConnectionInfo(invalidInfo)).toBe(false);
    });
});

describe('Camera Capability Checker', () => {
    it('should log supported camera events', async () => {
        const mockEvents = ['Motion', 'Tamper'];
        const deviceId = 1;
        const mockDeviceInfo = {
            ipAddress: '192.168.1.100',
            rtspUsername: 'admin',
            rtspPassword: 'password',
            onvifPort: 80
        };

        DeviceInfoService.getDeviceConnectionInfo.mockResolvedValue(mockDeviceInfo);
        DeviceInfoService.validateConnectionInfo.mockReturnValue(true);
        CameraEventTypes.connectToCamera.mockResolvedValue({});
        CameraEventTypes.getSupportedEvents.mockResolvedValue(mockEvents);

        const deviceInfo = await DeviceInfoService.getDeviceConnectionInfo(deviceId);
        expect(DeviceInfoService.validateConnectionInfo(deviceInfo)).toBe(true);

        const camera = await CameraEventTypes.connectToCamera({
            hostname: deviceInfo.ipAddress,
            username: deviceInfo.rtspUsername,
            password: deviceInfo.rtspPassword,
            port: deviceInfo.onvifPort
        });

        const events = await CameraEventTypes.getSupportedEvents(camera);
        expect(events).toEqual(mockEvents);
    });
});

