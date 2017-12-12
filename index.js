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

/**
 * Create a fixture middleware.
 * @param {String} directory The directory containing fixtures.
 * @return {Function}
 */

function fixtureMiddleware(directory) {

  debug('fixture directory:', directory)

  if (!directory) {
    throw new TypeError('directory path required')
  }

  if (typeof directory !== 'string') {
    throw new TypeError('directory path must be a string')
  }

  /**
   * Fixture Middleware.
   * @param {Object} req The request.
   * @param {Object} res The response.
   * @param {Function} next The next function.
   */
  return async function fixtureMiddleware(req, res, next) {

    debug('request url:', req.url)

    // Ignore any non-get request.
    if (req.method !== 'GET') {
      debug('ignoring non-GET request:', req.method)
      return next()
    }

    // Determine the name of the fixture file.
    // Example: /user/all/active > user--all--active
    const fixtureName = req.url.substr(1).replace(/\//g, '--')

    debug('requested fixture name:', fixtureName)

    const fixtureBasePath = path.join(directory, fixtureName)
    const fixturePaths = glob.sync(`${fixtureBasePath}.*`)

    let [fixturePath] = fixturePaths

    // If request accept header is present, then we use it to determine the file type.
    if (req.headers.accept) {
      debug('using request accept headers:', req.headers.accept)
      const extension = mime.extension(req.headers.accept)

      debug('extension from request accept headers:', extension)
      fixturePath = fixturePaths.find(fp => fp.endsWith(`.${extension}`))
    }

    // When no fixture file is found, then delegate request to next middleware in chain.
    if (!fixturePath) {
      debug('no fixture found')
      return next()
    }

    debug('matching fixture:', fixturePath)

    // Read the fixture file and return it.
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
