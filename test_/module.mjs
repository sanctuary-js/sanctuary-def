import * as fs from 'node:fs';

import $ from '../index.js';


const a = $.TypeVariable ('a');

$.create
  ({checkTypes: true, env: $.env})
  ('I')
  ({})
  ([a, a])
  (x => x)
  (fs);
