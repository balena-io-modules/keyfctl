'use strict';

const
  Promise                         = require('bluebird'),
  _                               = require('lodash'),
{ readFileAsync, writeFileAsync } = Promise.promisifyAll(require('fs')),
  mkdirpAsync                     = Promise.promisify(require('mkdirp')),
  execAsync                       = Promise.promisify(require("child_process").exec),
  utils                           = require('../../../lib/utils'),
  git                             = require('../../../lib/git'),
  Deployment                      = require('../models/deployment'),
  Configmap                       = require('../models/configmap'),
  Ingress                         = require('../models/ingress'),
  Service                         = require('../models/service')

module.exports = class Frame {
  constructor(revision, timestamp, component) {
    this.keyframe  = null
    this.revision  = revision
    this.timestamp = timestamp
    this.component = component
    this.usedVars  = []
    this.errors    = []
    this.valid     = true
    this.rationale = []
    this.action    = null
    this.deployment = new Deployment(this.revision, this.timestamp, this.component)
    this.configmap = new Configmap(this.revision, this.component)
    this.service = new Service(this.revision, this.component)
    this.ingress = new Ingress(this.revision, this.component)
  }

  validate() {
    if (! this.deployment.valid) {
      this.valid = false
      this.rationale.push('invalid deployment')
      this.rationale = _.merge(this.rationale, this.deployment.rationale)
    }

    if (! this.configmap.valid) {
      this.valid = false
      this.rationale.push('invalid configmap')
      this.rationale = _.merge(this.rationale, this.configmap.rationale)
    }

    if (! this.ingress.valid) {
      this.valid = false
      this.rationale.push('invalid ingress')
      this.rationale = _.merge(this.rationale, this.ingress.rationale)
    }

    if (! this.service.valid) {
      this.valid = false
      this.rationale.push('invalid service')
      this.rationale = _.merge(this.rationale, this.service.rationale)
    }

    return this.validateVars()
  }

  buildReleases() {
    this.configmap.availableVars = this.availableVars
    this.configmap.usedVars = this.usedVars

    this.configmap.buildRelease()

    this.deployment.buildRelease(this.usedVars)

    _.forEach(['ingress', 'service'], (val) => {
      _.get(this, val).buildRelease()
    })
  }

  validateVars() {
    const availableVarsList = _.map(this.availableVars, 'name')

    for (let n of this.usedVars) {
      if (_.includes(availableVarsList, n)) continue

      this.valid = false
      this.rationale.push(`unavailable variable used (${n})`)
    }

    return this.valid
  }

  write(shouldCommit) {
    if (this.action == 'noop' || this.action == 'delete') {
      throw new Error('attempted to write an invalid frame')
    }

    const path = utils.releasePath(this.component.name)

    return mkdirpAsync(path)
    .then(() => {
      return Promise.join(
        this.deployment.writeRelease(),
        this.ingress.writeRelease(),
        this.configmap.writeRelease(),
        this.service.writeRelease()
      )
      .then(() => {
        return readFileAsync('./CHANGELOG.txt')
      })
      .then(buffer => {
        if (! shouldCommit) return

        const output = utils.printFormatFrame(this) + buffer.toString()
        return writeFileAsync('./CHANGELOG.txt', output)
      })
      .then(() => {
        if (shouldCommit) return this.writeCommit()
      })
    })
  }

  writeCommit() {
    let path = utils.releasePath(this.component.name)

    const cmd = `git add ${path} CHANGELOG.txt && git commit -m '`
      + utils.releaseMessage(this)
      + "\n\n"
      + utils.printFormatFrame(this)
      + "'"

    return execAsync(cmd)
    .catch(err => {
      throw new Error(err.stack)
    })
  }

  isNewRelease() {
    const regex = new RegExp('k8s-' + this.commit.revision.substring(0, 6), 'i')

    return git.commits('HEAD')
    .each(commit => commit.getSubject())
    .filter(commit => {
      if (!commit.subject) {
        throw new Error(`Something failed while reading commits! missing subject on commit ${commit.revision}`)
      }
      return regex.test(commit.subject)
    })
    .then(commits => {
      return commits.length < 1
    })
  }
}

