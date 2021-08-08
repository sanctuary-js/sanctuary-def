import * as fs from 'fs';

import $ from '../index.js';


const a = $.TypeVariable ('a');

$.create
  ({checkTypes: true, env: $.env})
  ('I')
  ({})
  ([a, a])
  (x => x)
  (fs);
