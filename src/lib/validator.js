'use strict';

const _             = require("lodash")
const Promise       = require('bluebird')
const readFileAsync = Promise.promisify(require('fs').readFile)
const Keyframe      = require('./models/keyframe')
const Configuration = require('./models/configuration')
const Secrets       = require('./models/secrets')
const utils         = require('./shared/utils')

module.exports = class Validator {
  static validate(path) {
    return readFileAsync(path, 'utf8')
    .then(str => {
      const obj = utils.parseYaml(str)
      switch (obj.kind) {
        case 'keyframe':
          return new Keyframe(obj)
        case 'configuration':
          return new Configuration(obj)
        case 'secrets':
          return new Secrets(obj)
        default:
          throw new Error('keyfctl: Validator#validate: File could not be identified! Make sure there is a `kind` field at the root of the YAML document')
      }
    })
    .then(obj => {
      return obj.validate()
    })
  }
}

