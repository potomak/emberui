"use strict";
var styleSupport = require("../mixins/style-support")["default"] || require("../mixins/style-support");
var animationSupport = require("../mixins/animation-support")["default"] || require("../mixins/animation-support");
var poplistLayout = require("../templates/eui-poplist")["default"] || require("../templates/eui-poplist");
var itemViewClassTemplate = require("../templates/eui-poplist-option")["default"] || require("../templates/eui-poplist-option");
var poplist;

poplist = Em.Component.extend(styleSupport, animationSupport, {
  layout: poplistLayout,
  classNames: ['eui-poplist'],
  classNameBindings: ['isOpen::eui-closing'],
  attributeBindings: ['tabindex'],
  tagName: 'eui-poplist',
  animationClass: 'euiPoplist',
  listWidth: null,
  listHeight: '80',
  listRowHeight: '20',
  labelPath: 'label',
  options: null,
  searchString: null,
  highlightedIndex: -1,
  previousFocus: null,
  highlighted: Ember.computed('highlightedIndex', 'filteredOptions', function(key, value) {
    var index, options;
    options = this.get('filteredOptions');
    if (arguments.length === 2) {
      index = options.indexOf(value);
      this.set('highlightedIndex', index);
      return value;
    } else {
      index = this.get('highlightedIndex');
      return options.objectAt(index);
    }
  }),
  hide: function() {
    return this.animateOut({
      target: this.get('targetObject').$(),
      complete: (function(_this) {
        return function() {
          return _this.breakdown();
        };
      })(this)
    });
  },
  setup: (function() {
    this.setPoplistWidth();
    Em.run.next(this, function() {
      return this.$().position({
        my: "right top",
        at: "right bottom",
        of: this.get('targetObject').$(),
        collision: 'flipfit'
      });
    });
    this.animateIn();
    this.set('isOpen', true);
    this.set('previousFocus', $(document.activeElement));
    Ember.run.next(this, function() {
      return this.focusOnSearch();
    });
    this.updateListWidthCss();
    Ember.run.next(this, function() {
      return this.scrollToSelection(this.get('options').indexOf(this.get('selection')), true);
    });
    $('body').addClass('eui-poplist-open');
    return Ember.run.next(this, function() {
      return $(window).on('click.emberui', (function(_this) {
        return function(event) {
          if (!$(event.target).parents('.eui-poplist').length) {
            event.preventDefault();
            $(window).off(event);
            return _this.hide();
          }
        };
      })(this));
    });
  }).on('didInsertElement'),
  breakdown: function() {
    this.setProperties({
      isOpen: false,
      highlightedIndex: -1
    });
    this.get('previousFocus').focus();
    $('body').removeClass('eui-poplist-open');
    return this.destroy();
  },
  setPoplistWidth: function() {
    var element, elementWidthMinuspoplistPadding, poplistElement;
    element = this.get('targetObject').$();
    poplistElement = this.$();
    elementWidthMinuspoplistPadding = element.width() - parseFloat(poplistElement.css('paddingLeft')) - parseFloat(poplistElement.css('paddingRight'));
    return poplistElement.css('min-width', elementWidthMinuspoplistPadding);
  },
  focusOnSearch: function() {
    return this.$().find('input:first').focus();
  },
  updateListWidthCss: function() {
    var listWidth;
    listWidth = this.get('listWidth');
    return this.$().css('width', listWidth);
  },
  searchStringDidChange: (function() {
    if (this.get('searchString')) {
      return this.set('highlightedIndex', 0);
    }
  }).observes('searchString'),
  filteredOptions: (function() {
    var escapedQuery, filteredOptions, labelPath, options, query, regex;
    options = this.get('options');
    query = this.get('searchString');
    if (!options) {
      return [];
    }
    if (!query) {
      return options;
    }
    labelPath = this.get('labelPath');
    escapedQuery = query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    regex = new RegExp(escapedQuery, 'i');
    filteredOptions = options.filter(function(item, index, self) {
      var label;
      label = (typeof item.get === "function" ? item.get(labelPath) : void 0) || item[labelPath];
      if (label) {
        return regex.test(label);
      }
    });
    return filteredOptions;
  }).property('options.@each', 'labelPath', 'searchString'),
  hasNoOptions: Ember.computed.empty('filteredOptions'),
  optionsLengthDidChange: (function() {
    return this.updateListHeight();
  }).observes('filteredOptions.length'),
  updateListHeight: function() {
    var optionCount, rowHeight;
    optionCount = this.get('filteredOptions.length');
    rowHeight = this.get('listRowHeight');
    if (optionCount <= 12) {
      return this.set('listHeight', optionCount * rowHeight);
    } else {
      return this.set('listHeight', 10 * rowHeight);
    }
  },
  scrollToSelection: function(index, center) {
    var $listView, endIndex, listView, numRows, startIndex;
    $listView = this.$('.ember-list-view');
    listView = Ember.View.views[$listView.attr('id')];
    startIndex = listView._startingIndex();
    numRows = listView._childViewCount() - 1;
    endIndex = startIndex + numRows;
    if (index === 0) {
      return $listView.scrollTop(0);
    } else if (index < startIndex) {
      return $listView.scrollTop(index * this.get('listRowHeight'));
    } else if (index >= endIndex) {
      if (center) {
        return $listView.scrollTop((index - (numRows / 2)) * this.get('listRowHeight'));
      } else {
        return $listView.scrollTop((index - numRows + 1) * this.get('listRowHeight'));
      }
    }
  },
  KEY_MAP: {
    27: 'escapePressed',
    13: 'enterPressed',
    38: 'upArrowPressed',
    40: 'downArrowPressed'
  },
  keyUp: function(event) {
    var keyMap, method, _ref;
    keyMap = this.get('KEY_MAP');
    method = keyMap[event.which];
    if (method) {
      return (_ref = this.get(method)) != null ? _ref.apply(this, arguments) : void 0;
    }
  },
  escapePressed: function(event) {
    return this.hide();
  },
  enterPressed: function(event) {
    event.preventDefault();
    this.set('selection', this.get('highlighted'));
    return this.hide();
  },
  downArrowPressed: function(event) {
    event.preventDefault();
    return this.adjustHighlight(1);
  },
  upArrowPressed: function(event) {
    event.preventDefault();
    return this.adjustHighlight(-1);
  },
  adjustHighlight: function(indexAdjustment) {
    var highlightedIndex, newIndex, options, optionsLength;
    highlightedIndex = this.get('highlightedIndex');
    options = this.get('filteredOptions');
    optionsLength = options.get('length');
    newIndex;
    if (highlightedIndex >= optionsLength) {
      if (indexAdjustment === 1) {
        newIndex = 0;
      }
    } else {
      newIndex = highlightedIndex + indexAdjustment;
      if (newIndex >= optionsLength) {
        newIndex = optionsLength - 1;
      } else if (newIndex < 0) {
        newIndex = 0;
      }
    }
    this.scrollToSelection(newIndex);
    return this.set('highlightedIndex', newIndex);
  },
  listView: Ember.ListView.extend({
    css: {
      position: 'relative',
      overflow: 'auto',
      '-webkit-overflow-scrolling': 'touch',
      'overflow-scrolling': 'touch'
    },
    classNames: ['eui-options'],
    height: Ember.computed.alias('controller.listHeight'),
    rowHeight: Ember.computed.alias('controller.listRowHeight'),
    setup: (function() {
      return this.$().bind('mousewheel.emberui DOMMouseScroll.emberui', (function(_this) {
        return function(e) {
          var scrollTo;
          e.preventDefault();
          scrollTo = _this.get('scrollTop');
          if (e.type === 'mousewheel') {
            scrollTo += e.originalEvent.wheelDelta * -1;
          } else if (e.type === 'DOMMouseScroll') {
            scrollTo += 40 * e.originalEvent.detail;
          }
          return _this.scrollTo(scrollTo);
        };
      })(this));
    }).on('didInsertElement'),
    itemViewClass: Ember.ListItemView.extend({
      classNames: ['eui-option'],
      classNameBindings: ['isHighlighted:eui-hover', 'isSelected:eui-selected'],
      template: itemViewClassTemplate,
      labelPathDidChange: (function() {
        var labelPath;
        labelPath = this.get('controller.labelPath');
        Ember.defineProperty(this, 'label', Ember.computed.alias("content." + labelPath));
        return this.notifyPropertyChange('label');
      }).observes('content', 'controller.labelPath'),
      initializeLabelPath: (function() {
        return this.labelPathDidChange();
      }).on('init'),
      updateContext: function(context) {
        this._super(context);
        return this.set('content', context);
      },
      isHighlighted: Ember.computed('controller.highlighted', 'content', function() {
        return this.get('controller.highlighted') === this.get('content');
      }),
      isSelected: Ember.computed('controller.selection', 'content', function() {
        return this.get('controller.selection') === this.get('content');
      }),
      click: function() {
        this.set('controller.selection', this.get('content'));
        return this.get('controller').hide();
      },
      mouseEnter: function() {
        var hoveredOption, options;
        options = this.get('controller.filteredOptions');
        hoveredOption = this.get('content');
        return this.set('controller.highlighted', hoveredOption);
      }
    })
  })
});

poplist.reopenClass({
  show: function(options) {
    if (options == null) {
      options = {};
    }
    poplist = this.create(options);
    poplist.container = poplist.get('targetObject.container');
    poplist.appendTo('.ember-application');
    poplist.updateListHeight();
    return poplist;
  }
});

exports["default"] = poplist;