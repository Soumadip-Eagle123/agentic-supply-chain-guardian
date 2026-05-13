import express from 'express'
import session from 'express-session'
const app = express() 
const PORT = 8000
import cors from 'cors';
const secret = 'jellyfish-baskingshark'
import { authRouter } from './routes/auth.js'
import { shipmentRouter, allRouter, inventoryRouter } from './routes/shipment.js'
app.use(express.json()) 
console.log(process.env.SUPABASE_URL)
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
  secret: secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}))

app.set('trust proxy', 1);

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], // Allow your frontend
  credentials: true,                // Required for sessions/cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use('/api/auth', authRouter);
app.use('/api/shipment', allRouter);
app.use('/api/shipment', shipmentRouter);
app.use('/api/inventory', inventoryRouter);


app.listen(PORT, () => { 
  console.log(`Server running at http://localhost:${PORT}`)
}).on('error', (err) => {
  console.error('Failed to start server:', err)
})