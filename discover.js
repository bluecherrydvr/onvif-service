const onvif = require('onvif');

console.log('Starting ONVIF discovery...');

onvif.Discovery.on('device', (device) => {
  console.log('Discovered device:');
  console.log(JSON.stringify(device, null, 2));
});

onvif.Discovery.on('error', (error) => {
  console.error('Error during ONVIF discovery:', error);
});

onvif.Discovery.probe();