'use strict';

const
  _     = require("lodash"),
  utils = require('../../../lib/utils'),
  git   = require('../../../lib/git'),
  Component   = require('../models/component'),
  Frame   = require('../models/frame')

module.exports = class Keyframe {
  constructor(revision, cwd) {
    this.revision  = revision
    this.errors    = []
    this.rationale = []
    this.valid     = true

    this.loadData = git.readFileAt(
      './keyframe.yml',
      this.revision,
      cwd
    )
    .then(yaml => {
      this.raw = yaml

      _.merge(this, utils.parseYaml(yaml))
    })
    .catch(err => {
      this.valid = false
      this.errors.push(err)
      this.rationale.push('missing keyframe.yml')
    })
  }

  globalVars() {
    return _.get(this, 'keyframe.variables', [])
  }

  componentVars(componentName) {
    return _.get(this, `keyframe.components.${componentName}.variables`, [])
  }

  validate() {
    _.forEach(this.services(), service => {
      if (!service.validate()) {
        this.valid = false
        this.errors.push(service.errors)
      }
    })

    return this.valid
  }

  services() {
    if (this._services) return this._services

    this._services = {}
    _.forEach(_.get(this, 'keyframe.services', {}), (val, key) => {
      this._services[key] = new Service(this.revision, key, val)
    })

    return this._services
  }

  frames() {
    return _.map(_.get(this, 'keyframe.services', {}), (val, key) => {
      return new Frame(this.revision, (new Date()).getTime(), new Component(key, val))
    })
  }
}

class Service {
  constructor(revision, name, obj) {
    this.errors = []
    this._revision = revision
    this._name = name

    _.merge(this, obj)
  }

  revision() {
    return this._revision
  }

  name() {
    return this._name
  }

  validate() {
    if (!this.version) {
      this.valid = false
      this.errors.push('missing version')
    }

    if (!this.image) {
      this.valid = false
      this.errors.push('missing image')
    }

    if (!this.target) {
      this.valid = false
      this.errors.push('missing target')
    }

    this.valid = true

    return this.valid
  }

  differencesFrom(otherService) {
    const reasons = []

    if (this.version !== otherService.version) reasons.push('change in version')
    if (this.image !== otherService.image) reasons.push('change in image')
    if (JSON.stringify(this.variables) !== JSON.stringify(otherService.variables)) {
      reasons.push('change in variable usage')
    }

    return reasons
  }
}

