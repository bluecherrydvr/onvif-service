// const onvif = require('onvif');
const onvif = require('node-onvif');
const xml2js = require('xml2js'); // Ensure xml2js is installed and imported
const { stripPrefix } = require('xml2js/lib/processors'); // Import stripPrefix

function discoverDevices(timeout = 10000) { // Set a default timeout, e.g., 10 seconds
    return new Promise((resolve, reject) => {
        devices = {};
        let names = {};
        onvif.startProbe().then((device_list) => {
            device_list.forEach((device) => {
                let odevice = new onvif.OnvifDevice({
                    xaddr: device.xaddrs[0]
                });
                let addr = odevice.address;
                devices[addr] = odevice;
                names[addr] = device.name;
            });
            var devs = {};
            for(var addr in devices) {
                devs[addr] = {
                    name: names[addr],
                    address: addr
                }
            }
            let res = {'id': 'startDiscovery', 'result': devs};
           console.log(JSON.stringify(res))
        }).catch((error) => {
            let res = {'id': 'connect', 'error': error.message};
            console.log(JSON.stringify(res))
        });
    });
}


module.exports = {
    discoverDevices
};
