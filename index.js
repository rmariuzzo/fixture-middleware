/*!
 * fixture-middleware
 * Copyright(c) 2017-present Rubens Mariuzzo
 * MIT Licensed
 */

/**
 * Module dependencies.
 * @private
 */

const fs = require('fs-extra')
const glob = require('glob')
const mime = require('mime')
const path = require('path')
const debug = require('debug')('fixture-middleware')

/**
 * Module exports.
 * @public
 */

module.exports = fixtureMiddleware

function fixtureMiddleware(directory) {

  debug('fixture directory:', directory)

  if (!directory) {
    throw new TypeError('directory path required')
  }

  if (typeof directory !== 'string') {
    throw new TypeError('directory path must be a string')
  }

  return async function fixtureMiddleware(req, res, next) {
    debug('request url:', req.url)

    if (req.method !== 'GET') {
      debug('ignoring non-GET request')
      return next()
    }

    const fixtureName = req.url.substr(1).replace(/\//g, '--')

    debug('fixture name:', fixtureName)

    const fixtureBasePath = path.join(directory, fixtureName)
    const fixturePaths = glob.sync(`${fixtureBasePath}.*`)

    let [fixturePath] = fixturePaths
    if (req.headers.accept) {
      debug('using request accept headers:', req.headers.accept)
      const extension = mime.extension(req.headers.accept)
      debug('extension from request accept headers:', extension)
      fixturePath = fixturePaths.find(fp => fp.endsWith(`.${extension}`))
    }

    if (!fixturePath) {
      debug('no fixture found')
      return next()
    }

    debug('matching fixture:', fixturePath)

    try {
      await fs.access(fixturePath)
      const stat = await fs.stat(fixturePath)
      res.writeHead(200, {
        'Content-Type': req.headers.accept || mime.lookup(fixturePath),
        'Content-Length': stat.size
      })
      fs.createReadStream(fixturePath).pipe(res)
    } catch(error) {
      debug('error', error.message)
      return next()
    }

  }

}
