'use strict';

const
  Promise     = require('bluebird'),
  _           = require("lodash"),
  exec        = Promise.promisify(require("child_process").exec),
  mkdirpAsync = Promise.promisify(require('mkdirp')),
  YAML        = require('yamljs'),
  util        = require('util')

const inspect = (...input) => {
  return console.log(util.inspect(input, false, null))
}
module.exports.inspect = inspect

const templatePath = (component, filename) => {
  let output = `./k8s/templates/${component}`

  if (filename != null) {
    output = output + `/${filename}.yml`
  }

  return output
}
module.exports.templatePath = templatePath

const dumpYaml = (obj) => {
  // switch to inline dump after 99 levels of indentation, use 2 spaces for
  // indentation
  return YAML.stringify(obj, 99, 2)
}
module.exports.dumpYaml = dumpYaml

const parseYaml = (str) => {
  return new Promise((res, rej) => {
    res(YAML.parse(str))
  })
}
module.exports.parseYaml = parseYaml

const printFormatFrame = (frame) => {
  return `${frame.commit.revision} (${frame.commit.date}) ${frame.commit.author.name}
    ${frame.commit.subject}
    component: ${frame.component.name}
    version: ${frame.component.version}
    valid: ${frame.valid ? 'VALID' : 'INVALID'}
    action: ${frame.action}
    rationale: ${_.join(frame.rationale, '; ')}
  `
}
module.exports.printFormatFrame = printFormatFrame

const releaseMessage = (frame) => {
  return `k8s-${frame.commit.revision} ${frame.action} `
  + `${frame.component.name}:${frame.component.version} `
  + `(${frame.commit.revision}) [${frame.commit.subject}]`
}
module.exports.releaseMessage = releaseMessage

const releasePath = (componentName) => {
  return `./k8s/releases/${componentName}`
}
module.exports.releasePath = releasePath

const addExecRes = (commit, command, path) => {
  return exec(command)
  .then(result => {
    return _.set(commit, path, _.trim(result))
  })
  .error(err => {
    commit.valid = false
    commit.errors.push(err)

    return commit
  })
}
module.exports.addExecRes = addExecRes

