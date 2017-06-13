'use strict';

const
  _     = require("lodash"),
  file  = require('../shared/file'),
  utils = require('../shared/utils')

module.exports = class Deployment {
  constructor(revision, timestamp, component) {
    this.component = component
    this.revision = revision
    this.timestamp = timestamp
    this.errors = []
    this.rationale = []
    this.valid = true
    this.template = _.get(this, 'component.kubernetes.deployment', Deployment.template())
  }

  writeRelease() {
    return utils.writeRelease(utils.releasePath(this.component.name), this.release)
  }

  versionName() {
    return `${this.component.name}-${this.component.version}-${this.revision}`
  }

  addEnvironmentVars(vars) {
    const env = []

    _.set(this.release, 'spec.template.spec.containers[0].env', [])
    _.forEach(vars, (variable) => {
      this.release.spec.template.spec.containers[0].env.push({
        name: variable,
        valueFrom: {
          configMapKeyRef: {
            name: this.versionName(),
            key: variable,
          }
        }
      })
    })
  }

  isValid() {
    if (this.valid) return true

    return false
  }

  ports() {
    return _.map(_.get(this.component, 'ports', []), domain => {
      const out = {
        name: domain.name || 'defaultport',
        containerPort: domain.port
      }

      return out
    })
  }

  instances() {
    return _.get(this.component, 'instances', 1)
  }

  args() {
    return _.get(this.component, 'args', undefined)
  }

  buildRelease(vars) {
    if (! this.isValid()) return null

    this.release = _.cloneDeep(this.template)

    _.forEach([
      ['apiVersion'                              , 'extensions/v1beta1']   ,
      ['metadata.name'                           , this.component.name]    ,
      ['spec.selector.matchLabels.component'     , this.component.name]    ,
      ['spec.selector.matchLabels.version'       , this.component.version] ,
      ['spec.template.metadata.labels.component' , this.component.name]    ,
      ['spec.template.metadata.labels.version'   , this.component.version] ,
      ['spec.template.metadata.labels.revision'  , this.revision]          ,
      ['spec.template.metadata.labels.timestamp' , this.timestamp]         ,
      ['spec.template.spec.containers[0].name'   , this.component.name]    ,
      ['spec.template.spec.containers[0].image'  , this.component.image]
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

    this.addEnvironmentVars(vars)
  }

  static template(data) {
    return {
      kind: 'Deployment',
      spec: {
        replicas: 1,
        template: {
          spec: {
            imagePullSecrets: [{
              name: 'com.docker.hub.travisciresin',
            }],
            containers: [{
              imagePullPolicy: 'Always',
              ports: []
            }]
          }
        }
      }
    }
  }
}

