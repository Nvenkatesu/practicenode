const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())
const dbPath = path.join(__dirname, 'goodreads.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}
initializeDBAndServer()

//API 2
app.post('/users/', async (request, response) => {
  const {username, name, password, gender, location} = request.body
  const hashedPassword = await bcrypt.hash(password, 10)
  const selectUserQuery = `
    SELECT * 
    FROM user 
    WHERE username = '${username}'
  `
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    const createUserQuery = `
  INSERT INTO
    user (username, name, password, gender, location)
  VALUES
    (
      '${username}',
      '${name}',
      '${hashedPassword}',
      '${gender}',
      '${location}'  
    );`
    await db.run(createUserQuery)
    response.send('User Created Successfully')
  } else {
    response.status(400)
    response.send('User name already exists')
  }
})

//API 3

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `
  SELECT 
    * 
  FROM 
    user 
  WHERE 
    username = '${username}'`

  const dbUser = await db.get(selectUserQuery)

  if (dbUser === undefined) {
    response.status(400)
    response.send('User Invalid')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      }
      const jwtToken = jwt.sign(payload, 'ahffd89gh3gi6dd')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid Password')
    }
  }
})

// Password Change API

app.put('/change-password/', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body
  const hashedPassword = await bcrypt.hash(newPassword, 10)
  const checkUser = `
     select * 
     from user 
     where username = '${username}'
   `
  const dbUser = await db.get(checkUser)
  const isPasswordMatch = await bcrypt.compare(oldPassword, dbUser.password)
  if (isPasswordMatch === true) {
    if (newPassword.length > 5) {
      const updatePasswordQuery = `
         update user 
         set 
           password = '${hashedPassword}'
      `
      await db.run(updatePasswordQuery)
      response.status(200)
      response.send('Password updated')
    } else {
      response.status(400)
      response.send('Password is too short')
    }
  } else {
    response.status(400)
    response.send('Invalid current password')
  }
})

module.exports = app
