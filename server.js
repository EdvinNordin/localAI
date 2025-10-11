import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import fetch from 'node-fetch'
import cors from 'cors'

const app = express()
app.use(express.json())
app.use(cors())

const LANGSEARCH_KEY = process.env.LANGSEARCH_KEY // store securely in .env

app.post('/langsearch', async (req, res) => {
  const query = req.body.query
  try {
    const response = await fetch('https://api.langsearch.com/v1/web-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + LANGSEARCH_KEY,
      },
      body: JSON.stringify({
        query: query,
        count: 1, // optional, number of results you want
      }),
    })

    const data = await response.json()
    res.json(data)
  } catch (err) {
    console.error('LangSearch error:', err)
    res.status(500).json({ error: 'LangSearch proxy failed' })
  }
})

app.listen(3001, () => console.log('Proxy running at http://localhost:3001'))
