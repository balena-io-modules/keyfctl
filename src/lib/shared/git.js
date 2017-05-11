'use strict';

const
  Promise = require('bluebird'),
  _       = require("lodash"),
  exec    = Promise.promisify(require("child_process").exec),
  Commit  = require('../shared/commit')

module.exports.commits = (head) => {
  return exec(`git rev-list ${head}`)
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

