import * as $ from '../index.js';


const a = $.TypeVariable ('a');

$.def
  ('I')
  ({})
  ([a, a])
  (x => x)
  ($);
