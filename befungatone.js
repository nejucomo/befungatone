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
      var makeSVGElement = function (name, attrs) {
        var node = document.createElementNS(svgns, name);
        for (var a in attrs) {
          node.setAttribute(a, attrs[a]);
        }
        return node;
      };

      var fields = gameboardnode.getAttribute('viewBox').split(' ');
      var gbheight = fields.pop();
      var gbwidth = fields.pop();
      var cellwidth = gbwidth / config.cols;
      var cellheight = gbheight / config.rows;
      var innerwidth = cellwidth - 2 * INTERCELL_PADDING;
      var innerheight = cellheight - 2 * INTERCELL_PADDING;
      var ipradius = innerwidth * 0.4;

      for (var r = 0; r < config.rows; r++) {
        for (var c = 0; c < config.cols; c++) {
          var left = c * cellwidth;
          var top = r * cellheight;

          gameboardnode.appendChild(
            makeSVGElement(
              'rect',
              {
                id: 'cell_c' + c + 'r' + r,
                x: left + INTERCELL_PADDING,
                y: top + INTERCELL_PADDING,
                width: innerwidth,
                height: innerheight,
                class: 'cell-normal',
              }));

          gameboardnode.appendChild(
            makeSVGElement(
              'circle',
              {
                id: 'ip_c' + c + 'r' + r,
                cx: left + cellwidth / 2,
                cy: top + cellheight / 2,
                r: ipradius,
                class: 'instruction-pointer-invisible',
              }));
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

      update(get_node());

      return {
        get_col: function () { return col; },
        get_row: function () { return row; },
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

    var ipcursor = Cursor(
      0, 0, 'ip',
      function (n) { n.setAttribute('class', 'instruction-pointer-active'); },
      function (n) { n.setAttribute('class', 'instruction-pointer-invisible'); });

    call(function () { // Initialize event handlers:
      // keycodes:
      window.addEventListener(
        'keydown',
        function (ev) {
          switch (ev.keyCode) {
          case 13: ipcursor.move_to(kbcursor.get_col(), kbcursor.get_row()); break;
          case 37: kbcursor.move_left(); break;
          case 38: kbcursor.move_up(); break;
          case 39: kbcursor.move_right(); break;
          case 40: kbcursor.move_down(); break;
          default:
            console.log('Unhandled keycode: ' + ev.keyCode);
            return; // Don't fall through to block default behavior.
          };

          ev.preventDefault();
          ev.stopPropagation();
        },
        false);
    });
  });
