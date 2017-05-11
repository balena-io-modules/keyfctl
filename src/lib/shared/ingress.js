'use strict';

const
  _     = require("lodash"),
  file  = require('../shared/file'),
  utils = require('../shared/utils')

module.exports = class Ingress {
  constructor(revision, componentName) {
    this.revision      = revision
    this.componentName = componentName
    this.errors        = []
    this.rationale     = []
    this.valid         = true

    this.loadData = this.addThings()
  }

  addThings() {
    return file.readAt(
      utils.templatePath(this.componentName, 'ingress'),
      this.revision,
      utils.parseYaml
    )
    .then(data => {
      this.template = data
    })
    .catch(err => {
      this.valid = false
      this.errors.push(err)
      this.rationale.push('unable to read ingress template')
    })
  }

  buildRelease() {
    this.release = _.cloneDeep(this.template)
  }
}

