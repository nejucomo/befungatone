"use strict";

window.addEventListener(
  'load',
  function () {
    var INTERCELL_PADDING = 2;

    var config = {
      rows: 13,
      cols: 13,
    };

    var gameboardnode = document.getElementById('gameboard');

    var call = function (f) { return f(); };
    var trace = function (x) { console.log(x); return x; }

    call(function () { // Initialize the board:
      var svgns = 'http://www.w3.org/2000/svg';

      var fields = gameboardnode.getAttribute('viewBox').split(' ');
      var gbheight = fields.pop();
      var gbwidth = fields.pop();
      var cellwidth = gbwidth / config.cols;
      var cellheight = gbheight / config.rows;
      var innerwidth = cellwidth - 2 * INTERCELL_PADDING;
      var innerheight = cellheight - 2 * INTERCELL_PADDING;

      for (var r = 0; r < config.rows; r++) {
        for (var c = 0; c < config.cols; c++) {
          var left = c * cellwidth + INTERCELL_PADDING;
          var top = r * cellheight + INTERCELL_PADDING;

          var rectnode = document.createElementNS(svgns, 'rect');
          rectnode.id = 'cell_c' + c + 'r' + r;
          rectnode.setAttribute('x', left);
          rectnode.setAttribute('y', top);
          rectnode.setAttribute('width', innerwidth);
          rectnode.setAttribute('height', innerheight);
          rectnode.setAttribute('class', 'cell-normal');

          gameboardnode.appendChild(rectnode);
        }
      }
    });

    var Cursor = function (col, row, layer, update, reset) {
      var get_node = function () {
        return document.getElementById(
          layer + '_c' + col + 'r' + row);
      }

      var move_to = function (c, r) {
        reset(get_node());
        col = c;
        row = r;
        update(get_node());
      };

      var move_delta = function (dc, dr) {
        move_to(
          (col + dc + config.cols) % config.cols,
          (row + dr + config.rows) % config.rows);
      };

      return {
        move_to: move_to,
        move_up: function () { move_delta(0, -1) },
        move_down: function () { move_delta(0, 1) },
        move_left: function () { move_delta(-1, 0) },
        move_right: function () { move_delta(1, 0) },
      };
    };

    var kbcursor = Cursor(
      0, 0, 'cell',
      function (n) { n.setAttribute('class', 'cell-cursor'); },
      function (n) { n.setAttribute('class', 'cell-normal'); });

    call(function () { // Initialize event handlers:
      // keycodes:
      window.addEventListener(
        'keydown',
        function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          switch (ev.keyCode) {
          case 37: kbcursor.move_left(); break;
          case 38: kbcursor.move_up(); break;
          case 39: kbcursor.move_right(); break;
          case 40: kbcursor.move_down(); break;
          default:
            console.log('Unhandled keycode: ' + ev.keyCode);
          };
        },
        true);
    });

    call(function () { // Final initialization:
      kbcursor.move_to(0, 0);
    });
  });
