'use strict';

const
  Promise   = require('bluebird'),
  _         = require("lodash"),
  utils     = require('../../lib/utils'),
  git       = require('../../lib/git'),
  Keyframe  = require('../../src/lib/models/keyframe'),
  Frame     = require('../../src/lib/models/frame'),
  Component = require('../../src/lib/models/component')

module.exports = class Commit {
  constructor(revision) {
    this.revision = revision.substring(0,7)
    this.errors = []
    this.valid = true
    this.rationale = []
    this.keyframe = new Keyframe(this.revision)

  }

  loadVariables() {
    git.readFileAt(
      './variables.yml',
      this.revision
    )
    .then(yaml => {
      this.rawVariables = yaml
      this.variables = utils.parseYaml(yaml)
    })
    .catch(err => {
      this.errors.push(err)
      this.rationale.push('missing variables.yml')
    })
    .return(this)
  }

  getData() {
    return Promise.all([
      this.getDate(),
      this.getSubject(),
      this.getAuthorName(),
      this.getAuthorEmail()
    ])
    .then(() => this.loadVariables()) // reads variables.yml into commit obj
    .then(() => this.keyframe.loadData) // adds keyframe obj to commit and loads data
    .then(() => this.getFrames()) // creates frames from commit, keyframe, vars, etc.
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

  globalVars() {
    return _.get(this.variables, 'global', [])
  }

  componentVars(componentName) {
    return _.get(this.variables, componentName, [])
  }

  getFrames() {
    this.frames = this.keyframe.frames()
  }

  isK8sCommit() {
    return (new RegExp(/^k8s-/i)).test(this.subject)
  }

  validate() {
    // If this is a commit made by keyfctl, return false
    if (this.isK8sCommit()) return false

    // If the keyframe is invalid, return false
    if (! this.keyframe.validate()) return false

    // If the frames are invalid, return false
    for (const frame of this.frames) {
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

      if (! frame.validate()) return false
    }

    // Otherwise, return the validity status of the commit
    return this.valid
  }

  legacyValidate() {
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

