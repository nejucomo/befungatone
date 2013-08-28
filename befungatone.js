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
      var fontfudgewidth = 9;
      var fontfudgeheight = 9;

      for (var r = 0; r < config.rows; r++) {
        for (var c = 0; c < config.cols; c++) {
          var left = c * cellwidth;
          var top = r * cellheight;
          var hcenter = left + cellwidth / 2;
          var vcenter = top + cellheight / 2;

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
              'path',
              {
                id: 'ip_c' + c + 'r' + r,
                d: ('M ' + hcenter + ' ' + (top + cellheight * 0.2)
                    + 'L ' + (left + cellwidth * 0.2) + ' ' + (top + cellheight * 0.8)
                    + 'L ' + hcenter + ' ' + (top + cellheight * 0.7)
                    + 'L ' + (left + cellwidth * 0.8) + ' ' + (top + cellheight * 0.8)
                    + 'L ' + hcenter + ' ' + (top + cellheight * 0.2)
                   ),
                bft_cx: hcenter,
                bft_cy: vcenter,
                class: 'instruction-pointer-invisible',
              }));

          gameboardnode.appendChild(
             makeSVGElement(
               'text',
               {
                 id: 'text_c' + c + 'r' + r,
                 x: hcenter - fontfudgewidth,
                 y: vcenter + fontfudgeheight,
                 class: 'text-node',
               }));
        }
      }
    });

    var get_node = function (layer, col, row) {
      return document.getElementById(
        layer + '_c' + col + 'r' + row);
    };

    var Cursor = function (layer, col, row, update, reset, attrs) {
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
        get_node: get_my_node,
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

    call(function () { // Monkeypatch ipcursor:
      ipcursor.move_to_kbcursor = function () {
        ipcursor.move_to(kbcursor.get_col(), kbcursor.get_row());
      };

      ipcursor.point = function (dir) {
        var node = ipcursor.get_node();
        var set_rotation = function (degrees) {
          var cx = node.getAttribute('bft_cx');
          var cy = node.getAttribute('bft_cy');
          node.setAttribute(
            'transform',
            'rotate(' + degrees + ', ' + cx + ' ' + cy + ')');
        };

        if (dir == 'up') {
          node.removeAttribute('transform');
        } else if (dir == 'right') {
          set_rotation(90);
        } else if (dir == 'down') {
          set_rotation(180);
        } else if (dir == 'left') {
          set_rotation(270);
        } else {
          throw Error('Unknown direction: ' + dir);
        }
      };
    });

    call(function () { // Initialize event handlers:
      window.addEventListener(
        'keydown',
        function (ev) {
          switch (ev.keyCode) {
          case 37: // left
            if (ev.shiftKey) {
              ipcursor.move_to_kbcursor();
              ipcursor.point('left');
            } else {
              kbcursor.move_left();
            }
            break;
          case 38: // up
            if (ev.shiftKey) {
              ipcursor.move_to_kbcursor();
              ipcursor.point('up');
            } else {
              kbcursor.move_up();
            }
            break;
          case 39: // right
            if (ev.shiftKey) {
              ipcursor.move_to_kbcursor();
              ipcursor.point('right');
            } else {
              kbcursor.move_right();
            }
            break;
          case 40: // down
            if (ev.shiftKey) {
              ipcursor.move_to_kbcursor();
              ipcursor.point('down');
            } else {
              kbcursor.move_down();
            }
            break;
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
