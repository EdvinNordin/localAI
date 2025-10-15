import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import proxy from 'express-http-proxy'
import path from 'path'

import fetch from 'node-fetch'
import cors from 'cors'

import { fileURLToPath } from 'url'
const app = express()
app.use(express.json())
app.use(cors())

const __dirname = path.dirname(fileURLToPath(import.meta.url))

app.use(express.static(path.join(__dirname, 'dist')))

const LANGSEARCH_KEY = process.env.LANGSEARCH_KEY // store securely in .env

/*
let proxyURL = window.location.origin
proxyURL = proxyURL.replace(':3000', ':11434')*/

app.use(
  '/ollama',
  proxy('http://localhost:11434', {
    //'http://host.docker.internal:11434'
    proxyReqPathResolver: (req) => req.url.replace(/^\/ollama/, ''),
    proxyReqOptDecorator: (proxyReqOpts) => {
      proxyReqOpts.headers.Host = '127.0.0.1:11434'
      return proxyReqOpts
    },
  }),
)

app.post('/langsearch', async (req, res) => {
  const query = req.body.query
  try {
    const searchResponse = await fetch('https://api.langsearch.com/v1/web-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + LANGSEARCH_KEY,
      },
      body: JSON.stringify({
        query: query,
        count: 5, // optional, number of results you want
      }),
    })

    const searchData = await searchResponse.json()
    const pages = searchData.data?.webPages?.value || []
    const documents = pages.map((p) => p.summary || p.snippet || p.name || p.url || '')

    const rerankResponse = await fetch('https://api.langsearch.com/v1/rerank', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LANGSEARCH_KEY}`,
      },
      body: JSON.stringify({
        model: 'langsearch-reranker-v1',
        query,
        documents,
      }),
    })

    const rankData = await rerankResponse.json()

    const combindedData = []
    rankData.results.forEach((page) => {
      const object = { summary: documents[page.index], relevance_score: page.relevance_score }
      combindedData.push(object)
    })

    //combinedData.sort((a, b) => b.relevance_score - a.relevance_score)
    res.json(combindedData)
  } catch (err) {
    console.error('LangSearch error:', err)
    res.status(500).json({ error: 'LangSearch proxy failed' })
  }
})

app.listen(3000, '0.0.0.0') // () => console.log('Proxy running at http://localhost:3001'))
