'use strict';

const assert = require('assert').strict;
const fs = require('fs');

const suggestSchedule = require(('../suggestSchedule')); // path relative to current file
const data = JSON.parse(fs.readFileSync('./data/input.json').toString()); // path relative to node working directory

console.log(suggestSchedule(data));


