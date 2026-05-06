
import bcrypt from 'bcryptjs'
import db from '../db/db.js'
export async function signup(req, res){
    let {username, password} = req.body;
    if(!username || !password){
        return res.status(400).json({error: "Username or password field is empty!"})
    }
    
    username = username.trim();

    if (!/^[a-zA-Z0-9_-]{1,20}$/.test(username)) {

      return res.status(400).json(
        { error: 'Username must be 1-20 characters, using letters, numbers, _ or -.' }
      )
    }
    
    try{
        let userid = db.prepare(`SELECT userID FROM users 
                           WHERE username=?`).get(username);
        if(userid){
            return res.status(400).json({error: "Username already exists"})
        }
        const hashed = await bcrypt.hash(password, 10)
        db.prepare(`INSERT INTO users(username, password, loggedIn) VALUES (?, ?, 0)`).run(username, hashed);
        return res.status(201).json({Success: "User registered!"});
    }
    catch(err){
       console.error('Registration error:', err.message);
       res.status(500).json({ error: 'Registration failed. Please try again.' })

    }
}

export async function login(req, res){
    let {username, password} = req.body;
    if(!username || !password){
        return res.status(400).json({error: "Username or password field is empty!"})
    }
    try{

       const result = db.prepare(`SELECT * FROM users
                                  WHERE username=?`).get(username);
        if(!result) return res.status(400).json({error: "Wrong username or password"});
        const isValid = await bcrypt.compare(password, result.password)
       if(!isValid){
           return res.status(400).json({error: "Wrong username or password"});
       }
       req.session.userId = result.userID;
       db.prepare(`UPDATE users SET loggedIn=1 WHERE userID=?`).run(req.session.userId);
       res.status(200).json({ Success: "User Login successful!"});
    }
    catch (err) {
      console.error('Login error:', err.message)
      res.status(500).json({ error: 'Login failed. Please try again.' })
    }

}
export async function logout(req, res) {
    if(!req.session.userId){

        return res.status(401).json({
            error: "Not logged in"
        });

    }
  let userID = req.session.userId;
  db.prepare(`UPDATE users SET loggedIn=0 WHERE userID=?`).run(userID);
  req.session.destroy( () => {

    res.json({ message: 'Logged out' })

  })

}