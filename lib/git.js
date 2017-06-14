'use strict';

const
  Promise = require('bluebird'),
  _       = require("lodash"),
  exec    = Promise.promisify(require("child_process").exec),
  Commit  = require('../lib/models/commit')

const commits = (start, end, cwd) => {
  let cmd = `git rev-list ${start}`

  if (end) {
    cmd = cmd + ` ^${end}`
  }

  return exec(cmd, { cwd: cwd })
  .then(revs => {
    const revsList = _.compact(_.split(revs, "\n"))

    if (revsList.length < 1) {
      throw new Error('No commits')
    }

    return _.map(revsList, rev => {
      return new Commit(rev)
    })
  })
}
module.exports.commits = commits

const readFileAt = (filename, revision, cwd, callback) => {
  if (callback) {
    return exec(`git show ${revision}:${filename}`, { cwd: cwd })
    .then(contents => {
      return callback(contents)
    })
  }

  return exec(`git show ${revision}:${filename}`, { cwd: cwd })
}
module.exports.readFileAt = readFileAt

