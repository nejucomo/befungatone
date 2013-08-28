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
      tick: 2000,
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

        return {
          get_col: function () { return col; },
          get_row: function () { return row; },
          move_to: function (other) {
            move_to(other.get_col(), other.get_row());
          },
          move_direction: function (dir) {
            move_delta(select_direction(dir, dirdeltas));
          },
          set_move_callbacks: function (pre, post) {
            premove = pre;
            postmove = post;
            postmove();
          },
          get_node: function (layer) {
            return document.getElementById(
              layer + '_c' + col + 'r' + row);
          },
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
      var cw = geometry.cellwidth / 2;
      var ch = geometry.cellheight / 2;

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
          class: 'instruction-pointer-active',
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
             + 'rotate(' + rotation + ', ' + cw + ' ' + ch + ')'));
        });

      // Monkey patches:
      coords.set_direction = function (d) {
        direction = select_direction(d);
      };

      coords.move_forward = function () {
        coords.move_direction(direction);
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
      var intid = null;

      var tick = function () {
        ip.move_forward();
      };

      return {
        toggle: function () {
          if (intid === null) {
            window.setInterval(tick, config.tick);
          } else {
            window.clearInterval(intid);
            intid = null;
          }
        },
      };
    });

    call(function () { // Initialize event handlers:
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
