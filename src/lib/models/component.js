'use strict';

const _ = require('lodash')

module.exports = class Component {
  constructor(name, data) {
    this.name = name
    _.merge(this, data)
  }

  getPorts() {
    if (_.get(this, 'ports', []).length < 1) {
      return []
    }

    // check to ensure ports have names if there are more than one
    if (this.ports.length > 1) {
      for (const port of this.ports) {
        if (! port.name) {
          throw new Error('Ports must be named with using more than one!')
        }
      }
    }

    this.ports[0].name = this.ports[0].name || 'defaultport'

    return this.ports
  }
}

