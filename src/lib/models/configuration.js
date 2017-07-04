'use strict';

const _             = require("lodash")
const Promise       = require('bluebird')
const readFileAsync = Promise.promisify(require('fs').readFile)
const validate      = require('jsonschema').validate
const utils         = require('../shared/utils')

module.exports = class Configuration {
  static fromFile(path) {
    return readFileAsync(path, 'utf8')
    .then(this.fromYaml)
  }

  static fromYaml(yaml) {
    return new Configuration(utils.parseYaml(yaml))
  }

  constructor(obj) {
    const valid = validate(obj, this.schema())

    if (valid.errors.length > 0) {
      throw new Error(valid.errors)
    }

    if (obj.kind !== 'configuration') {
      throw new Error('keyfctl: Configuration#constructor: Passed object kind is not `configuration`')
    }

    _.merge(this, obj)
  }

  validate() {
  }

  globalVars() {
    return _.get(this.data, 'global', [])
  }

  componentVars(componentName) {
    return _.get(this.data, componentName, [])
  }

  schema() {
    return {
      id: '/Configuration',
      type: 'object',
      properties: {
        kind: { type: 'string', required: true },
        api_version: { type: 'string', required: true },
        data: {
          type: 'object',
          required: true,
          properties: {
            global: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  value: { type: 'string' },
                }
              }
            }
          },
          patternProperties: {
            "[a-z\-]+": {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  value: { type: 'string' },
                }
              }
            }
          }
        }
      }
    }
  }
}

