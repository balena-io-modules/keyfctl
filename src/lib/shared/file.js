'use strict';

const
  Promise = require('bluebird'),
  _       = require("lodash"),
  exec    = Promise.promisify(require("child_process").exec)

