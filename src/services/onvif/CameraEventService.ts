import { Cam } from 'onvif';
import { DeviceInfoService } from './DeviceInfoService';
import { Server } from '../../server';
import * as https from 'https';

export class CameraEventService {
    public static async getEventTypes(deviceId: number): Promise<any> {
        try {
            const deviceInfo = await DeviceInfoService.getDeviceConnectionInfo(deviceId);

            deviceInfo.rtspUsername = Buffer.isBuffer(deviceInfo.rtspUsername)
                ? deviceInfo.rtspUsername.toString('utf-8')
                : deviceInfo.rtspUsername;

            deviceInfo.rtspPassword = Buffer.isBuffer(deviceInfo.rtspPassword)
                ? deviceInfo.rtspPassword.toString('utf-8')
                : deviceInfo.rtspPassword;

            Server.Logs.debug(`📦 Device info: ${JSON.stringify(deviceInfo)}`);

            if (!DeviceInfoService.validateConnectionInfo(deviceInfo)) {
                throw new Error(`Invalid device connection info for device ${deviceId}`);
            }

            Server.Logs.debug(`Connecting to camera using: hostname: ${deviceInfo.ipAddress}, port: ${deviceInfo.onvifPort}, username: ${deviceInfo.rtspUsername}, password: ${deviceInfo.rtspPassword}`);

            const camera = await CameraEventService.connectToCamera({
                hostname: deviceInfo.ipAddress,
                username: deviceInfo.rtspUsername,
                password: deviceInfo.rtspPassword,
                port: deviceInfo.onvifPort
            });

            const events = await CameraEventService.getSupportedEvents(camera);
            const parsedRules = CameraEventService.extractRulesFromTopics(events?.topicSet || {});
            const parsedLiveRules = await CameraEventService.listenForLiveRules(camera, 20000, deviceId);

            return {
                deviceId,
                supportedEvents: events,
                parsedRules: Array.from(parsedRules).sort(),
                parsedLiveRules: Array.from(parsedLiveRules).sort()
            };
        } catch (error) {
            Server.Logs.error(`Failed to get event types: ${error}`);
            throw error;
        }
    }

    private static connectToCamera(config: {
        hostname: string;
        username: string;
        password: string;
        port: number;
    }): Promise<Cam> {
        return new Promise<Cam>((resolve, reject) => {
            new Cam({
                hostname: config.hostname,
                username: config.username,
                password: config.password,
                port: config.port,
                timeout: 10000
            }, function (error: Error | null) {
                if (error || !this) {
                    Server.Logs.error(`❌ Cam constructor failed: ${error?.message}`);
                    reject(error || new Error('Camera connection failed'));
                    return;
                }
                Server.Logs.debug(`✅ Connected to camera: ${this.hostname}`);
                resolve(this);
            });
        });
    }

    private static getSupportedEvents(camera: Cam): Promise<any> {
        return new Promise((resolve, reject) => {
            camera.getEventProperties((error: Error | null, events: any) => {
                if (error) {
                    Server.Logs.error(`Failed to get supported events: ${error}`);
                    reject(error);
                    return;
                }
                resolve(events);
            });
        });
    }

    private static stripNamespaces(topic: string): string {
        if (!topic) return '';
        return topic
            .split('/')
            .map(part => part.split(':').pop())
            .join('/');
    }

    private static processTopic(topic: string, ruleSet: Set<string>) {
        if (!topic) return;
        const lower = topic.toLowerCase();

        if (lower.includes('myruledetector')) {
            const parts = topic.split('/').filter(Boolean);
            const idx = parts.findIndex(p => p.toLowerCase() === 'myruledetector');
            if (idx >= 0 && parts.length > idx + 1) {
                let rule = parts[idx + 1];
                rule = rule.replace(/detect/i, ' Detect');
                if (!rule.toLowerCase().includes('face')) {
                    ruleSet.add(`MyRuleDetector: ${rule}`);
                }
            }
        } else if (lower.includes('ruleengine') && lower.includes('cellmotiondetector')) {
            const parts = topic.split('/').filter(Boolean);
            const idx = parts.findIndex(p => p.toLowerCase() === 'cellmotiondetector');
            if (idx >= 0 && parts.length > idx + 1) {
                const rule = parts[idx] + ': ' + parts[idx + 1];
                ruleSet.add(rule);
            }
        } else if (lower.includes('videosource') && lower.includes('motionalarm')) {
            const parts = topic.split('/').filter(Boolean);
            const idx = parts.findIndex(p => p.toLowerCase() === 'videosource');
            if (idx >= 0 && parts.length > idx + 1) {
                const rule = parts[idx] + ': ' + parts[idx + 1];
                ruleSet.add(rule);
            }
        }
    }

    private static extractRulesFromTopics(topicSet: any): Set<string> {
        const ruleSet = new Set<string>();

        function traverse(node: any, path: string[] = []) {
            for (const key in node) {
                if (key === '$') continue;
                const child = node[key];
                const newPath = [...path, key];
                if (typeof child === 'object') {
                    traverse(child, newPath);
                } else {
                    const topic = newPath.join('/');
                    const clean = CameraEventService.stripNamespaces(topic);
                    CameraEventService.processTopic(clean, ruleSet);
                }
            }
        }

        traverse(topicSet);
        return ruleSet;
    }

    private static triggerBluecherryHttp(cameraId: number, description: string) {
        const triggerUrl = `https://Admin:bluecherry@192.168.86.90:7001/media/trigger.php?camera_id=${cameraId}&description=${encodeURIComponent(description)}`;

        const request = https.get(triggerUrl, { rejectUnauthorized: false }, (res) => {
            Server.Logs.debug(`🔔 Bluecherry HTTP trigger sent (${res.statusCode}): ${triggerUrl}`);
        });

        request.on('error', (err) => {
            Server.Logs.error(`❌ Failed to send Bluecherry trigger: ${err.message}`);
        });

        request.end();
    }

    private static listenForLiveRules(camera: Cam, durationMs: number, deviceId: number): Promise<Set<string>> {
        return new Promise((resolve) => {
            const liveRuleSet = new Set<string>();
            const camAny = camera as any;

            const handler = (msg: any, _xml: any) => {
                if (msg?.topic?._) {
                    const rawTopic = msg.topic._;
                    const cleaned = CameraEventService.stripNamespaces(rawTopic);
                    Server.Logs.debug(`📱 Live Event Topic: ${cleaned}`);
                    CameraEventService.processTopic(cleaned, liveRuleSet);

                    if (cleaned.toLowerCase().includes('vehicledetect')) {
                        CameraEventService.triggerBluecherryHttp(deviceId, 'vehicle detected');
                    }

                    if (cleaned.toLowerCase().includes('motionalarm')) {
                        CameraEventService.triggerBluecherryHttp(deviceId, 'motion detected');
                    }
                }
            };

            camAny.on('event', handler);

            setTimeout(() => {
                camAny.removeListener('event', handler);
                resolve(liveRuleSet);
            }, durationMs);
        });
    }
}

