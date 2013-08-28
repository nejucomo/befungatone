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
    console.log(gameboardnode);

    var call = function (f) { return f(); };
    var trace = function (x) { console.log(x); return x; }

    call( // Initialize the board:
      function () {
        var svgns = 'http://www.w3.org/2000/svg';

        var fields = gameboardnode.getAttribute('viewBox').split(' ');
        var gbheight = fields.pop();
        var gbwidth = fields.pop();
        var cellwidth = gbwidth / config.cols;
        var cellheight = gbheight / config.rows;
        var innerwidth = cellwidth - 2 * INTERCELL_PADDING;
        var innerheight = cellheight - 2 * INTERCELL_PADDING;

        console.log({cellwidth: cellwidth, cellheight: cellheight});

        for (var r = 0; r < config.rows; r++) {
          for (var c = 0; c < config.cols; c++) {
            var left = c * cellwidth + INTERCELL_PADDING;
            var top = r * cellheight + INTERCELL_PADDING;

            var rectnode = document.createElementNS(svgns, 'rect');
            rectnode.id = 'c' + c + 'r' + r;
            rectnode.setAttribute('x', left);
            rectnode.setAttribute('y', top);
            rectnode.setAttribute('width', innerwidth);
            rectnode.setAttribute('height', innerheight);
            rectnode.setAttribute('class', 'normal-cell');

            gameboardnode.appendChild(rectnode);
          }
        }
      });
  });
