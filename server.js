import express from 'express'
import session from 'express-session'
const app = express() 
const PORT = 8000
const secret = 'jellyfish-baskingshark'
import { authRouter } from './routes/auth.js'
import { shipmentRouter, allRouter } from './routes/shipment.js'
import { createTables } from './createTables.js'
createTables();
app.use(express.json()) 

app.use(session({
  secret: secret,
  resave: false, 
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax'
  }
}))

app.use('/api/auth', authRouter);
app.use('/api/shipment', allRouter);
app.use('/api/shipment/:userID', shipmentRouter);

app.listen(PORT, () => { 
  console.log(`Server running at http://localhost:${PORT}`)
}).on('error', (err) => {
  console.error('Failed to start server:', err)
})