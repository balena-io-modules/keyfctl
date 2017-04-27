'use strict';

const
  _     = require("lodash"),
  file  = require('../shared/file'),
  utils = require('../shared/utils')

module.exports = class Keyframe {
  constructor(revision) {
    this.revision  = revision
    this.errors    = []
    this.rationale = []
    this.valid     = true
  }

  addData() {
    return file.readAt('./keyframe.yml', this.revision, utils.parseYaml)
    .then(data => {
      return _.merge(this, data)
    })
    .catch(err => {
      this.valid = false
      this.errors.push(err)
      this.rationale.push('missing keyframe.yml')

      return this
    })
  }

  globalVars() {
    return _.get(this, 'keyframe.variables', [])
  }

  componentVars(componentName) {
    return _.get(this, `keyframe.components.${componentName}.variables`, [])
  }
}

