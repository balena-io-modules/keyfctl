'use strict';

const
  _           = require("lodash"),
  file            = require('../shared/file'),
  utils            = require('../shared/utils')

module.exports = class Deployment {
  constructor(revision, timestamp, component) {
    this.component = component
    this.revision = revision
    this.timestamp = timestamp
    this.errors = []
    this.rationale = []
    this.valid = true

    this.loadData = file.readAt(
      utils.templatePath(this.component.name, 'deployment'),
      this.revision,
      utils.parseYaml
    )
    .then(data => {
      this.template = data
    })
    .catch(err => {
      this.valid = false
      this.errors.push(err)
      this.rationale.push('unable to read deployment template')
    })
  }

  versionName() {
    return `${this.component.name}-${this.revision}`
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

  buildRelease(vars) {
    if (! this.isValid()) return null

    this.release = _.cloneDeep(this.template)
    _.forEach([
      ['apiVersion'                              , 'extensions/v1beta1']   ,
      ['metadata.name'                           , this.component.name]    ,
      ['spec.selector.matchLabels.component'     , this.component.name]    ,
      ['spec.selector.matchLabels.version'       , this.component.version] ,
      ['spec.selector.matchLabels.revision'      , this.revision]          ,
      ['spec.template.metadata.labels.component' , this.component.name]    ,
      ['spec.template.metadata.labels.version'   , this.component.version] ,
      ['spec.template.metadata.labels.revision'  , this.revision]          ,
      ['spec.template.metadata.labels.timestamp' , this.timestamp]         ,
      ['spec.template.spec.containers[0].image'  , this.component.image]
    ], ([key, val]) => {
      _.set(this.release, key, `${val}`)
    })

    this.addEnvironmentVars(vars)
  }
}

