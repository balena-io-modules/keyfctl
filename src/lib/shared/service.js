'use strict';

const
  _     = require("lodash"),
  file  = require('../shared/file'),
  utils = require('../shared/utils')

module.exports = class Service {
  constructor(revision, component) {
    this.component = component
    this.revision  = revision
    this.errors    = []
    this.rationale = []
    this.valid     = true

    this.loadData = file.readAt(
      utils.templatePath(component.name, 'service'),
      this.revision,
      utils.parseYaml
    )
    .then(data => {
      this.template = data
    })
    .catch(err => {
      this.valid = false
      this.errors.push(err)
      this.rationale.push('unable to read service template')
    })
  }

  buildRelease() {
    this.release = _.cloneDeep(this.template)
    _.forEach([
      ['spec.selector.component' , this.component.name]     ,
      ['spec.selector.version'   , this.component.version]  ,
      ['spec.selector.revision'  , this.revision] ,
    ], ([key, val]) => {
      _.set(this.release, key, `${val}`)
    })
  }
}

