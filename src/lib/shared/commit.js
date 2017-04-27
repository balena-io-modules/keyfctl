'use strict';

const
  Promise   = require('bluebird'),
  _         = require("lodash"),
  util      = require('util'),
  utils     = require('../shared/utils'),
  file      = require('../shared/file'),
  Keyframe  = require('../shared/keyframe'),
  Frame     = require('../shared/frame'),
  Component = require('../shared/component')

module.exports = class Commit {
  constructor(revision) {
    this.revision = revision.substring(0,6)
    this.errors = []
    this.valid = true
    this.rationale = []
  }

  getDate() {
    return utils.addExecRes(
      this,
      `git show -s --format=%ci ${this.revision}`,
      'date'
    )
    .then(() => this.timestamp = (new Date(this.date)).getTime())
  }

  getSubject() {
    // Add commit subject
    return utils.addExecRes(
      this,
      `git show -s --format=%s ${this.revision}`,
      'subject'
    )
  }

  getAuthorName() {
    // Add commit author name
    return utils.addExecRes(
      this,
      `git show -s --format=%an ${this.revision}`,
      'author.name'
    )
  }

  getAuthorEmail() {
    // Add commit author email
    return utils.addExecRes(
      this,
      `git show -s --format=%ae ${this.revision}`,
      'author.email'
    )
  }

  getKeyframe() {
    this.keyframe = (new Keyframe(this.revision))
  }

  getVariables() {
    return file.readAt('./variables.yml', this.revision, utils.parseYaml)
    .then(data => {
      this.variables = data
      return this
    })
    .catch(err => {
      this.errors.push(err)
      this.rationale.push('missing variables.yml')
      return this
    })
  }

  globalVars() {
    return _.get(this.variables, 'global', [])
  }

  componentVars(componentName) {
    return _.get(this.variables, componentName, [])
  }

  getFrames() {
    this.frames = _.map(_.get(this.keyframe, 'keyframe.components', {}), (val, key) => {
      return new Frame(this.revision, this.timestamp, new Component(key, val.version, val.image))
    })

    return this
  }

  populateFrames() {
    return Promise.each(this.frames, frame => {
      return frame.addDeployment()
      .then(() => frame.addService())
      .then(() => frame.addIngress())
      .then(() => frame.addConfigmap())
    })
  }

  validate() {
    if (this.keyframe.valid !== true) {
      frame.valid = false
      frame.rationale.push('keyframe is invalid')
    }

    for (let frame of this.frames) {
      if (frame.deployment.errors.length > 0) {
        frame.valid = false
        frame.rationale.push('deployment template is invalid or missing')
      }
      if (frame.service.errors.length > 0) {
        frame.valid = false
        frame.rationale.push('service template is invalid or missing')
      }

      if (! this.valid) {
        frame.valid = false
        frame.rationale.push('commit is invalid')
      }

      // combination of all referenced vars, global and component-scoped
      frame.usedVars = _.union(
        this.keyframe.componentVars(frame.component.name),
        this.keyframe.globalVars()
      )

      // union of all available vars, global and component-scoped
      frame.availableVars = _.union(
        this.globalVars(),
        this.componentVars(frame.component.name)
      )

      if (! frame.validateVars()) {
        this.valid = false
        this.rationale.push('invalid variables used in frame')
      }
    }
  }

  copyDataToFrames() {
    for (let frame of this.frames) {
      frame.keyframe = _.cloneDeep(this.keyframe)
      frame.commit   = _.cloneDeep(this)

      delete frame.commit.frames
      delete frame.commit.keyframe
      delete frame.commit.variables
    }
  }
}

