"use strict";

window.addEventListener(
  'load',
  function () {
    /* Fundamental utilities */
    var call = function (f) { return f(); };
    var trace = function (x) { console.log(x); return x; }
    var assert = function (cond, detail___) {
      if (! cond) {
        var details = Array.prototype.slice.call(arguments, 1);
        console.log('Assertion Failure', details);
        throw new Error('Assertion Failure', details);
      }
    };

    /* General utilities */
    var random_choice = call(function () {
      var pool = new Uint32Array(1024);
      var wordsleft = 0;
      var get_next_word = function  () {
        if (wordsleft === 0) {
          console.log('Entropy pool empty; requesting ' + pool.length + ' more words.');
          window.crypto.getRandomValues(pool);
          wordsleft = pool.length;
        }
        wordsleft -= 1;
        return pool[wordsleft];
      };

      return function (options___) {
        return arguments[get_next_word() % arguments.length];
      };
    });

    /* General dom utilities */
    var SVGElement = call(function () {
      var svgns = 'http://www.w3.org/2000/svg';

      return function (name, attrs, children) {
        var node = document.createElementNS(svgns, name);

        for (var a in attrs) {
          var aval = attrs[a];
          if (typeof aval === 'object') {
            node.setAttributeNS(aval.namespace, a, aval.value);
          } else {
            node.setAttribute(a, aval);
          }
        }

        children = (children === undefined) ? [] : children;

        children.forEach(function (c) {
          node.appendChild(c);
        });

        return node;
      };
    });

    var AnimationContext = call(function () {
      var callbacks = [];
      var rafId = null;

      var animate = function (animatetime) {
        assert(callbacks.length <= 1, 'Temporary animate callback limit breached', callbacks);
        callbacks.forEach(function (cb) {
          cb(animatetime);
        });
        poke_render_loop();
      };

      var poke_render_loop = function () {
        if (callbacks.length === 0) {
          rafId = null;
        } else {
          rafId = window.requestAnimationFrame(animate);
        }
      };

      // AnimationContext constructor:
      return function (rendercb, attrs, moduli) {
        var rendervars = {};
        var start = null;
        var delta = null;

        for (var n in attrs) {
          var v = attrs[n];
          rendervars[n] = {
            start: v,
            current: v,
            target: v,
          };
        }

        var cb = function (time) {
          if (start === null) {
            start = time;
          }

          assert(typeof delta === 'number', 'non-number delta', delta);
          assert(typeof start === 'number', 'non-number start', start);
          assert(delta !== 0, '0 delta');

          var frac = Math.min(1, (time - start) / delta);
          var values = {};

          for (var n in rendervars) {
            var rv = rendervars[n];
            rv.current = rv.start + frac * (rv.target - rv.start);
            values[n] = rv.current;
          }

          rendercb(values);

          if (frac >= 1) {
            /* enforce moduli */
            for (var n in rendervars) {
              var rv = rendervars[n];
              var modulus = moduli[n];
              rv.target = rv.target % modulus;
              if (rv.target < 0) {
                rv.target += modulus;
              }
              rv.current = rv.target;
            }

            callbacks = callbacks.filter(
              function (other) {
                return other !== cb;
              })
          }
        };

        var add_callback_idempotent = function () {
          var ismem = false;
          callbacks.forEach(function (f) { ismem = ismem || f === cb });
          if (! ismem) {
            callbacks.push(cb);
            poke_render_loop();
          }
        };

        // AnimationContext update:
        return function (newdelta, targets) {
          start = null;
          delta = newdelta;

          for (var n in rendervars) {
            var rv = rendervars[n];
            rv.start = rv.current;
            rv.target = targets[n];

            var modulus = moduli[n];
            var halfmod = modulus / 2;
            var d = rv.target - rv.start;
            if (d >= halfmod) {
              rv.target -= modulus;
            } else if (d < - halfmod) {
              rv.target += modulus;
            }
          }

          add_callback_idempotent();
        };
      };
    });


    /* Board state and interaction */
    var load_state = call(function () {
      var eventhandlers = null;

      return function (config) {

        var svg = { // Static SVG dom nodes:
          gameboard: document.getElementById('gameboard'),
          layer: {
            background: document.getElementById('background-layer'),
            ips: document.getElementById('instruction-pointer-layer'),
            text: document.getElementById('text-layer'),
          },
        };

        var geometry = call(function () {
          var maxdim = Math.max(config.rows, config.cols);
          var aspect = config.cols / config.rows;

          var client = {
            width: svg.gameboard.clientWidth,
            height: svg.gameboard.clientHeight,
          };

          var adjusted = call(function () {
            var vwidth = client.height * aspect;
            if (vwidth < client.width) {
              var delta = client.width - vwidth;
              return {
                virtual: {
                  width: vwidth,
                  height: client.height,
                },
                view: {
                  left: -(delta / 2),
                  top: 0,
                },
              };
            } else {
              var vheight = client.width / aspect;
              var delta = client.height - vheight;
              return {
                virtual: {
                  width: client.width,
                  height: client.width / aspect,
                },
                view: {
                  left: 0,
                  top: -(delta / 2),
                },
              };
            }
          });

          var cellsize = adjusted.virtual.width / config.cols;
          var cheight = adjusted.virtual.height / config.rows;
          assert( Math.abs(cellsize - cheight) < 0.00001, {cellsize: cellsize, cheight: cheight});

          svg.gameboard.setAttribute(
            'viewBox',
            [adjusted.view.left, adjusted.view.top, client.width, client.height].join(' '));

          return {
            client: client,
            cellsize: cellsize,
          };
        });

        call(function () { // Initialize the board:
          var intercell_padding = geometry.cellsize / 40;
          var rectsize = geometry.cellsize - 2 * intercell_padding;

          for (var r = 0; r < config.rows; r++) {
            for (var c = 0; c < config.cols; c++) {
              var left = c * geometry.cellsize;
              var top = r * geometry.cellsize;

              svg.layer.background.appendChild(
                SVGElement(
                  'rect',
                  {
                    id: 'cell_c' + c + 'r' + r,
                    x: left + intercell_padding,
                    y: top + intercell_padding,
                    width: rectsize,
                    height: rectsize,
                    class: 'cell-normal',
                  }));

              var fontfudge = { // FIXME: handle this better/dynamically.
                width: 9,
                height: 9,
              };

              svg.layer.text.appendChild(
                SVGElement(
                  'text',
                  {
                    id: 'text_c' + c + 'r' + r,
                    x: left + geometry.cellsize / 2 - fontfudge.width,
                    y: top + geometry.cellsize / 2 + fontfudge.height,
                    class: 'text-node',
                  }));
            }
          }
        });

        var Coords = call(function () {

          var dirdeltas;

          var constructor = function (col, row) {
            var premove = function () {};
            var postmove = function () {};

            var move_to = function (c, r) {
              premove();
              col = (c + config.cols) % config.cols;
              row = (r + config.rows) % config.rows;
              postmove();
            };

            var move_delta = function (delta) {
              move_to(col + delta.get_col(), row + delta.get_row());
            };

            var get_node = function (layer) {
              return document.getElementById(
                layer + '_c' + col + 'r' + row);
            };

            return {
              get_col: function () { return col; },
              get_row: function () { return row; },
              move_to: function (other) {
                move_to(other.get_col(), other.get_row());
              },
              move_direction: function (dir) {
                move_delta(Coords.select_direction(dir, dirdeltas));
              },
              update: function () { premove(); postmove(); },
              set_move_callbacks: function (pre, post) {
                premove = pre;
                postmove = post;
                postmove();
              },
              get_node: get_node,
              get_data: function () { return get_node('text').textContent },
              set_data: function (c) { get_node('text').textContent = c },
            };
          };

          dirdeltas = {
            up   : constructor( 0, -1),
            right: constructor( 1,  0),
            down : constructor( 0,  1),
            left : constructor(-1,  0),
          };

          return constructor;
        });

        Coords.select_direction = function (dir, mapping) {
          if (mapping === undefined) {
            // Identity transform; simply verifies dir is valid:
            mapping = { up: 'up', right: 'right', down: 'down', left: 'left' };
          };
          var x = mapping[dir];
          if (x === undefined) {
            throw Error('Invalid direction: ' + dir);
          }
          return x;
        };

        var InstructionPointer = call(function () {
          var serialctr = 0;

          return function (col, row, direction) {
            var cs = geometry.cellsize;
            var center = cs / 2;


            var domnodes = call(function () {
              var protoid = 'ip-' + serialctr;
              var protoidref = '#' + protoid;
              serialctr += 1;

              var hrefattr = {
                namespace: 'http://www.w3.org/1999/xlink',
                value: protoidref,
              };

              // The actual arrow icon shared by avatar and shadows:
              var path = SVGElement(
                'path',
                {
                  id: protoid,
                  d: ('M ' + center + ' ' + (cs * 0.2)
                      + 'L ' + (cs * 0.2) + ' ' + (cs * 0.8)
                      + 'L ' + center + ' ' + (cs * 0.7)
                      + 'L ' + (cs * 0.8) + ' ' + (cs * 0.8)
                      + 'L ' + center + ' ' + (cs * 0.2)
                     ),
                  class: 'instruction-pointer-inactive',
                });

              var g = SVGElement(
                'g', {},
                [
                  SVGElement('defs', {}, [path]),

                  /* The "avatar" is the arrow which is typically visible, except
                   * during wrap-around border crossings where we perform some
                   * sleight-of-renderer.  During this time a "shadow" appears
                   * on the opposite edge of the exiting avatar, and after the
                   * animation completes, the avatar instantly teleports to the
                   * previous shadow's location.  The offsets between the avatar
                   * and the four directional shadows is constant as the view
                   * width/height.
                   */
                  SVGElement(
                    'use',
                    {href: hrefattr,
                     x: 0,
                     y: 0,
                    }),

                  /* shadows */
                  SVGElement(
                    'use',
                    {href: hrefattr,
                     x: 0,
                     y: - geometry.client.height,
                    }),
                  SVGElement(
                    'use',
                    {href: hrefattr,
                     x: geometry.client.width,
                     y: 0,
                    }),
                  SVGElement(
                    'use',
                    {href: hrefattr,
                     x: 0,
                     y: geometry.client.height,
                    }),
                  SVGElement(
                    'use',
                    {href: hrefattr,
                     x: - geometry.client.width,
                     y: 0,
                    }),
                ]);

              return {
                g: g,
                path: path,
              };
            });

          svg.layer.ips.appendChild(domnodes.g);

            var coords = Coords(col, row);

            var get_anim_vals = function () {
              return {
                left: coords.get_col() * geometry.cellsize,
                top: coords.get_row() * geometry.cellsize,
                rotation: Coords.select_direction(
                  direction,
                  {
                    'up': 0,
                    'right': 90,
                    'down': 180,
                    'left': 270,
                  }),
              };
            };

            var animcb = function (animvals) {
              domnodes.g.setAttribute(
                'transform',
                'translate(' + animvals.left + ' ' + animvals.top + ')');

              domnodes.path.setAttribute(
                'transform',
                'rotate(' + animvals.rotation + ' ' + center + ' ' + center + ')');
            };

            var animctx = AnimationContext(
              animcb,
              get_anim_vals(),
              {
                left: geometry.client.width,
                top: geometry.client.height,
                rotation: 360,
              });

            coords.set_move_callbacks(
              function () {},
              function () {
                animctx(config.tick * config.animationloadfactor, get_anim_vals());
              });

            // Monkey methods/fields:

            // Graphical methods:
            coords.set_active = function (onoff) {
              domnodes.path.setAttribute(
                'class',
                'instruction-pointer-' + (onoff ? 'active' : 'inactive'));
            };

            // Logical methods:
            coords.stringmode = false;

            coords.set_direction = function (d) {
              direction = Coords.select_direction(d);
              // This updates the displayed direction:
              coords.update();
            };

            var step_forward = function () { coords.move_direction(direction) };
            coords.step_forward = step_forward;

            coords.execute_then_step = function () {
              execute_instruction(coords, coords.get_data());
              step_forward();
            };

            var stack = [];

            coords.stack_push = function (x) {
              console.log('stack_push(' + x + ') onto ' + stack);
              stack.push(x);
            };

            coords.stack_pop = function () {
              var x = stack.pop()
              console.log('stack_pop() -> ' + x + ' from ' + stack);
              return stack;
            };

            return coords;
          };
        });

        var kbcursor = call(function () {
          var coords = Coords(0, 0);

          coords.set_move_callbacks(
            function () {
              coords.get_node('cell').setAttribute('class', 'cell-normal');
            },
            function () {
              coords.get_node('cell').setAttribute('class', 'cell-cursor');
            });

          return coords;
        });

        var ip = InstructionPointer(0, 0, 'right');

        var clock = call(function () {
          var tick = function () {
            ip.execute_then_step();
          };

          var toggle_from_stopped = function () {
            console.log('Starting clock.');
            ip.set_active(true);
            tick();
            var interval = window.setInterval(tick, config.tick);

            return function () {
              console.log('Stopping clock.');
              window.clearInterval(interval);
              ip.set_active(false);
              return toggle_from_stopped;
            };

          };

          var toggler = toggle_from_stopped;

          return {
            tick: tick,
            toggle: function () { toggler = toggler() },
          };
        });

        var execute_instruction = function (ip, instruction) {

          var _execute_instruction = function () {
            if (ip.stringmode) {
              ip.stack_push(instruction.charCodeAt(0));

            } else if (instruction.match(/[0-9]/)) {
              ip.stack_push(parseInt(instruction));

            } else {
              var dir = {'^': 'up', '>': 'right', 'v': 'down', '<': 'left'}[instruction];

              if (dir !== undefined) {
                ip.set_direction(dir);
              } else {
                var op = instructions[instruction];
                if (op !== undefined) {
                  op(ip);
                }
              }
            }
          };

          var unop = function (f) {
            ip.stack_push(f(ip.stack_pop()));
          };

          var binop = function (f) {
            var a = ip.stack_pop();
            var b = ip.stack_pop();
            ip.stack_push(f(a, b));
          };

          var instructions = {
            '"': function () { ip.stringmode = ! ip.stringmode },
            '?': function () { ip.set_direction(random_choice('up', 'right', 'down', 'left')) },
            '+': function () { binop(ip, function (a, b) { return b + a }) },
            '*': function () { binop(ip, function (a, b) { return b * a }) },
            '-': function () { binop(ip, function (a, b) { return b - a }) },
            '/': function () { binop(ip, function (a, b) { return b / a }) },
            '%': function () { binop(ip, function (a, b) { return b % a }) },
            '`': function () { binop(ip, function (a, b) { if (b > a) { return 1 } else { return 0 } }) },
            '!': function () { unop(ip, function (x) { return !x }) },
            '_': function () {
              if (ip.stack_pop() === 0) {
                ip.set_direction('right');
              } else {
                ip.set_direction('left');
              }
            },
            '|': function () {
              if (ip.stack_pop() === 0) {
                ip.set_direction('down');
              } else {
                ip.set_direction('up');
              }
            },
            ':': function () {
              var x = ip.stack_pop();
              ip.stack_push(x);
              ip.stack_push(x);
            },
            '\\': function () {
              var a = ip.stack_pop();
              var b = ip.stack_pop();
              ip.stack_push(a);
              ip.stack_push(b);
            },
            '$': function () { ip.stack_pop() },
            '#': function () { ip.step_forward() },
            'p': function () {
              var y = ip.stack_pop();
              var x = ip.stack_pop();
              var v = ip.stack_pop();
              Coords(x, y).set_data(String.fromCharCode(v));
            },
            'g': function () {
              var y = ip.stack_pop();
              var x = ip.stack_pop();
              ip.stack_push(Coords(x, y).get_data().charCodeAt(0));
            },
            '@': function () { ip.die() },

            '.': function () { console.log('unimplemented opcode .') },
            ',': function () { console.log('unimplemented opcode ,') },
            '&': function () { console.log('unimplemented opcode &') },
            '~': function () { console.log('unimplemented opcode ~') },
          };

          _execute_instruction();
        };

        /* Event handler (re)initialization */
        call(function () {
          if (eventhandlers !== null) {
            for (var name in eventhandlers) {
              window.removeEventListener(name, eventhandlers[name]);
            }
          }

          eventhandlers = {
            keydown: function (ev) {
              var handle_arrow_key = function (dir) {
                if (ev.shiftKey) {
                  ip.move_to(kbcursor);
                  ip.set_direction(dir);
                } else {
                  kbcursor.move_direction(dir);
                }
              };

              switch (ev.keyCode) {
              case 13: clock.toggle(); break;
              case 37: handle_arrow_key('left' ); break;
              case 38: handle_arrow_key('up'   ); break;
              case 39: handle_arrow_key('right'); break;
              case 40: handle_arrow_key('down' ); break;
              default:
                return; // Don't fall through to block default behavior.
              };

              ev.preventDefault();
              ev.stopPropagation();
            },

            keypress: function (ev) {
              var c = String.fromCharCode(ev.keyCode);
              if (c === ' ') {
                c = '';
              };

              kbcursor.get_node('text').textContent = c;
            },
          };

          for (var name in eventhandlers) {
            window.addEventListener(name, eventhandlers[name]);
          };
        });
      };
    });

    var handle_hashchanged = call(function () {
      var ParseError = function (msg) { this.msg = msg };

      var numparse = function (p, minval, maxval) {
        minval = minval === undefined ? null : minval;
        maxval = maxval === undefined ? null : maxval;

        return function (arg) {
          var v = p(arg);
          if (isNaN(v)) {
            throw new ParseError('Not a number: ' + arg);
          } else if (minval !== null && v < minval) {
            throw new ParseError('Must be greater than ' + minval + ': ' + v);
          } else if (maxval !== null && v > maxval) {
            throw new ParseError('Must be less than ' + maxal + ': ' + v);
          } else {
            return v;
          }
        }
      };

      var schema = {
        r: {name: 'rows', parse: numparse(parseInt, 3)},
        c: {name: 'cols', parse: numparse(parseInt, 3)},
        t: {name: 'tick', parse: numparse(parseFloat, 20)},
        A: {name: 'animationloadfactor', parse: numparse(parseFloat, 0, 1)},
      };

      return function (ev) {
        console.log('handle_hashchanged', ev);
        var hash = window.location.hash;
        if (hash === '') {
          console.log('hash is empty... using default');
          window.location.hash = '#r=13&c=13&t=700&A=.6';
          window.location.reload(false);
        } else {
          console.log('Loading state from hash ' + hash);
          assert(hash[0] === '#', 'Malformed hash: ' + hash);
          var config = {}
          try {
            hash.slice(1).split('&').forEach(
              function (field) {
                var kv = field.split('=');
                assert(kv.length === 2, 'Malformed field: ' + field);
                var paramkey = kv[0];
                var schemus = schema[paramkey];
                if (schemus === undefined) {
                  throw new ParseError('Unexpected parameters: ' + field);
                }
                var key = schemus.name;
                var value = schemus.parse(kv[1]);
                console.log('Parsed config: ' + key + ' = ' + value);
                config[key] = value;
              });

          } catch (e) {
            if (e instanceof ParseError) {
              console.log('ParseError: ' + e.msg);
              return;
            } else {
              throw e
            }
          }

          load_state(config);
        }
      };
    });

    window.addEventListener('hashchanged', handle_hashchanged, false);

    handle_hashchanged();
  });
