import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'
import ws from 'ws'

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  {
    realtime: {
      transport: ws
    }
  }
)

export default db