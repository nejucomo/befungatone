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
      var halfwidth = cellwidth / 2;
      var halfheight = cellwidth / 2;
      var innerwidth = cellwidth - 2 * INTERCELL_PADDING;
      var innerheight = cellheight - 2 * INTERCELL_PADDING;
      var ipradius = innerwidth * 0.4;
      var fontfudgewidth = 8;
      var fontfudgeheight = 8;

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
                cx: left + halfwidth,
                cy: top + halfheight,
                r: ipradius,
                class: 'instruction-pointer-invisible',
              }));

          gameboardnode.appendChild(
             makeSVGElement(
               'text',
               {
                 id: 'text_c' + c + 'r' + r,
                 x: left + halfwidth - fontfudgewidth,
                 y: top + halfheight + fontfudgeheight,
                 class: 'text-node',
               }));
        }
      }
    });

    var get_node = function (layer, col, row) {
      return document.getElementById(
        layer + '_c' + col + 'r' + row);
    };

    var Cursor = function (layer, col, row, update, reset) {
      var get_my_node = function () { return get_node(layer, col, row); };

      var move_to = function (c, r) {
        reset(get_my_node());
        col = c;
        row = r;
        update(get_my_node());
      };

      var move_delta = function (dc, dr) {
        move_to(
          (col + dc + config.cols) % config.cols,
          (row + dr + config.rows) % config.rows);
      };

      update(get_my_node());

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
      'cell', 0, 0,
      function (n) { n.setAttribute('class', 'cell-cursor'); },
      function (n) { n.setAttribute('class', 'cell-normal'); });

    var ipcursor = Cursor(
      'ip', 0, 0,
      function (n) { n.setAttribute('class', 'instruction-pointer-active'); },
      function (n) { n.setAttribute('class', 'instruction-pointer-invisible'); });

    call(function () { // Initialize event handlers:
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

          var node = get_node('text', kbcursor.get_col(), kbcursor.get_row());
          node.textContent = c;
        },
        false);
    });
  });
