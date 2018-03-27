'use strict';

const
  Promise = require('bluebird'),
  _       = require("lodash")
const { execAsync } = Promise.promisifyAll(require('child_process'))
const git     = require('../shared/git'),
  utils   = require('../shared/utils')
const Commit = require('../models/commit')
const Keyframe = require('../models/keyframe')
const Configuration = require('../models/configuration').Configuration

const buildCommit = (commit) => {
  return Promise.join(
    execAsync(`git show -s --format=%ci ${commit.revision}`),
    execAsync(`git show -s --format=%s ${commit.revision}`),
    execAsync(`git show -s --format=%an ${commit.revision}`),
    execAsync(`git show -s --format=%ae ${commit.revision}`),
    git.readFileAt('./variables.yml', commit.revision),
    git.readFileAt('./keyframe.yml', commit.revision),
    (date, subject, authorName, authorEmail, configuration, keyframe) => {
      _.set(commit, 'date', date)
      _.set(commit, 'subject', subject)
      _.set(commit, 'author.name', authorName)
      _.set(commit, 'author.email', authorEmail)
      _.set(commit, 'configuration', new Configuration(utils.parseYaml(configuration)))
      _.set(commit, 'keyframe', new Keyframe(utils.parseYaml(keyframe)))
    }
  )
  .return(commit)
}

// get the set of commits relevant to the keyframe file
const generateFrames = (options) => {
  console.log(options)
  const { base, head } = options

  const baseCommit = new Commit(base)
  const headCommit = new Commit(head)

  return Promise.each([baseCommit, headCommit], buildCommit)
  .each(c => console.log(c.isValid()))
  .then(res => {
    console.log(res)
    process.exit()
  })
  .catch(err => {
    console.error(err)
    process.exit()
  })
}
module.exports.generateFrames = generateFrames

// this function figures out if action should be taken for a frame
const resolveAction = (frames) => {
  return _.map(frames, (frame, n) => {

    if (! frame.valid) {
      throw new Error('invalid frame made it to resolveAction!')
    }

    let prev = null
    for (let i = n+1; i < frames.length; i++) {
      if (frames[i].component.name !== frame.component.name) {
        continue
      }

      // we found a valid, matching frame for this component
      prev = frames[i]
      break
    }

    if (prev == null) {
      // we're adding a component, since we didn't find one
      frame.rationale.push('no prior instances of component')
      frame.action = 'create'
      return frame
    }

    if (! _.isEqual(JSON.stringify(frame.deployment.template), JSON.stringify(prev.deployment.template))) {
      frame.rationale.push('changes in deployment template')
      frame.action = 'update'
    }

    if (! _.isEqual(JSON.stringify(frame.configmap.template), JSON.stringify(prev.configmap.template))) {
      frame.rationale.push('changes in configmap template')
      frame.action = 'update'
    }

    if (! _.isEqual(JSON.stringify(frame.ingress.template), JSON.stringify(prev.ingress.template))) {
      frame.rationale.push('changes in ingress template')
      frame.action = 'update'
    }

    if (! _.isEqual(JSON.stringify(frame.service.template), JSON.stringify(prev.service.template))) {
      frame.rationale.push('changes in service template')
      frame.action = 'update'
    }

    if (! _.isEqual(JSON.stringify(frame.usedVars), JSON.stringify(prev.usedVars))) {
      frame.rationale.push('change in used variables')
      frame.action = 'update'
    }

    if (! _.isEqual(JSON.stringify(frame.availableVars), JSON.stringify(prev.availableVars))) {
      frame.rationale.push('change in available variables')
      frame.action = 'update'
    }

    if (frame.component.version !== prev.component.version) {
      frame.rationale.push('change in component version')
      frame.action = 'update'
    }

    if (frame.component.image !== prev.component.image) {
      frame.rationale.push('change in component image')
      frame.action = 'update'
    }

    if (JSON.stringify(frame.component.ports) !== JSON.stringify(prev.component.ports)) {
      frame.rationale.push('change in component ports')
      frame.action = 'update'
    }

    if (JSON.stringify(frame.component.volumes) !== JSON.stringify(prev.component.volumes)) {
        frame.rationale.push('change in component volumes')
        frame.action = 'update'
    }

    if (JSON.stringify(frame.component.capabilities) !== JSON.stringify(prev.component.capabilities)) {
        frame.rationale.push('change in component capabilities')
        frame.action = 'update'
    }

    if (frame.action == null) {
      frame.action = 'noop'
    }

    return frame
  })
}

