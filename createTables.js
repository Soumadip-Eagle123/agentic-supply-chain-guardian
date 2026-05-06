import db from './db/db.js'

function createUsersTable() {

    db.exec(`
        CREATE TABLE IF NOT EXISTS users (

            userID INTEGER PRIMARY KEY AUTOINCREMENT,

            username TEXT UNIQUE NOT NULL,

            password TEXT NOT NULL,

            loggedIn INTEGER NOT NULL CHECK(loggedIn IN (0,1))
        )
    `)

    console.log("Users table created")
}

function createShipmentsTable() {

    db.exec(`
        CREATE TABLE IF NOT EXISTS shipments (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            userID INTEGER REFERENCES users(userID),

            product_name TEXT NOT NULL,

            quantity INTEGER NOT NULL,

            source TEXT NOT NULL,

            destination TEXT NOT NULL,

            status TEXT NOT NULL
        )
    `)

    console.log("Shipments table created")
}

export function createTables() {

    createUsersTable()

    createShipmentsTable()

    console.log("All tables created!")
}

if (process.argv[1].includes('createTables')) {
    createTables()
}