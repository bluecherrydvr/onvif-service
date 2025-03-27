from onvif import ONVIFCamera
import zeep
import json
import sys
import time
from datetime import datetime, timezone
import argparse
from typing import Dict
from lxml import etree
from zeep.exceptions import Fault, TransportError

def _serialize_data(data):
    """
    Recursively convert data to a JSON-serializable structure.
    - If an object is an lxml element, convert it to a string.
    - If it's a datetime object, convert it to its ISO format.
    """
    if hasattr(data, 'tag'):
        return etree.tostring(data, encoding='unicode')
    elif isinstance(data, datetime):
        return data.isoformat()
    elif isinstance(data, dict):
        return {k: _serialize_data(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [_serialize_data(item) for item in data]
    else:
        return data

class OnvifEventService:
    def __init__(self, host: str, port: int, user: str, pwd: str):
        self._log("DEBUG", f"Initializing ONVIF connection to {host}:{port}")
        try:
            self.camera = ONVIFCamera(host, port, user, pwd)
            self.events = self.camera.create_events_service()
            self._log("INFO", "Successfully connected to camera")
        except Exception as e:
            self._log("ERROR", f"Failed to connect to camera: {str(e)}")
            raise

    def _log(self, level: str, message: str, data: dict = None):
        """Log messages in JSON format"""
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level,
            "message": message
        }
        if data:
            log_entry["data"] = _serialize_data(data)
        print(json.dumps(log_entry), flush=True)

    def get_event_properties(self) -> Dict:
        """Get supported event properties from camera"""
        try:
            properties = self.events.GetEventProperties()
            return zeep.helpers.serialize_object(properties)
        except Exception as e:
            self._log("ERROR", f"Failed to get event properties: {str(e)}")
            raise

    def create_pull_point(self):
        """Create event pull point subscription"""
        try:
            response = self.events.CreatePullPointSubscription({
                'InitialTerminationTime': 'PT1H'
            })
            self._log("DEBUG", "Created pull point subscription")
            return self.camera.create_pullpoint_service(
                response.SubscriptionReference
            )
        except Exception as e:
            self._log("ERROR", f"Failed to create pull point: {str(e)}")
            raise

    def pull_messages(self, pull_point, timeout: str = 'PT5S'):
        """Pull messages from subscription.
           If no NotificationMessage is found, return None.
        """
        try:
            messages = pull_point.PullMessages({
                'Timeout': 'PT10S',
                'MessageLimit': 10
            })
            serialized = zeep.helpers.serialize_object(messages)
            if not serialized.get("NotificationMessage"):
                return None
            return serialized
        except Fault as fault:
            self._log("ERROR", f"SOAP Fault: {fault.message}")
            raise
        except TransportError as te:
            self._log("ERROR", f"Transport error: {str(te)}")
            raise
        except Exception as e:
            self._log("ERROR", f"Failed to pull messages: {str(e)}")
            raise

    def subscribe_and_pull(self):
        """Main subscription and message pulling loop"""
        try:
            # Get event properties
            properties = self.get_event_properties()
            self._log("DEBUG", "Event properties retrieved", {"properties": properties})

            # Create pull point subscription
            pull_point = self.create_pull_point()
            self._log("INFO", "Successfully created pull point subscription")

            # Main event loop
            while True:
                try:
                    messages = self.pull_messages(pull_point)
                    if messages is None:
                        self._log("INFO", "No messages received in this poll")
                    else:
                        self._log("INFO", "Received messages", {"messages": messages})
                    time.sleep(1)
                except Exception as e:
                    self._log("ERROR", f"Pull cycle failed: {str(e)}")
                    time.sleep(5)
                    try:
                        pull_point = self.create_pull_point()
                        self._log("INFO", "Successfully renewed subscription")
                    except Exception as renew_error:
                        self._log("ERROR", f"Failed to renew subscription: {str(renew_error)}")
                        raise

        except Exception as e:
            self._log("ERROR", f"Fatal subscription error: {str(e)}")
            raise

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='ONVIF Event Service')
    parser.add_argument('command', choices=['subscribe'], help='Command to execute')
    parser.add_argument('config', help='JSON configuration string')
    args = parser.parse_args()

    try:
        config = json.loads(args.config)
        service = OnvifEventService(
            host=config['host'],
            port=config['port'],
            user=config['username'],
            pwd=config['password']
        )
        
        if args.command == 'subscribe':
            service.subscribe_and_pull()
            
    except KeyboardInterrupt:
        sys.exit(0)
    except Exception as e:
        print(json.dumps({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": "ERROR",
            "message": f"Fatal error: {str(e)}"
        }), flush=True)
        sys.exit(1)


