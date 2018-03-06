'use strict';

const
  Promise   = require('bluebird'),
  _         = require("lodash"),
  utils     = require('../shared/utils'),
  git       = require('../shared/git'),
  Keyframe  = require('../models/keyframe'),
  Frame     = require('../models/frame'),
  Component = require('../models/component')

module.exports = class Commit {
  constructor(revision) {
    this.revision = revision
    this.errors = []
    this.valid = true
    this.rationale = []
  }

  isValid() {
    this.errors = []

    // If the keyframe is invalid, return false
    if (!this.keyframe.isValid() && !this.configuration.isValid()) return false

    // If the frames are invalid, return false
    _.forEach(this.keyframe.services(), (data, name) => {
      // combination of all referenced vars, global and component-scoped
      const usedVars = _.union(
        this.keyframe.componentVars(name),
        this.keyframe.globalVars()
      )

      // union of all available vars, global and component-scoped
      const availableVars = _.union(
        _.map(this.configuration.globalVars(), 'name'),
        _.map(this.configuration.componentVars(name), 'name')
      )

      _.forEach(usedVars, used => {
        if (!_.includes(availableVars, used)) return

        this.errors.push(`variable ${used} referenced in keyframe but not in configuration`)
      })

      return this.errors.length === 0
    })

    // Otherwise, return the validity status of the commit
    return this.valid
  }
}

