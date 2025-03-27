kconst cam = new Cam({
  hostname: '192.168.86.86',
  port: 8000,
  username: 'admin',
  password: 'camera123'
}, async function (err) {
  if (err) {
    console.error('❌ Failed to connect:', err.message);
    return;
  }

  try {
    const capabilities = await cam.device.getCapabilities();
    console.log('✅ Capabilities:', capabilities);

    const events = await cam.events.getEventProperties();
    console.log('✅ Events:', events);
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
});


