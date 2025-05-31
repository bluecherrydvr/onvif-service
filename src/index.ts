import express from 'express';
import { registerRoutes } from './routes/Routes';
import { Server } from './server';
import { Models } from './models/Models';

const app = express();
app.use(express.json());
registerRoutes(app);

Server.Initialize(); // ✅ Make sure this is called
Models.Initialize(); // ✅ Must come AFTER Server.Initialize

app.listen(4000, () => {
  console.log('[INFO] ONVIF Service started on port 4000');
});

