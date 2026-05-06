import Database from 'better-sqlite3'
import path from 'node:path'

const dbPath = path.join('database.db')

const db = new Database(dbPath)

export default db;