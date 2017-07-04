'use strict';

const
  _     = require("lodash"),
  file  = require('../shared/file'),
  utils = require('../shared/utils')

module.exports = class Deployment {
  constructor(spec) {
    this.spec = spec
    this.template = _.get(this.spec, 'kubernetes.deployment', Deployment.template())
  }

  versionName() {
    return `${this.spec.name}-${this.spec.version}`
  }

  usedVars() {
    return _.get(this.spec, 'variables', [])
  }

  usedSecrets() {
    return _.get(this.spec, 'secrets', [])
  }

  addEnvironmentVars() {
    const env = []

    let envs = _.map(this.usedVars(), (variable) => {
      return {
        name: variable,
        valueFrom: {
          configMapKeyRef: {
            name: this.versionName(),
            key: variable,
          }
        }
      }
    })

    envs = envs.concat(_.map(this.usedSecrets(), (variable) => {
      return {
        name: variable,
        valueFrom: {
          secretKeyRef: {
            name: this.versionName(),
            key: variable,
          }
        }
      }
    }))

    if (envs.length < 1) return

    _.set(this.release, 'spec.template.spec.containers[0].env', envs)
  }

  ports() {
    return _.map(_.get(this.spec, 'ports', []), domain => {
      const out = {
        name: domain.name || 'defaultport',
        containerPort: parseInt(domain.port, 10)
      }

      return out
    })
  }

  instances() {
    return _.get(this.spec, 'instances', 1)
  }

  args() {
    return _.get(this.spec, 'args', undefined)
  }

  buildRelease() {
    this.release = _.cloneDeep(this.template)

    _.forEach([
      ['apiVersion'                              , 'apps/v1beta2']   ,
      ['metadata.name'                           , this.spec.name]    ,
      ['spec.selector.matchLabels.component'     , this.spec.name]    ,
      ['spec.template.metadata.labels.component' , this.spec.name]    ,
      ['spec.template.spec.containers[0].name'   , this.spec.name]    ,
      ['spec.template.spec.containers[0].image'  , this.spec.image]
    ], ([key, val]) => {
      _.set(this.release, key, `${val}`)
    })

    _.forEach([
      ['spec.template.spec.containers[0].ports' , this.ports()]     ,
      ['spec.replicas'                          , this.instances()]
    ], ([key, val]) => {
      _.set(this.release, key, val)
    })

    if (this.args()) {
      _.set(this.release, 'spec.template.spec.containers[0].args', this.args())
    }

    this.addEnvironmentVars()

    return this.release
  }

  static template(data) {
    return {
      kind: 'Deployment',
      apiVersion: null,
      metadata: null,
      spec: {
        replicas: 1,
        selector: null,
        template: {
          metadata: null,
          spec: {
            imagePullSecrets: [{
              name: 'com.docker.hub.travisciresin',
            }],
            containers: [{
              name: null,
              image: null,
              imagePullPolicy: 'Always',
              ports: []
            }]
          }
        }
      }
    }
  }
}

