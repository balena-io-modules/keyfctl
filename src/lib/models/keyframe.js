'use strict';

const _              = require("lodash")
const Promise        = require('bluebird')
const validateSchema = require('jsonschema').validate
const readFileAsync  = Promise.promisify(require('fs').readFile)

const utils     = require('../shared/utils')

module.exports = class Keyframe {
  static fromFiles(paths) {
    return Promise.map(paths, path => {
      return readFileAsync(path, 'utf8').then(utils.parseYaml)
    })
    .then((kLayers) => {

      // create and validate core keyframe.
      let kf = new Keyframe(kLayers[0], true)

      // merge all layers(core keyframe + customizations on top)
      for (let l of kLayers.slice(1)){
        kf.mergeLayer(l)
      }

      // validate
      let valid = kf.validateKeyframeData()
      if (valid.errors.length > 0) {
        for (let err of valid.errors){
          console.error( 'Error: KeyframeLayer.data.components'+ err.stack.slice(8))
        }
        process.exit(1)
      }
      return kf
    })
  }

  constructor(obj, options = {}) {
    const valid = this.validateCoreKeyframe(obj)

    if (obj.api_version !== 'v2.0.0') {
      throw new Error('This version of keyfctl only supports keyframe api version v2.0.0')
    }

    this.adapters = _.get(options, 'adapters', {})

    if (valid.errors.length > 0) {
      for (let err of valid.errors){
        console.error('Error: keyframe' + err.stack.slice(8))
      }
      process.exit(1)
    }

    _.merge(this, obj.data)
  }

  mergeLayer(layer){
    _.merge(this, layer.data)
  }

  globalVars() {
    return _.get(this, 'variables', [])
  }

  componentVars(componentName) {
    return _.get(this.services, [componentName, 'variables'], [])
  }

  services() {
    if (_.has(this, 'services')) return this.services
    if (_.has(this, 'components')) return _.get(this, 'components')

    return {}
  }

  addDeployAdapter(name, adapter) {
    this.adapters[name] = adapter
  }

  deploy(plans) {
    return Promise.map(plans, plan => {
      return this.adapters[plan.target].deploy(plan)
    })
  }

  plan(config, secrets) {
    return _.map(this.services(), (spec, name) => {
      return this.adapters[spec.target].plan({
        name,
        spec,
        config,
        secrets
      })
    })
  }

  checkAdapters() {
    const errors = []
    const availableAdapters = _.keys(this.adapters)

    _.forEach(this.services(), (val, key) => {
      if (_.includes(availableAdapters, val.target)) {
        return
      }

      errors.push(`Service ${key} uses unavailabe adapter '${val.target}'`)
    })

    return errors
  }

  checkConfiguration(config) {
    const errors = []

    _.forEach(this.services(), (spec, name) => {
      const availVars = _.map(config.componentVars(name), 'name')
      const missingVars = _.difference(_.get(spec, 'variables', []), availVars)
      if (missingVars.length > 0) {
        errors.push(`missing configuration variable(s) for component ${name}: ${missingVars.join(', ')}`)
      }
    })

    return [errors.length === 0, errors]
  }

  checkSecrets(secrets) {
    const errors = []

    _.forEach(this.services(), (spec, name) => {
      const availVars = _.map(secrets.componentVars(name), 'name')
      const missingVars = _.difference(_.get(spec, 'secrets', []), availVars)
      if (missingVars.length > 0) {
        errors.push(`missing secrets variable(s) for component ${name}: ${missingVars.join(', ')}`)
      }
    })

    return [errors.length === 0, errors]
  }

  validateCoreKeyframe(obj) {
    return validateSchema(obj, this.coreSchema())
  }

  validateKeyframeData(){
    return validateSchema(this.components, this.schema().properties.data.properties.components)
  }

  schema(){
    // Full keyframe schema, including any customization or extension
    return _.merge(this.coreSchema(), {})
  }

  coreSchema() {
    // Core keyframe schema
    return {
      id: '/Keyframe',
      type: 'object',
      properties: {
        kind: { type: 'string', required: true },
        api_version: { type: 'string', required: true },
        metadata: {
          type: 'object',
          required: true,
          properties: {
            name: { type: 'string', required: true },
            source: {
              type: 'object',
              required: true,
              properties: {
                repository: { type: 'string', required: true },
                commit: { type: 'string', required: true }
              }
            }
          }
        },
        data: {
          type: 'object',
          required: true,
          additionalProperties: false,
          properties: {
            components: {
              type: 'object',
              additionalProperties: false,
              patternProperties: {
                "[a-z\-]+": {
                  type: 'object',
                  required: true,
                  additionalProperties: false,
                  properties: {
                    version: { type: 'string', required: true },
                    image: { type: 'string', required: true },
                    target: { type: 'string' },
                    instances: { type: 'integer' },
                    args: { type: 'array' },
                    variables: {
                      type: 'array',
                      minItems: 1,
                      items: { type: 'string' }
                    },
                    secrets: {
                      type: 'array',
                      minItems: 1,
                      items: { type: 'string' }
                    },
                    hostNetwork: { type: 'boolean' },
                    ports: {
                      type: 'array',
                      minItems: 1,
                      items: {
                        type: 'object',
                        properties: {
                          path: { type: 'string', required: true },
                          port: { type: 'string', required: true },
                          hostPort: { type: 'string' },
                          domain: { type: 'string' },
                          name: { type: 'string' },
                          protocol: { type: 'string' }
                        }
                      }
                    },
                    volumes: {
                      type: 'array',
                      minItems: 1,
                      items: {
                        type: 'object',
                        properties: {
                          type: { type: 'string' },
                          source: { type: 'string', required: true },
                          name: { type: 'string', required: true },
                          destination: { type: 'string', required: true }
                        }
                      }
                    },
                    capabilities: {
                      type: 'object',
                      properties: {
                        add: {
                          type: 'array',
                          minItems: 0,
                          items: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

