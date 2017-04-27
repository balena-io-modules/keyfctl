'use strict';

const
  Promise = require('bluebird'),
  _       = require("lodash"),
  exec    = Promise.promisify(require("child_process").exec),
  util    = require('util'),
  utils   = require('../shared/utils')

const readAt = (filename, revision, callback) => {
  if (callback != null) {
    return exec(`git show ${revision}:${filename}`)
    .then(contents => {
      return callback(contents)
    })
  }

  return exec(`git show ${revision}:${filename}`)
}
module.exports.readAt = readAt

