// File transpiled by Babel - do not edit

/**
 *  Quill module - url link
 */

/* global Quill
*/
'use strict';

/* global Tooltip
*/

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x3, _x4, _x5) { var _again = true; _function: while (_again) { var object = _x3, property = _x4, receiver = _x5; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x3 = parent; _x4 = property; _x5 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var LinkTooltip = (function (_Tooltip) {
  _inherits(LinkTooltip, _Tooltip);

  function LinkTooltip(quill) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    _classCallCheck(this, LinkTooltip);

    Object.assign(options, LinkTooltip.DEFAULTS, options);

    _get(Object.getPrototypeOf(LinkTooltip.prototype), 'constructor', this).call(this, quill, options);
    this.container.classList.add('ql-link-tooltip');
    this.textbox = this.container.querySelector('.input');
    this.link = this.container.querySelector('.url');
    this.initListeners();
  }

  _createClass(LinkTooltip, [{
    key: 'initListeners',
    value: function initListeners() {
      var _this = this;

      this.quill.on(Quill.events.SELECTION_CHANGE, function (range) {
        if (range == null || !range.isCollapsed()) return;
        var anchor = _this._findAnchor(range);

        //console.log("selection change, anchor: ", anchor);

        if (anchor != null) {
          _this.setMode(anchor.href, false);
          _this.show(anchor);
        } else if (_this.container.style.left != Tooltip.HIDE_MARGIN) {
          _this.hide();
        }
      });

      this.container.querySelector('.done').addEventListener('click', this.saveLink.bind(this));

      this.container.querySelector('.remove').addEventListener('click', function () {
        _this.removeLink(_this.quill.getSelection());
      });

      this.container.querySelector('.change').addEventListener('click', function () {
        _this.setMode(_this.link.href, true);
      });

      this.initTextbox(this.textbox, this.saveLink, this.hide);

      this.quill.onModuleLoad('toolbar', function (toolbar) {
        _this.toolbar = toolbar;
        toolbar.initFormat('link', _this._onToolbar.bind(_this));
      });

      this.quill.onModuleLoad('keyboard', function (keyboard) {
        keyboard.addHotkey(LinkTooltip.hotkeys.LINK, _this._onKeyboard.bind(_this));
      });
    }
  }, {
    key: 'removeLink',
    value: function removeLink() {
      var range = this.quill.getSelection();
      // Expand range to the entire leaf
      if (range.isCollapsed()) {
        range = this._expandRange(range);
      }
      this.hide();
      this.quill.formatText(range, 'link', false, Quill.sources.USER);
      if (this.toolbar != null) {
        this.toolbar.setActive('link', false);
      }
    }
  }, {
    key: 'saveLink',
    value: function saveLink() {

      //console.log("saveLink, textbox value: ", this.textbox.value);

      var url = this._normalizeURL(this.textbox.value);

      var range = this.quill.getSelection(true);

      console.log("SaveLink, range: ", range);

      if (range != null) {

        if (range.isCollapsed()) {
          var anchor = this._findAnchor(range);

          console.log("Anchor:", anchor);

          if (anchor != null) {
            anchor.href = url;
          }
        } else {
          this.quill.formatText(range, 'link', url, Quill.sources.USER);
          console.log("FormatText, range: ", range);
        }

        this.quill.setSelection(range.end, range.end);
      }

      this.setMode(url, false);
    }
  }, {
    key: 'setMode',
    value: function setMode(url) {
      var _this2 = this;

      var edit = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

      console.log("setMode, url, edit: ", url, edit);

      if (edit) {
        this.textbox.value = url;
        setTimeout(function () {
          // Setting value and immediately focusing doesn't work on Chrome
          _this2.textbox.focus();
          _this2.textbox.setSelectionRange(0, url.length);
        }, 0);
      } else {
        this.link.href = _url;
        var _url = this.link.href;
        var text = _url.length > this.options.maxLength ? _url.slice(0, this.options.maxLength) + '...' : _url;
        this.link.textContent = text;

        //console.log("setMode, text: ", text);
      }
      if (this.container.classList.contains('editing') !== edit) {
        this.container.classList.toggle('editing');
      }
    }
  }, {
    key: '_expandRange',
    value: function _expandRange(range) {
      var _quill$editor$doc$findLeafAt = this.quill.editor.doc.findLeafAt(range.start, true);

      var _quill$editor$doc$findLeafAt2 = _slicedToArray(_quill$editor$doc$findLeafAt, 2);

      var leaf = _quill$editor$doc$findLeafAt2[0];
      var offset = _quill$editor$doc$findLeafAt2[1];

      var start = range.start - offset;
      var end = start + leaf.length;
      return { start: start, end: end };
    }
  }, {
    key: '_findAnchor',
    value: function _findAnchor(range) {
      var node = undefined;

      var _quill$editor$doc$findLeafAt3 = this.quill.editor.doc.findLeafAt(range.start, true);

      var _quill$editor$doc$findLeafAt32 = _slicedToArray(_quill$editor$doc$findLeafAt3, 2);

      var leaf = _quill$editor$doc$findLeafAt32[0];
      var offset = _quill$editor$doc$findLeafAt32[1];

      //console.log("_findAnchor: leaf: ", leaf);

      if (leaf != null) {
        node = leaf.node;
      }
      while (node != null && node !== this.quill.root) {
        if (node.tagName === 'A') {

          //console.log("_findAnchor, Anode: ", node);
          return node;
        }

        node = node.parentNode;
      }
      return null;
    }
  }, {
    key: '_normalizeURL',
    value: function _normalizeURL(url) {
      return url;
    }
  }, {
    key: '_onKeyboard',
    value: function _onKeyboard() {
      var range = this.quill.getSelection();
      this._toggle(range, !this._findAnchor(range));
    }
  }, {
    key: '_onToolbar',
    value: function _onToolbar(range, value) {
      this._toggle(range, value);
    }
  }, {
    key: '_toggle',
    value: function _toggle(range, value) {
      if (range == null) return;
      if (!value) {
        this.removeLink(range);
      } else if (!range.isCollapsed()) {
        this.setMode(this._suggestURL(range), true);
        var nativeRange = this.quill.editor.selection._getNativeRange();
        this.show(nativeRange);
      }
    }
  }, {
    key: '_suggestURL',
    value: function _suggestURL(range) {
      var text = this.quill.getText(range);
      return this._normalizeURL(text);
    }
  }]);

  return LinkTooltip;
})(Tooltip);

LinkTooltip.DEFAULTS = {
  maxLength: 50,
  offset: 10,
  template: '\n    <span class="title">Visit URL:&nbsp;</span>\n    <a href="#" class="url" href="about:blank"></a>\n    <input class="input" type="text">\n    <span>&nbsp;&#45;&nbsp;</span>\n    <a href="javascript:;" class="change">Change</a>\n    <a href="javascript:;" class="remove">Remove</a>\n    <a href="javascript:;" class="done">Done</a>'
};
LinkTooltip.hotkeys = {
  LINK: {
    key: 'K',
    metaKey: true
  }
};

Quill.registerModule('link-tooltip', LinkTooltip);