'use strict';

const
  Promise     = require('bluebird'),
  _           = require("lodash"),
{ readFileAsync, writeFileAsync } = Promise.promisifyAll(require('fs')),
  mkdirpAsync = Promise.promisify(require('mkdirp')),
  exec        = Promise.promisify(require("child_process").exec),
  utils       = require('../shared/utils'),
  git         = require('../shared/git')

// get the set of commits relevant to the keyframe file
const generateFrames = (revision) => {
  return git.commits(revision) // returns list of Commit objects
  .each(commit => commit.getDate())
  .each(commit => commit.getSubject())
  .each(commit => commit.getAuthorName())
  .each(commit => commit.getAuthorEmail())
  .each(commit => commit.getKeyframe()) // adds keyframe obj to commit
  .each(commit => commit.keyframe.addData()) // reads keyframe.yml into keyframe obj
  .each(commit => commit.getVariables()) // reads variables.yml into commit obj
  .each(commit => commit.getFrames()) // creates frames from commit, keyframe, vars, etc.
  .each(commit => commit.populateFrames()) // adds k8s template data to frames
  .each(commit => commit.validate()) // checks commits to ensure all frames are valid
  .each(commit => commit.copyDataToFrames()) // moves commit/keyframe/var info to frame object
  .then(commits => _.flatten(_.map(commits, commit => commit.frames))) // expands commits -> frames
  .each(frame => frame.buildReleases()) // calls buildRelease() on each template type
  .then(resolveAction) // figure out which keyframes are valid/usable
  .then(_.reverse) // put things in chronological order
}
module.exports.generateFrames = generateFrames

const writeRelease = (path, data) => {
  if (data == null) return

  const filename = `${_.toLower(data.kind)}.yml`
  let output = "# DO NOT EDIT THIS FILE BY HAND! IT IS GENERATED FROM A TEMPLATE\n"
  output += utils.dumpYaml(data)

  // attempt to parse the yaml, to make sure it's valid
  utils.parseYaml(output)

  return writeFileAsync(`${path}/${filename}`, output)
}

// this function figures out if action should be taken for a frame
const resolveAction = (frames) => {
  return _.map(frames, (frame, n) => {

    if (! frame.valid) {
      frame.rationale.push('invalid frame')
      frame.action = 'noop'
      return frame
    }

    let prev = null
    for (let i = n+1; i < frames.length; i++) {
      if (! frames[i].valid) {
        continue
      }

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
module.exports.resolveAction = resolveAction

// keyframes  - list of keyframes
const write = (frame, shouldCommit) => {
  if (frame.action == 'noop' || frame.action == 'delete') {
    throw new Error('attempted to write an invalid frame')
  }

  const path = utils.releasePath(frame.component.name)

  return mkdirpAsync(path)
  .then(() => {
    return writeRelease(path, frame.deployment.release)
    .then(writeRelease(path, frame.configmap.release))
    .then(writeRelease(path, frame.ingress.release))
    .then(writeRelease(path, frame.service.release))
    .then(() => {
      return readFileAsync('./CHANGELOG.txt')
    })
    .then(buffer => {
      const output = utils.printFormatFrame(frame) + buffer.toString()
      return writeFileAsync('./CHANGELOG.txt', output)
    })
    .then(() => {
      if (shouldCommit) return writeCommit(frame)
    })
  })
}
module.exports.write = write

const writeCommit = (frame) => {
  let path = utils.releasePath(frame.component.name)

  const cmd = `git add ${path} CHANGELOG.txt && git commit -m '`
  + utils.releaseMessage(frame)
  + "\n\n"
  + utils.printFormatFrame(frame)
  + "'"

  return exec(cmd)
  .catch(err => {
    throw new Error(err.stack)
  })
}

const newRelease = (frame) => {
  return git.commits('HEAD')
  .map(commit => commit.getSubject())
  .filter(commit => {
    return (new RegExp('k8s-' + frame.commit.revision, 'i')).test(commit.subject)
  })
  .then(commits => {
    return commits.length < 1
  })
}
module.exports.newRelease = newRelease

