// File transpiled by Babel - do not edit

/* global Quill */

'use strict';

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var HIDE_MARGIN = '-10000px';

var keys = {
  BACKSPACE: 8,
  TAB: 9,
  ENTER: 13,
  ESCAPE: 27,
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  DELETE: 46
};

var Tooltip = (function () {
  function Tooltip(quill) {
    var _this = this;

    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    _classCallCheck(this, Tooltip);

    this.quill = quill;
    this.options = options;
    this.container = this.quill.addContainer('ql-tooltip');
    this.container.innerHTML = this.options.template;
    this.hide();
    this.quill.on(Quill.events.TEXT_CHANGE, function (delta, source) {
      if (_this.container.style.left !== HIDE_MARGIN) {
        _this.hide();
      }
    });
  }

  _createClass(Tooltip, [{
    key: 'initTextbox',
    value: function initTextbox(textbox, enterCallback, escapeCallback) {
      var _this2 = this;

      textbox.addEventListener('keydown', function (evt) {
        if (evt.which !== keys.ENTER && evt.which !== keys.ESCAPE) return;
        var fn = evt.which === keys.ENTER ? enterCallback : escapeCallback;
        fn.call(_this2);
        evt.preventDefault();
      });
    }
  }, {
    key: 'hide',
    value: function hide() {
      this.container.style.left = HIDE_MARGIN;
      this.quill.focus();
    }
  }, {
    key: 'position',
    value: function position(reference) {
      var left = undefined,
          top = undefined;
      if (reference != null) {
        var referenceBounds = reference.getBoundingClientRect();
        var parentBounds = this.quill.container.getBoundingClientRect();
        var offsetLeft = referenceBounds.left - parentBounds.left;
        var offsetTop = referenceBounds.top - parentBounds.top;

        //let offsetBottom = referenceBounds.bottom - parentBounds.bottom;
        left = offsetLeft + referenceBounds.width / 2 - this.container.offsetWidth / 2;
        top = offsetTop + referenceBounds.height + this.options.offset;
        if (top + this.container.offsetHeight > this.quill.container.offsetHeight) {
          top = offsetTop - this.container.offsetHeight - this.options.offset;
        }
        left = Math.max(0, Math.min(left, this.quill.container.offsetWidth - this.container.offsetWidth));
        top = Math.max(0, Math.min(top, this.quill.container.offsetHeight - this.container.offsetHeight));
      } else {
        left = this.quill.container.offsetWidth / 2 - this.container.offsetWidth / 2;
        top = this.quill.container.offsetHeight / 2 - this.container.offsetHeight / 2;
      }
      top += this.quill.container.scrollTop;

      return [left, top];
    }
  }, {
    key: 'show',
    value: function show(reference) {
      var _position = this.position(reference);

      var _position2 = _slicedToArray(_position, 2);

      var left = _position2[0];
      var top = _position2[1];

      this.container.style.left = left + "px";
      this.container.style.top = top + "px";
      this.container.focus();
    }
  }]);

  return Tooltip;
})();

Tooltip.DEFAULTS = {
  offset: 10,
  template: ''
};

Quill.registerModule('tooltip', Tooltip);