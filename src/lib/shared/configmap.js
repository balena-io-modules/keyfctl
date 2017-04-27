'use strict';

const
  _     = require("lodash"),
  file  = require('../shared/file'),
  utils = require('../shared/utils')

module.exports = class Configmap {
  constructor(revision, componentName) {
    this.revision  = revision
    this.errors    = []
    this.rationale = []
    this.valid     = true

    this.loadData = file.readAt(
      utils.templatePath(componentName, 'configmap'),
      this.revision,
      utils.parseYaml
    )
    .then(data => {
      this.template = data
      return this
    })
    .catch(err => {
      this.valid = false
      this.errors.push(err)
      this.rationale.push('unable to read configmap template')
    })
  }

  buildRelease(data) {
    this.release = _.cloneDeep(this.template)

    _.forEach([
      ['metadata.name', data.component.name + '-' + this.revision],
    ], ([key, val]) => {
      _.set(this.release, key, `${val}`)
    })

    for (let n of data.vars) {
      _.set(this.release, `data.${n.name}`, `${n.value}`)
    }
  }
}

