const fs = require('fs-extra')
const path = require('path')
const express = require('express')
const request = require('supertest')
const fixtureMiddleware = require('../index')

describe('fixture middleware', () => {

  let server

  beforeAll(() => {
    server = createServer(path.join(__dirname, './fixtures'))
  })

  it('should obtain a matching file with any extension', async () => {
    await request(server)
      .get('/user')
      .expect('Content-Type', /json/)
      .expect(200, { name: 'rmariuzzo' })
  })

  it('should return 404 for non matching file', async () => {
    await request(server)
      .get('/non-matching-file')
      .expect(404)
  })

  it('should obtain a matching file with matching extension', async () => {
    await request(server)
      .get('/same')
      .set('Accept', 'text/plain')
      .expect(200, /txt/)
    await request(server)
      .get('/same')
      .set('Accept', 'text/html')
      .expect(200, /html/)
  })

  it('should not process non-GET method', async () => {
    await request(server).post('/test').expect(404)
    await request(server).put('/test').expect(404)
    await request(server).delete('/test').expect(404)
    await request(server).options('/test').expect(404)
    await request(server).head('/test').expect(404)
    await request(server).patch('/test').expect(404)
  })

})

function createServer (directory) {
  const server = express()
  const middleware = fixtureMiddleware(directory)
  server.use((req, res, next) => {
    try {
      middleware(req, res, next)
    } catch (err) {
      fail(err.message)
      next()
    }
  })
  server.use('*', (req, res, next) => {
    res.sendStatus(404)
  })
  return server
}
