'use strict';

const
  Promise    = require('bluebird'),
  _          = require('lodash'),
  Deployment = require('../shared/deployment'),
  Configmap  = require('../shared/configmap'),
  Ingress    = require('../shared/ingress'),
  Service    = require('../shared/service')

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
  }

  validate() {
    if (! this.deployment.valid) {
      this.valid = false
      this.rationale = _.merge(this.rationale, this.deployment.rationale)
    }

    if (! this.configmap.valid) {
      this.valid = false
      this.rationale.push('invalid configmap')
      this.rationale = _.merge(this.rationale, this.configmap.rationale)
    }

    if (! this.ingress.valid) {
      this.valid = false
      this.rationale = _.merge(this.rationale, this.ingress.rationale)
    }

    if (! this.service.valid) {
      this.valid = false
      this.rationale = _.merge(this.rationale, this.service.rationale)
    }
  }

  buildReleases() {
    this.configmap.buildRelease({
      component: {
        name: this.component.name
      },
      vars: this.availableVars
    })

    this.deployment.buildRelease(this.usedVars)

    _.forEach(['ingress', 'service'], (val) => {
      _.get(this, val).buildRelease()
    })

    return this
  }

  addDeployment() {
    this.deployment = new Deployment(this.revision, this.timestamp, this.component)

    return this.deployment.loadData
    .catch(err => {
      return this
    })
  }

  addConfigmap() {
    this.configmap = new Configmap(this.revision, this.component.name)

    return this.configmap.loadData
    .catch(err => {
      return this
    })
  }

  addService() {
    this.service = new Service(this.revision, this.component)

    return this.service.loadData
    .catch(err => {
      return this
    })
  }

  addIngress() {
    this.ingress = new Ingress(this.revision, this.component.name)

    return this.ingress.loadData
    .catch(err => {
      return this
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
}

