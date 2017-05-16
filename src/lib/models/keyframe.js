'use strict';

const
  _     = require("lodash"),
  utils = require('../shared/utils'),
  git   = require('../shared/git'),
  Component   = require('../models/component'),
  Frame   = require('../models/frame')

module.exports = class Keyframe {
  constructor(revision) {
    this.revision  = revision
    this.errors    = []
    this.rationale = []
    this.valid     = true

    this.loadData = git.readFileAt(
      './keyframe.yml',
      this.revision
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
    if (! this.valid) return this.valid

    if (_.get(this, 'keyframe.components', []).length < 1) {
      this.valid = false
      this.rationale.push('no components defined in keyframe')
    }

    return this.valid
  }

  frames() {
    return _.map(_.get(this, 'keyframe.components', {}), (val, key) => {
      return new Frame(this.revision, (new Date()).getTime(), new Component(key, val))
    })
  }
}

