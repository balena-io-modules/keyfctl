'use strict';

const
  Promise = require('bluebird'),
  _       = require("lodash"),
  git     = require('../shared/git'),
  utils   = require('../shared/utils')

// get the set of commits relevant to the keyframe file
const generateFrames = (revision, end) => {
  return git.commits(revision, end) // returns list of Commit objects
  .each(commit => commit.getData())
  .filter(commit => commit.validate()) // checks commits to ensure all frames are valid
  .then(commits => {
    return _.filter(commits, (commit, n) => {
      if ((n + 1) === commits.length) return true

      const prevCommit = commits[n + 1]

      if (commit.keyframe.raw !== prevCommit.keyframe.raw) return true
      if (commit.rawVariables !== prevCommit.rawVariables) return true

      return false
    })
  })
  .each(commit => commit.copyDataToFrames()) // moves commit/keyframe/var info to frame object
  .then(commits => _.flatten(_.map(commits, commit => commit.frames))) // expands commits -> frames
  .each(frame => frame.buildReleases()) // calls buildRelease() on each template type
  .then(resolveAction) // figure out which keyframes are valid/usable
  .then(_.reverse) // put things in chronological order
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

    if (frame.action == null) {
      frame.action = 'noop'
    }

    return frame
  })
}

