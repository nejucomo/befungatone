"use strict";

window.addEventListener(
  'load',
  function () {
    var call = function (f) { return f(); };
    var trace = function (x) { console.log(x); return x; }

    var INTERCELL_PADDING = 2;

    var config = {
      rows: 13,
      cols: 13,
      tick: 700,
      fontfudge: {
        width: 9,
        height: 9,
      },
    };

    var gameboardnode = document.getElementById('gameboard');

    var geometry = call(function () {
      var fields = gameboardnode.getAttribute('viewBox').split(' ');
      var gbheight = fields.pop();
      var gbwidth = fields.pop();

      return {
        cellwidth: gbwidth / config.cols,
        cellheight: gbheight / config.rows,
      };
    });

    var SVGElement = call(function () {
      var svgns = 'http://www.w3.org/2000/svg';

      return function (name, attrs) {
        var node = document.createElementNS(svgns, name);
        for (var a in attrs) {
          node.setAttribute(a, attrs[a]);
        }
        return node;
      };
    });

    call(function () { // Initialize the board:
      for (var r = 0; r < config.rows; r++) {
        for (var c = 0; c < config.cols; c++) {
          var left = c * geometry.cellwidth;
          var top = r * geometry.cellheight;

          gameboardnode.appendChild(
            SVGElement(
              'rect',
              {
                id: 'cell_c' + c + 'r' + r,
                x: left + INTERCELL_PADDING,
                y: top + INTERCELL_PADDING,
                width: geometry.cellwidth - 2 * INTERCELL_PADDING,
                height: geometry.cellheight - 2 * INTERCELL_PADDING,
                class: 'cell-normal',
              }));

          gameboardnode.appendChild(
             SVGElement(
               'text',
               {
                 id: 'text_c' + c + 'r' + r,
                 x: left + geometry.cellwidth / 2 - config.fontfudge.width,
                 y: top + geometry.cellheight / 2 + config.fontfudge.height,
                 class: 'text-node',
               }));
        }
      }
    });

    var select_direction = function (dir, mapping) {
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
            move_delta(select_direction(dir, dirdeltas));
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


    var InstructionPointer = function (col, row, direction) {
      var cw = geometry.cellwidth;
      var ch = geometry.cellheight;

      var hcenter = cw / 2;
      var vcenter = ch / 2;

      var node = SVGElement(
        'path',
        {
          d: ('M ' + hcenter + ' ' + (ch * 0.2)
              + 'L ' + (cw * 0.2) + ' ' + (ch * 0.8)
              + 'L ' + hcenter + ' ' + (ch * 0.7)
              + 'L ' + (cw * 0.8) + ' ' + (ch * 0.8)
              + 'L ' + hcenter + ' ' + (ch * 0.2)
             ),
          class: 'instruction-pointer-inactive',
        });

      gameboardnode.appendChild(node);

      var coords = Coords(col, row);

      coords.set_move_callbacks(
        function () {},
        function () {
          var left = coords.get_col() * geometry.cellwidth;
          var top = coords.get_row() * geometry.cellheight;
          var rotation = select_direction(
            direction,
            {
              'up': 0,
              'right': 90,
              'down': 180,
              'left': 270,
            });

          node.setAttribute(
            'transform',
            ('translate(' + left + ' ' + top + '), '
             + 'rotate(' + rotation + ', ' + hcenter + ' ' + vcenter + ')'));
        });

      // Monkey methods/fields:

      // Graphical methods:
      coords.set_active = function (onoff) {
        node.setAttribute(
          'class',
          'instruction-pointer-' + (onoff ? 'active' : 'inactive'));
      };

      // Logical methods:
      coords.stringmode = false;

      coords.set_direction = function (d) {
        direction = select_direction(d);
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

    /* Event handler initialization */
    call(function () {
      window.addEventListener(
        'keydown',
        function (ev) {

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
        false);

      window.addEventListener(
        'keypress',
        function (ev) {
          var c = String.fromCharCode(ev.keyCode);
          if (c === ' ') {
            c = '';
          };

          kbcursor.get_node('text').textContent = c;
        },
        false);
    });
  });
