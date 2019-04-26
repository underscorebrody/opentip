  /*
   *
   * Opentip v2.4.7-dev
   *
   * More info at [www.opentip.org](http://www.opentip.org)
   * 
   * Copyright (c) 2012, Matias Meno  
   * Graphics by Tjandra Mayerhold
   * 
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:
   * 
   * The above copyright notice and this permission notice shall be included in
   * all copies or substantial portions of the Software.
   * 
   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   * THE SOFTWARE.
   *
   */
var Opentip, firstAdapter, i, j, len, mouseMoved, mousePosition, mousePositionObservers, position, ref, vendors,
  indexOf = [].indexOf,
  hasProp = {}.hasOwnProperty;

Opentip = (function() {
  // Opentip
  // -------

  // Usage:

  //     <div data-ot="This will be viewed in tooltip"></div>

  // or externally:

  //     new Opentip(element, content, title, options);

  // For a full documentation, please visit [www.opentip.org](http://www.opentip.org)
  class Opentip {
    
    // Sets up and configures the tooltip but does **not** build the html elements.

    // `content`, `title` and `options` are optional but have to be in this order.
    constructor(element, content, title, options) {
      var _tmpStyle, elementsOpentips, hideTrigger, j, k, len, len1, methodToBind, optionSources, prop, ref, ref1, styleName;
      this.id = ++Opentip.lastId;
      this.debug("Creating Opentip.");
      Opentip.tips.push(this);
      this.adapter = Opentip.adapter;
      // Add the ID to the element
      elementsOpentips = this.adapter.data(element, "opentips") || [];
      elementsOpentips.push(this);
      this.adapter.data(element, "opentips", elementsOpentips);
      this.triggerElement = this.adapter.wrap(element);
      if (this.triggerElement.length > 1) {
        throw new Error("You can't call Opentip on multiple elements.");
      }
      if (this.triggerElement.length < 1) {
        throw new Error(`${element} is not a valid element.`);
      }
      // AJAX
      this.loaded = false;
      this.loading = false;
      this.visible = false;
      this.waitingToShow = false;
      this.waitingToHide = false;
      // Some initial values
      this.currentPosition = {
        left: 0,
        top: 0
      };
      this.dimensions = {
        width: 100,
        height: 50
      };
      this.content = "";
      this.redraw = true;
      this.currentObservers = {
        showing: false,
        visible: false,
        hiding: false,
        hidden: false
      };
      // Make sure to not overwrite the users options object
      options = this.adapter.clone(options);
      if (typeof content === "object") {
        options = content;
        content = title = void 0;
      } else if (typeof title === "object") {
        options = title;
        title = void 0;
      }
      if (title != null) {
        // Now build the complete options object from the styles
        options.title = title;
      }
      if (content != null) {
        this.setContent(content);
      }
      if (options.extends == null) {
        if (options.style != null) {
          options.extends = options.style;
        } else {
          options.extends = Opentip.defaultStyle;
        }
      }
      optionSources = [options];
      // Now add go through the theme hierarchy and apply the options
      _tmpStyle = options;
      while (_tmpStyle.extends) {
        styleName = _tmpStyle.extends;
        _tmpStyle = Opentip.styles[styleName];
        if (_tmpStyle == null) {
          throw new Error(`Invalid style: ${styleName}`);
        }
        optionSources.unshift(_tmpStyle);
        if (!((_tmpStyle.extends != null) || styleName === "standard")) {
          // Now making sure that all styles result in the standard style, even when not
          // specified
          _tmpStyle.extends = "standard";
        }
      }
      options = this.adapter.extend({}, ...optionSources);
      // Deep copying the hideTriggers array
      options.hideTriggers = (function() {
        var j, len, ref, results;
        ref = options.hideTriggers;
        results = [];
        for (j = 0, len = ref.length; j < len; j++) {
          hideTrigger = ref[j];
          results.push(hideTrigger);
        }
        return results;
      })();
      if (options.hideTrigger && options.hideTriggers.length === 0) {
        options.hideTriggers.push(options.hideTrigger);
      }
      ref = ["tipJoint", "targetJoint", "stem"];
      for (j = 0, len = ref.length; j < len; j++) {
        prop = ref[j];
        if (options[prop] && typeof options[prop] === "string") {
          // Sanitize all positions
          options[prop] = new Opentip.Joint(options[prop]);
        }
      }
      // If the url of an Ajax request is not set, get it from the link it's attached to.
      if (options.ajax && (options.ajax === true || !options.ajax)) {
        if (this.adapter.tagName(this.triggerElement) === "A") {
          options.ajax = this.adapter.attr(this.triggerElement, "href");
        } else {
          options.ajax = false;
        }
      }
      // If the event is 'click', no point in following a link
      if (options.showOn === "click" && this.adapter.tagName(this.triggerElement) === "A") {
        this.adapter.observe(this.triggerElement, "click", function(e) {
          e.preventDefault();
          e.stopPropagation();
          return e.stopped = true;
        });
      }
      if (options.target) {
        // Doesn't make sense to use a target without the opentip being fixed
        options.fixed = true;
      }
      if (options.stem === true) {
        options.stem = new Opentip.Joint(options.tipJoint);
      }
      if (options.target === true) {
        options.target = this.triggerElement;
      } else if (options.target) {
        options.target = this.adapter.wrap(options.target);
      }
      this.currentStem = options.stem;
      if (options.delay == null) {
        options.delay = options.showOn === "mouseover" ? 0.2 : 0;
      }
      if (options.targetJoint == null) {
        options.targetJoint = new Opentip.Joint(options.tipJoint).flip();
      }
      // Used to show the opentip obviously
      this.showTriggers = [];
      // Those ensure that opentip doesn't disappear when hovering other related elements
      this.showTriggersWhenVisible = [];
      // Elements that hide Opentip
      this.hideTriggers = [];
      // The obvious showTriggerELementWhenHidden is the options.showOn
      if (options.showOn && options.showOn !== "creation") {
        this.showTriggers.push({
          element: this.triggerElement,
          event: options.showOn
        });
      }
      // Backwards compatibility
      if (options.ajaxCache != null) {
        options.cache = options.ajaxCache;
        delete options.ajaxCache;
      }
      this.options = options;
      this.bound = {};
      ref1 = ["prepareToShow", "prepareToHide", "show", "hide", "reposition"];
      for (k = 0, len1 = ref1.length; k < len1; k++) {
        methodToBind = ref1[k];
        this.bound[methodToBind] = ((methodToBind) => {
          return () => {
            return this[methodToBind](...arguments);
          };
        })(methodToBind);
      }
      // Build the HTML elements when the dom is ready.
      this.adapter.domReady(() => {
        this.activate();
        if (this.options.showOn === "creation") {
          return this.prepareToShow();
        }
      });
    }

    // Initializes the tooltip by creating the container and setting up the event
    // listeners.

    // This does not yet create all elements. They are created when the tooltip
    // actually shows for the first time.
    _setup() {
      var hideOn, hideTrigger, hideTriggerElement, i, j, k, len, len1, ref, ref1, results;
      this.debug("Setting up the tooltip.");
      this._buildContainer();
      this.hideTriggers = [];
      ref = this.options.hideTriggers;
      for (i = j = 0, len = ref.length; j < len; i = ++j) {
        hideTrigger = ref[i];
        hideTriggerElement = null;
        hideOn = this.options.hideOn instanceof Array ? this.options.hideOn[i] : this.options.hideOn;
        if (typeof hideTrigger === "string") {
          switch (hideTrigger) {
            case "trigger":
              hideOn = hideOn || "mouseout";
              hideTriggerElement = this.triggerElement;
              break;
            case "tip":
              hideOn = hideOn || "mouseover";
              hideTriggerElement = this.container;
              break;
            case "target":
              hideOn = hideOn || "mouseover";
              hideTriggerElement = this.options.target;
              break;
            case "closeButton":
              break;
            default:
              // The close button gets handled later
              throw new Error(`Unknown hide trigger: ${hideTrigger}.`);
          }
        } else {
          hideOn = hideOn || "mouseover";
          hideTriggerElement = this.adapter.wrap(hideTrigger);
        }
        if (hideTriggerElement) {
          this.hideTriggers.push({
            element: hideTriggerElement,
            event: hideOn,
            original: hideTrigger
          });
        }
      }
      ref1 = this.hideTriggers;
      // Now setup the events that make sure opentips don't appear when mouseover
      // another hideTrigger

      // This also solves the problem of the tooltip disappearing when hovering child
      // elements (Hovering children fires a mouseout mouseover event)
      results = [];
      for (k = 0, len1 = ref1.length; k < len1; k++) {
        hideTrigger = ref1[k];
        results.push(this.showTriggersWhenVisible.push({
          element: hideTrigger.element,
          event: "mouseover"
        }));
      }
      return results;
    }

    // This just builds the opentip container, which is the absolute minimum to
    // attach events to it.

    // The actual creation of the elements is in buildElements()
    _buildContainer() {
      this.container = this.adapter.create(`<div id="opentip-${this.id}" class="${this.class.container} ${this.class.hidden} ${this.class.stylePrefix}${this.options.className}"></div>`);
      this.adapter.css(this.container, {
        position: "absolute"
      });
      if (this.options.ajax) {
        this.adapter.addClass(this.container, this.class.loading);
      }
      if (this.options.fixed) {
        this.adapter.addClass(this.container, this.class.fixed);
      }
      if (this.options.showEffect) {
        this.adapter.addClass(this.container, `${this.class.showEffectPrefix}${this.options.showEffect}`);
      }
      if (this.options.hideEffect) {
        return this.adapter.addClass(this.container, `${this.class.hideEffectPrefix}${this.options.hideEffect}`);
      }
    }

    // Builds all elements inside the container and put the container in body.
    _buildElements() {
      var headerElement, titleElement;
      // The actual content will be set by `_updateElementContent()`
      this.tooltipElement = this.adapter.create(`<div class="${this.class.opentip}"><div class="${this.class.header}"></div><div class="${this.class.content}"></div></div>`);
      this.backgroundCanvas = this.adapter.wrap(document.createElement("canvas"));
      this.adapter.css(this.backgroundCanvas, {
        position: "absolute"
      });
      if (typeof G_vmlCanvasManager !== "undefined" && G_vmlCanvasManager !== null) {
        G_vmlCanvasManager.initElement(this.adapter.unwrap(this.backgroundCanvas));
      }
      headerElement = this.adapter.find(this.tooltipElement, `.${this.class.header}`);
      if (this.options.title) {
        // Create the title element and append it to the header
        titleElement = this.adapter.create("<h1></h1>");
        this.adapter.update(titleElement, this.options.title, this.options.escapeTitle);
        this.adapter.append(headerElement, titleElement);
      }
      if (this.options.ajax && !this.loaded) {
        this.adapter.append(this.tooltipElement, this.adapter.create(`<div class="${this.class.loadingIndicator}"><span>↻</span></div>`));
      }
      if (indexOf.call(this.options.hideTriggers, "closeButton") >= 0) {
        this.closeButtonElement = this.adapter.create(`<a href="javascript:undefined;" class="${this.class.close}"><span>Close</span></a>`);
        this.adapter.append(headerElement, this.closeButtonElement);
      }
      // Now put the tooltip and the canvas in the container and the container in the body
      this.adapter.append(this.container, this.backgroundCanvas);
      this.adapter.append(this.container, this.tooltipElement);
      this.adapter.append(document.body, this.container);
      // Makes sure that the content is redrawn.
      this._newContent = true;
      return this.redraw = true;
    }

    // Sets the content and updates the HTML element if currently visible

    // This can be a function or a string. The function will be executed, and the
    // result used as new content of the tooltip.
    setContent(content1) {
      this.content = content1;
      this._newContent = true;
      if (typeof this.content === "function") {
        this._contentFunction = this.content;
        this.content = "";
      } else {
        this._contentFunction = null;
      }
      if (this.visible) {
        return this._updateElementContent();
      }
    }

    // Actually updates the content.

    // If content is a function it is evaluated here.
    _updateElementContent() {
      var contentDiv;
      if (this._newContent || (!this.options.cache && this._contentFunction)) {
        contentDiv = this.adapter.find(this.container, `.${this.class.content}`);
        if (contentDiv != null) {
          if (this._contentFunction) {
            this.debug("Executing content function.");
            this.content = this._contentFunction(this);
          }
          this.adapter.update(contentDiv, this.content, this.options.escapeContent);
        }
        this._newContent = false;
      }
      this._storeAndLockDimensions();
      return this.reposition();
    }

    // Sets width auto to the element so it uses the appropriate width, gets the
    // dimensions and sets them so the tolltip won't change in size (which can be
    // annoying when the tooltip gets too close to the browser edge)
    _storeAndLockDimensions() {
      var prevDimension;
      if (!this.container) {
        return;
      }
      prevDimension = this.dimensions;
      this.adapter.css(this.container, {
        width: "auto",
        left: "0px", // So it doesn't force wrapping
        top: "0px"
      });
      this.dimensions = this.adapter.dimensions(this.container);
      // Firefox <=3.6 has a strange wrapping proplem when taking the exact width
      this.dimensions.width += 1;
      this.adapter.css(this.container, {
        width: `${this.dimensions.width}px`,
        top: `${this.currentPosition.top}px`,
        left: `${this.currentPosition.left}px`
      });
      if (!this._dimensionsEqual(this.dimensions, prevDimension)) {
        this.redraw = true;
        return this._draw();
      }
    }

    // Sets up appropriate observers
    activate() {
      return this._setupObservers("hidden", "hiding");
    }

    // Hides the tooltip and sets up appropriate observers
    deactivate() {
      this.debug("Deactivating tooltip.");
      this.hide();
      return this._setupObservers("-showing", "-visible", "-hidden", "-hiding");
    }

    // If a state starts with a minus all observers are removed instead of set.
    _setupObservers(...states) {
      var j, k, l, len, len1, len2, len3, m, observeOrStop, ref, ref1, ref2, removeObserver, state, trigger;
      for (j = 0, len = states.length; j < len; j++) {
        state = states[j];
        removeObserver = false;
        if (state.charAt(0) === "-") {
          removeObserver = true;
          state = state.substr(1); // Remove leading -
        }
        if (this.currentObservers[state] === !removeObserver) {
          
          // Do nothing if the state is already achieved
          continue;
        }
        this.currentObservers[state] = !removeObserver;
        observeOrStop = (...args) => {
          if (removeObserver) {
            return this.adapter.stopObserving(...args);
          } else {
            return this.adapter.observe(...args);
          }
        };
        switch (state) {
          case "showing":
            ref = this.hideTriggers;
            // Setup the triggers to hide the tip
            for (k = 0, len1 = ref.length; k < len1; k++) {
              trigger = ref[k];
              observeOrStop(trigger.element, trigger.event, this.bound.prepareToHide);
            }
            // Start listening to window changes
            observeOrStop((document.onresize != null ? document : window), "resize", this.bound.reposition);
            observeOrStop(window, "scroll", this.bound.reposition);
            break;
          case "visible":
            ref1 = this.showTriggersWhenVisible;
            // Most of the observers have already been handled by "showing"
            // Add the triggers that make sure opentip doesn't hide prematurely
            for (l = 0, len2 = ref1.length; l < len2; l++) {
              trigger = ref1[l];
              observeOrStop(trigger.element, trigger.event, this.bound.prepareToShow);
            }
            break;
          case "hiding":
            ref2 = this.showTriggers;
            // Setup the triggers to show the tip
            for (m = 0, len3 = ref2.length; m < len3; m++) {
              trigger = ref2[m];
              observeOrStop(trigger.element, trigger.event, this.bound.prepareToShow);
            }
            break;
          case "hidden":
            break;
          default:
            // Nothing to do since all observers are setup in "hiding"
            throw new Error(`Unknown state: ${state}`);
        }
      }
      return null; // No unnecessary array collection
    }

    prepareToShow() {
      this._abortHiding();
      this._abortShowing();
      if (this.visible) {
        return;
      }
      this.debug(`Showing in ${this.options.delay}s.`);
      if (this.container == null) {
        this._setup();
      }
      if (this.options.group) {
        Opentip._abortShowingGroup(this.options.group, this);
      }
      this.preparingToShow = true;
      // Even though it is not yet visible, I already attach the observers, so the
      // tooltip won't show if a hideEvent is triggered.
      this._setupObservers("-hidden", "-hiding", "showing");
      // Making sure the tooltip is at the right position as soon as it shows
      this._followMousePosition();
      if (this.options.fixed && !this.options.target) { // Used in reposition
        this.initialMousePosition = mousePosition;
      }
      this.reposition();
      return this._showTimeoutId = this.setTimeout(this.bound.show, this.options.delay || 0);
    }

    show() {
      this._abortHiding();
      if (this.visible) {
        return;
      }
      this._clearTimeouts();
      if (!this._triggerElementExists()) {
        return this.deactivate();
      }
      this.debug("Showing now.");
      if (this.container == null) {
        this._setup();
      }
      if (this.options.group) {
        Opentip._hideGroup(this.options.group, this);
      }
      this.visible = true;
      this.preparingToShow = false;
      if (this.tooltipElement == null) {
        this._buildElements();
      }
      this._updateElementContent();
      if (this.options.ajax && (!this.loaded || !this.options.cache)) {
        this._loadAjax();
      }
      this._searchAndActivateCloseButtons();
      this._startEnsureTriggerElement();
      this.adapter.css(this.container, {
        zIndex: Opentip.lastZIndex++
      });
      // The order is important here! Do not reverse.
      // Removing the showing and visible triggers as well in case they have been
      // removed by -hidden or -hiding
      this._setupObservers("-hidden", "-hiding", "-showing", "-visible", "showing", "visible");
      if (this.options.fixed && !this.options.target) { // Used in reposition
        this.initialMousePosition = mousePosition;
      }
      this.reposition();
      this.adapter.removeClass(this.container, this.class.hiding);
      this.adapter.removeClass(this.container, this.class.hidden);
      this.adapter.addClass(this.container, this.class.goingToShow);
      this.setCss3Style(this.container, {
        transitionDuration: "0s"
      });
      this.defer(() => {
        var delay;
        if (!this.visible || this.preparingToHide) {
          return;
        }
        this.adapter.removeClass(this.container, this.class.goingToShow);
        this.adapter.addClass(this.container, this.class.showing);
        delay = 0;
        if (this.options.showEffect && this.options.showEffectDuration) {
          delay = this.options.showEffectDuration;
        }
        this.setCss3Style(this.container, {
          transitionDuration: `${delay}s`
        });
        this._visibilityStateTimeoutId = this.setTimeout(() => {
          this.adapter.removeClass(this.container, this.class.showing);
          return this.adapter.addClass(this.container, this.class.visible);
        }, delay);
        return this._activateFirstInput();
      });
      // Just making sure the canvas has been drawn initially.
      // It could happen that the canvas isn't drawn yet when reposition is called
      // once before the canvas element has been created. If the position
      // doesn't change after it will never call @_draw() again.
      return this._draw();
    }

    _abortShowing() {
      if (this.preparingToShow) {
        this.debug("Aborting showing.");
        this._clearTimeouts();
        this._stopFollowingMousePosition();
        this.preparingToShow = false;
        return this._setupObservers("-showing", "-visible", "hiding", "hidden");
      }
    }

    prepareToHide() {
      this._abortShowing();
      this._abortHiding();
      if (!this.visible) {
        return;
      }
      this.debug(`Hiding in ${this.options.hideDelay}s`);
      this.preparingToHide = true;
      // We start observing even though it is not yet hidden, so the tooltip does
      // not disappear when a showEvent is triggered.
      this._setupObservers("-showing", "visible", "-hidden", "hiding");
      return this._hideTimeoutId = this.setTimeout(this.bound.hide, this.options.hideDelay);
    }

    hide() {
      this._abortShowing();
      if (!this.visible) {
        return;
      }
      this._clearTimeouts();
      this.debug("Hiding!");
      this.visible = false;
      this.preparingToHide = false;
      this._stopEnsureTriggerElement();
      // Removing hiding and hidden as well in case some events have been removed
      // by -showing or -visible
      this._setupObservers("-showing", "-visible", "-hiding", "-hidden", "hiding", "hidden");
      if (!this.options.fixed) {
        this._stopFollowingMousePosition();
      }
      if (!this.container) {
        return;
      }
      this.adapter.removeClass(this.container, this.class.visible);
      this.adapter.removeClass(this.container, this.class.showing);
      this.adapter.addClass(this.container, this.class.goingToHide);
      this.setCss3Style(this.container, {
        transitionDuration: "0s"
      });
      return this.defer(() => {
        var hideDelay;
        this.adapter.removeClass(this.container, this.class.goingToHide);
        this.adapter.addClass(this.container, this.class.hiding);
        hideDelay = 0;
        if (this.options.hideEffect && this.options.hideEffectDuration) {
          hideDelay = this.options.hideEffectDuration;
        }
        this.setCss3Style(this.container, {
          transitionDuration: `${hideDelay}s`
        });
        return this._visibilityStateTimeoutId = this.setTimeout(() => {
          this.adapter.removeClass(this.container, this.class.hiding);
          this.adapter.addClass(this.container, this.class.hidden);
          this.setCss3Style(this.container, {
            transitionDuration: "0s"
          });
          if (this.options.removeElementsOnHide) {
            this.debug("Removing HTML elements.");
            this.adapter.remove(this.container);
            delete this.container;
            return delete this.tooltipElement;
          }
        }, hideDelay);
      });
    }

    _abortHiding() {
      if (this.preparingToHide) {
        this.debug("Aborting hiding.");
        this._clearTimeouts();
        this.preparingToHide = false;
        return this._setupObservers("-hiding", "showing", "visible");
      }
    }

    reposition() {
      var position, stem;
      position = this.getPosition();
      if (position == null) {
        return;
      }
      stem = this.options.stem;
      if (this.options.containInViewport) {
        ({position, stem} = this._ensureViewportContainment(position));
      }
      // If the position didn't change, no need to do anything    
      if (this._positionsEqual(position, this.currentPosition)) {
        return;
      }
      if (!(!this.options.stem || stem.eql(this.currentStem))) {
        // The only time the canvas has to bee redrawn is when the stem changes.
        this.redraw = true;
      }
      this.currentPosition = position;
      this.currentStem = stem;
      // _draw() itself tests if it has to be redrawn.
      this._draw();
      this.adapter.css(this.container, {
        left: `${position.left}px`,
        top: `${position.top}px`
      });
      // Following is a redraw fix, because I noticed some drawing errors in
      // some browsers when tooltips where overlapping.
      return this.defer(() => {
        var rawContainer, redrawFix;
        rawContainer = this.adapter.unwrap(this.container);
        // I chose visibility instead of display so that I don't interfere with
        // appear/disappear effects.
        rawContainer.style.visibility = "hidden";
        redrawFix = rawContainer.offsetHeight;
        return rawContainer.style.visibility = "visible";
      });
    }

    getPosition(tipJoint, targetJoint, stem) {
      var additionalHorizontal, additionalVertical, offsetDistance, position, ref, stemLength, targetDimensions, targetPosition, unwrappedTarget;
      if (!this.container) {
        return;
      }
      if (tipJoint == null) {
        tipJoint = this.options.tipJoint;
      }
      if (targetJoint == null) {
        targetJoint = this.options.targetJoint;
      }
      position = {};
      if (this.options.target) {
        // Position is fixed
        targetPosition = this.adapter.offset(this.options.target);
        targetDimensions = this.adapter.dimensions(this.options.target);
        position = targetPosition;
        if (targetJoint.right) {
          // For wrapping inline elements, left + width does not give the right
          // border, because left is where the element started, not its most left
          // position.
          unwrappedTarget = this.adapter.unwrap(this.options.target);
          if (unwrappedTarget.getBoundingClientRect != null) {
            // TODO: make sure this actually works.
            position.left = unwrappedTarget.getBoundingClientRect().right + ((ref = window.pageXOffset) != null ? ref : document.body.scrollLeft);
          } else {
            // Well... browser doesn't support it
            position.left += targetDimensions.width;
          }
        } else if (targetJoint.center) {
          // Center
          position.left += Math.round(targetDimensions.width / 2);
        }
        if (targetJoint.bottom) {
          position.top += targetDimensions.height;
        } else if (targetJoint.middle) {
          // Middle
          position.top += Math.round(targetDimensions.height / 2);
        }
        if (this.options.borderWidth) {
          if (this.options.tipJoint.left) {
            position.left += this.options.borderWidth;
          }
          if (this.options.tipJoint.right) {
            position.left -= this.options.borderWidth;
          }
          if (this.options.tipJoint.top) {
            position.top += this.options.borderWidth;
          } else if (this.options.tipJoint.bottom) {
            position.top -= this.options.borderWidth;
          }
        }
      } else {
        if (this.initialMousePosition) {
          // When the tooltip is fixed and has no target the position is stored at the beginning.
          position = {
            top: this.initialMousePosition.y,
            left: this.initialMousePosition.x
          };
        } else {
          // Follow mouse
          position = {
            top: mousePosition.y,
            left: mousePosition.x
          };
        }
      }
      if (this.options.autoOffset) {
        stemLength = this.options.stem ? this.options.stemLength : 0;
        // If there is as stem offsets dont need to be that big if fixed.
        offsetDistance = stemLength && this.options.fixed ? 2 : 10;
        // Corners can be closer but when middle or center they are too close
        additionalHorizontal = tipJoint.middle && !this.options.fixed ? 15 : 0;
        additionalVertical = tipJoint.center && !this.options.fixed ? 15 : 0;
        if (tipJoint.right) {
          position.left -= offsetDistance + additionalHorizontal;
        } else if (tipJoint.left) {
          position.left += offsetDistance + additionalHorizontal;
        }
        if (tipJoint.bottom) {
          position.top -= offsetDistance + additionalVertical;
        } else if (tipJoint.top) {
          position.top += offsetDistance + additionalVertical;
        }
        if (stemLength) {
          if (stem == null) {
            stem = this.options.stem;
          }
          if (stem.right) {
            position.left -= stemLength;
          } else if (stem.left) {
            position.left += stemLength;
          }
          if (stem.bottom) {
            position.top -= stemLength;
          } else if (stem.top) {
            position.top += stemLength;
          }
        }
      }
      position.left += this.options.offset[0];
      position.top += this.options.offset[1];
      if (tipJoint.right) {
        position.left -= this.dimensions.width;
      } else if (tipJoint.center) {
        position.left -= Math.round(this.dimensions.width / 2);
      }
      if (tipJoint.bottom) {
        position.top -= this.dimensions.height;
      } else if (tipJoint.middle) {
        position.top -= Math.round(this.dimensions.height / 2);
      }
      return position;
    }

    _ensureViewportContainment(position) {
      var needsRepositioning, newSticksOut, originals, revertedX, revertedY, scrollOffset, stem, sticksOut, targetJoint, tipJoint, viewportDimensions, viewportPosition;
      stem = this.options.stem;
      originals = {
        position: position,
        stem: stem
      };
      if (!(this.visible && position)) {
        // Sometimes the element is theoretically visible, but an effect is not yet showing it.
        // So the calculation of the offsets is incorrect sometimes, which results in faulty repositioning.
        return originals;
      }
      sticksOut = this._sticksOut(position);
      if (!(sticksOut[0] || sticksOut[1])) {
        return originals;
      }
      tipJoint = new Opentip.Joint(this.options.tipJoint);
      if (this.options.targetJoint) {
        targetJoint = new Opentip.Joint(this.options.targetJoint);
      }
      scrollOffset = this.adapter.scrollOffset();
      viewportDimensions = this.adapter.viewportDimensions();
      // The opentip's position inside the viewport
      viewportPosition = [position.left - scrollOffset[0], position.top - scrollOffset[1]];
      needsRepositioning = false;
      if (viewportDimensions.width >= this.dimensions.width) {
        // Well if the viewport is smaller than the tooltip there's not much to do
        if (sticksOut[0]) {
          needsRepositioning = true;
          switch (sticksOut[0]) {
            case this.STICKS_OUT_LEFT:
              tipJoint.setHorizontal("left");
              if (this.options.targetJoint) {
                targetJoint.setHorizontal("right");
              }
              break;
            case this.STICKS_OUT_RIGHT:
              tipJoint.setHorizontal("right");
              if (this.options.targetJoint) {
                targetJoint.setHorizontal("left");
              }
          }
        }
      }
      if (viewportDimensions.height >= this.dimensions.height) {
        // Well if the viewport is smaller than the tooltip there's not much to do
        if (sticksOut[1]) {
          needsRepositioning = true;
          switch (sticksOut[1]) {
            case this.STICKS_OUT_TOP:
              tipJoint.setVertical("top");
              if (this.options.targetJoint) {
                targetJoint.setVertical("bottom");
              }
              break;
            case this.STICKS_OUT_BOTTOM:
              tipJoint.setVertical("bottom");
              if (this.options.targetJoint) {
                targetJoint.setVertical("top");
              }
          }
        }
      }
      if (!needsRepositioning) {
        return originals;
      }
      if (this.options.stem) {
        // Needs to reposition

        // TODO: actually handle the stem here
        stem = tipJoint;
      }
      position = this.getPosition(tipJoint, targetJoint, stem);
      newSticksOut = this._sticksOut(position);
      revertedX = false;
      revertedY = false;
      if (newSticksOut[0] && (newSticksOut[0] !== sticksOut[0])) {
        // The tooltip changed sides, but now is sticking out the other side of
        // the window.
        revertedX = true;
        tipJoint.setHorizontal(this.options.tipJoint.horizontal);
        if (this.options.targetJoint) {
          targetJoint.setHorizontal(this.options.targetJoint.horizontal);
        }
      }
      if (newSticksOut[1] && (newSticksOut[1] !== sticksOut[1])) {
        revertedY = true;
        tipJoint.setVertical(this.options.tipJoint.vertical);
        if (this.options.targetJoint) {
          targetJoint.setVertical(this.options.targetJoint.vertical);
        }
      }
      if (revertedX && revertedY) {
        return originals;
      }
      if (revertedX || revertedY) {
        if (this.options.stem) {
          // One of the positions have been reverted. So get the position again.
          stem = tipJoint;
        }
        position = this.getPosition(tipJoint, targetJoint, stem);
      }
      return {
        position: position,
        stem: stem
      };
    }

    _sticksOut(position) {
      var positionOffset, scrollOffset, sticksOut, viewportDimensions;
      scrollOffset = this.adapter.scrollOffset();
      viewportDimensions = this.adapter.viewportDimensions();
      positionOffset = [position.left - scrollOffset[0], position.top - scrollOffset[1]];
      sticksOut = [false, false];
      if (positionOffset[0] < 0) {
        sticksOut[0] = this.STICKS_OUT_LEFT;
      } else if (positionOffset[0] + this.dimensions.width > viewportDimensions.width) {
        sticksOut[0] = this.STICKS_OUT_RIGHT;
      }
      if (positionOffset[1] < 0) {
        sticksOut[1] = this.STICKS_OUT_TOP;
      } else if (positionOffset[1] + this.dimensions.height > viewportDimensions.height) {
        sticksOut[1] = this.STICKS_OUT_BOTTOM;
      }
      return sticksOut;
    }

    // This is by far the most complex and difficult function to understand. It
    // actually draws the canvas.

    // I tried to comment everything as good as possible.
    _draw() {
      var backgroundCanvas, bulge, canvasDimensions, canvasPosition, closeButton, closeButtonInner, closeButtonOuter, ctx, drawCorner, drawLine, hb, j, len, position, ref, ref1, stemBase, stemLength;
      // This function could be called before _buildElements()
      if (!(this.backgroundCanvas && this.redraw)) {
        return;
      }
      this.debug("Drawing background.");
      this.redraw = false;
      // Take care of the classes
      if (this.currentStem) {
        ref = ["top", "right", "bottom", "left"];
        for (j = 0, len = ref.length; j < len; j++) {
          position = ref[j];
          this.adapter.removeClass(this.container, `stem-${position}`);
        }
        this.adapter.addClass(this.container, `stem-${this.currentStem.horizontal}`);
        this.adapter.addClass(this.container, `stem-${this.currentStem.vertical}`);
      }
      // Prepare for the close button
      closeButtonInner = [0, 0];
      closeButtonOuter = [0, 0];
      if (indexOf.call(this.options.hideTriggers, "closeButton") >= 0) {
        closeButton = new Opentip.Joint(((ref1 = this.currentStem) != null ? ref1.toString() : void 0) === "top right" ? "top left" : "top right");
        closeButtonInner = [this.options.closeButtonRadius + this.options.closeButtonOffset[0], this.options.closeButtonRadius + this.options.closeButtonOffset[1]];
        closeButtonOuter = [this.options.closeButtonRadius - this.options.closeButtonOffset[0], this.options.closeButtonRadius - this.options.closeButtonOffset[1]];
      }
      // Now for the canvas dimensions and position
      canvasDimensions = this.adapter.clone(this.dimensions);
      canvasPosition = [0, 0];
      // Account for border
      if (this.options.borderWidth) {
        canvasDimensions.width += this.options.borderWidth * 2;
        canvasDimensions.height += this.options.borderWidth * 2;
        canvasPosition[0] -= this.options.borderWidth;
        canvasPosition[1] -= this.options.borderWidth;
      }
      // Account for the shadow
      if (this.options.shadow) {
        canvasDimensions.width += this.options.shadowBlur * 2;
        // If the shadow offset is bigger than the actual shadow blur, the whole canvas gets bigger
        canvasDimensions.width += Math.max(0, this.options.shadowOffset[0] - this.options.shadowBlur * 2);
        canvasDimensions.height += this.options.shadowBlur * 2;
        canvasDimensions.height += Math.max(0, this.options.shadowOffset[1] - this.options.shadowBlur * 2);
        canvasPosition[0] -= Math.max(0, this.options.shadowBlur - this.options.shadowOffset[0]);
        canvasPosition[1] -= Math.max(0, this.options.shadowBlur - this.options.shadowOffset[1]);
      }
      // * * *

      // Bulges could be caused by stems or close buttons
      bulge = {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
      };
      // Account for the stem
      if (this.currentStem) {
        if (this.currentStem.left) {
          bulge.left = this.options.stemLength;
        } else if (this.currentStem.right) {
          bulge.right = this.options.stemLength;
        }
        if (this.currentStem.top) {
          bulge.top = this.options.stemLength;
        } else if (this.currentStem.bottom) {
          bulge.bottom = this.options.stemLength;
        }
      }
      // Account for the close button
      if (closeButton) {
        if (closeButton.left) {
          bulge.left = Math.max(bulge.left, closeButtonOuter[0]);
        } else if (closeButton.right) {
          bulge.right = Math.max(bulge.right, closeButtonOuter[0]);
        }
        if (closeButton.top) {
          bulge.top = Math.max(bulge.top, closeButtonOuter[1]);
        } else if (closeButton.bottom) {
          bulge.bottom = Math.max(bulge.bottom, closeButtonOuter[1]);
        }
      }
      canvasDimensions.width += bulge.left + bulge.right;
      canvasDimensions.height += bulge.top + bulge.bottom;
      canvasPosition[0] -= bulge.left;
      canvasPosition[1] -= bulge.top;
      if (this.currentStem && this.options.borderWidth) {
        ({stemLength, stemBase} = this._getPathStemMeasures(this.options.stemBase, this.options.stemLength, this.options.borderWidth));
      }
      // Need to draw on the DOM canvas element itself
      backgroundCanvas = this.adapter.unwrap(this.backgroundCanvas);
      backgroundCanvas.width = canvasDimensions.width;
      backgroundCanvas.height = canvasDimensions.height;
      this.adapter.css(this.backgroundCanvas, {
        width: `${backgroundCanvas.width}px`,
        height: `${backgroundCanvas.height}px`,
        left: `${canvasPosition[0]}px`,
        top: `${canvasPosition[1]}px`
      });
      ctx = backgroundCanvas.getContext("2d");
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
      ctx.beginPath();
      ctx.fillStyle = this._getColor(ctx, this.dimensions, this.options.background, this.options.backgroundGradientHorizontal);
      ctx.lineJoin = "miter";
      ctx.miterLimit = 500;
      // Since borders are always in the middle and I want them outside I need to
      // draw the actual path half the border width outset.

      // (hb = half border)
      hb = this.options.borderWidth / 2;
      if (this.options.borderWidth) {
        ctx.strokeStyle = this.options.borderColor;
        ctx.lineWidth = this.options.borderWidth;
      } else {
        stemLength = this.options.stemLength;
        stemBase = this.options.stemBase;
      }
      if (stemBase == null) {
        stemBase = 0;
      }
      // Draws a line with stem if necessary
      drawLine = (length, stem, first) => {
        if (first) {
          // This ensures that the outline is properly closed
          ctx.moveTo(Math.max(stemBase, this.options.borderRadius, closeButtonInner[0]) + 1 - hb, -hb);
        }
        if (stem) {
          ctx.lineTo(length / 2 - stemBase / 2, -hb);
          ctx.lineTo(length / 2, -stemLength - hb);
          return ctx.lineTo(length / 2 + stemBase / 2, -hb);
        }
      };
      // Draws a corner with stem if necessary
      drawCorner = (stem, closeButton, i) => {
        var angle1, angle2, innerWidth, offset;
        if (stem) {
          ctx.lineTo(-stemBase + hb, 0 - hb);
          ctx.lineTo(stemLength + hb, -stemLength - hb);
          return ctx.lineTo(hb, stemBase - hb);
        } else if (closeButton) {
          offset = this.options.closeButtonOffset;
          innerWidth = closeButtonInner[0];
          if (i % 2 !== 0) {
            // Since the canvas gets rotated for every corner, but the close button
            // is always defined as [ horizontal, vertical ] offsets, I have to switch
            // the offsets in case the canvas is rotated by 90degs
            offset = [offset[1], offset[0]];
            innerWidth = closeButtonInner[1];
          }
          // Basic math

          // I added a graphical explanation since it's sometimes hard to understand 
          // geometrical calculations without visualization:
          // https://raw.github.com/enyo/opentip/develop/files/close-button-angle.png
          angle1 = Math.acos(offset[1] / this.options.closeButtonRadius);
          angle2 = Math.acos(offset[0] / this.options.closeButtonRadius);
          ctx.lineTo(-innerWidth + hb, -hb);
          // Firefox 3.6 requires the last boolean parameter (anticlockwise)
          return ctx.arc(hb - offset[0], -hb + offset[1], this.options.closeButtonRadius, -(Math.PI / 2 + angle1), angle2, false);
        } else {
          ctx.lineTo(-this.options.borderRadius + hb, -hb);
          return ctx.quadraticCurveTo(hb, -hb, hb, this.options.borderRadius - hb);
        }
      };
      // Start drawing without caring about the shadows or stems
      // The canvas position is exactly the amount that has been moved to account
      // for shadows and stems
      ctx.translate(-canvasPosition[0], -canvasPosition[1]);
      ctx.save();
      (() => { // Wrapping variables
        var cornerStem, i, k, lineLength, lineStem, positionIdx, positionX, positionY, ref2, results, rotation;

// This part is a bit funky...
// All in all I just iterate over all four corners, translate the canvas
// to it and rotate it so the next line goes to the right.
// This way I can call drawLine and drawCorner withouth them knowing which
// line their actually currently drawing.
        results = [];
        for (i = k = 0, ref2 = Opentip.positions.length / 2; (0 <= ref2 ? k < ref2 : k > ref2); i = 0 <= ref2 ? ++k : --k) {
          positionIdx = i * 2;
          positionX = i === 0 || i === 3 ? 0 : this.dimensions.width;
          positionY = i < 2 ? 0 : this.dimensions.height;
          rotation = (Math.PI / 2) * i;
          lineLength = i % 2 === 0 ? this.dimensions.width : this.dimensions.height;
          lineStem = new Opentip.Joint(Opentip.positions[positionIdx]);
          cornerStem = new Opentip.Joint(Opentip.positions[positionIdx + 1]);
          ctx.save();
          ctx.translate(positionX, positionY);
          ctx.rotate(rotation);
          drawLine(lineLength, lineStem.eql(this.currentStem), i === 0);
          ctx.translate(lineLength, 0);
          drawCorner(cornerStem.eql(this.currentStem), cornerStem.eql(closeButton), i);
          results.push(ctx.restore());
        }
        return results;
      })();
      ctx.closePath();
      ctx.save();
      if (this.options.shadow) {
        ctx.shadowColor = this.options.shadowColor;
        ctx.shadowBlur = this.options.shadowBlur;
        ctx.shadowOffsetX = this.options.shadowOffset[0];
        ctx.shadowOffsetY = this.options.shadowOffset[1];
      }
      ctx.fill();
      ctx.restore(); // Without shadow
      if (this.options.borderWidth) {
        ctx.stroke();
      }
      ctx.restore(); // Without shadow
      if (closeButton) {
        return (() => {
          var crossCenter, crossHeight, crossWidth, hcs, linkCenter;
          // Draw the cross
          crossWidth = crossHeight = this.options.closeButtonRadius * 2;
          if (closeButton.toString() === "top right") {
            linkCenter = [this.dimensions.width - this.options.closeButtonOffset[0], this.options.closeButtonOffset[1]];
            crossCenter = [linkCenter[0] + hb, linkCenter[1] - hb];
          } else {
            linkCenter = [this.options.closeButtonOffset[0], this.options.closeButtonOffset[1]];
            crossCenter = [linkCenter[0] - hb, linkCenter[1] - hb];
          }
          ctx.translate(crossCenter[0], crossCenter[1]);
          hcs = this.options.closeButtonCrossSize / 2;
          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = this.options.closeButtonCrossColor;
          ctx.lineWidth = this.options.closeButtonCrossLineWidth;
          ctx.lineCap = "round";
          ctx.moveTo(-hcs, -hcs);
          ctx.lineTo(hcs, hcs);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(hcs, -hcs);
          ctx.lineTo(-hcs, hcs);
          ctx.stroke();
          ctx.restore();
          // Position the link
          return this.adapter.css(this.closeButtonElement, {
            left: `${linkCenter[0] - hcs - this.options.closeButtonLinkOverscan}px`,
            top: `${linkCenter[1] - hcs - this.options.closeButtonLinkOverscan}px`,
            width: `${this.options.closeButtonCrossSize + this.options.closeButtonLinkOverscan * 2}px`,
            height: `${this.options.closeButtonCrossSize + this.options.closeButtonLinkOverscan * 2}px`
          });
        })();
      }
    }

    // I have to account for the border width when implementing the stems. The
    // tip height & width obviously should be added to the outer border, but
    // the path is drawn in the middle of the border.
    // If I just draw the stem size specified on the path, the stem will be
    // bigger than requested.

    // So I have to calculate the stemBase and stemLength of the **path**
    // stem.
    _getPathStemMeasures(outerStemBase, outerStemLength, borderWidth) {
      var angle, distanceBetweenTips, halfAngle, hb, rhombusSide, stemBase, stemLength;
      // Now for some math!

      //      /
      //     /|\
      //    / | angle
      //   /  |  \
      //  /   |   \
      // /____|____\
      hb = borderWidth / 2;
      // This is the angle of the tip
      halfAngle = Math.atan((outerStemBase / 2) / outerStemLength);
      angle = halfAngle * 2;
      // The rhombus from the border tip to the path tip
      rhombusSide = hb / Math.sin(angle);
      distanceBetweenTips = 2 * rhombusSide * Math.cos(halfAngle);
      stemLength = hb + outerStemLength - distanceBetweenTips;
      if (stemLength < 0) {
        throw new Error("Sorry but your stemLength / stemBase ratio is strange.");
      }
      // Now calculate the new base
      stemBase = (Math.tan(halfAngle) * stemLength) * 2;
      return {
        stemLength: stemLength,
        stemBase: stemBase
      };
    }

    // Turns a color string into a possible gradient
    _getColor(ctx, dimensions, color, horizontal = false) {
      var colorStop, gradient, i, j, len;
      if (typeof color === "string") {
        // There is no comma so just return
        return color;
      }
      // Create gradient
      if (horizontal) {
        gradient = ctx.createLinearGradient(0, 0, dimensions.width, 0);
      } else {
        gradient = ctx.createLinearGradient(0, 0, 0, dimensions.height);
      }
      for (i = j = 0, len = color.length; j < len; i = ++j) {
        colorStop = color[i];
        gradient.addColorStop(colorStop[0], colorStop[1]);
      }
      return gradient;
    }

    _searchAndActivateCloseButtons() {
      var element, j, len, ref;
      ref = this.adapter.findAll(this.container, `.${this.class.close}`);
      for (j = 0, len = ref.length; j < len; j++) {
        element = ref[j];
        this.hideTriggers.push({
          element: this.adapter.wrap(element),
          event: "click"
        });
      }
      if (this.currentObservers.showing) {
        // Creating the observers for the new close buttons
        this._setupObservers("-showing", "showing");
      }
      if (this.currentObservers.visible) {
        return this._setupObservers("-visible", "visible");
      }
    }

    _activateFirstInput() {
      var input;
      input = this.adapter.unwrap(this.adapter.find(this.container, "input, textarea"));
      return input != null ? typeof input.focus === "function" ? input.focus() : void 0 : void 0;
    }

    // Calls reposition() everytime the mouse moves
    _followMousePosition() {
      if (!this.options.fixed) {
        return Opentip._observeMousePosition(this.bound.reposition);
      }
    }

    // Removes observer
    _stopFollowingMousePosition() {
      if (!this.options.fixed) {
        return Opentip._stopObservingMousePosition(this.bound.reposition);
      }
    }

    // I thinks those are self explanatory
    _clearShowTimeout() {
      return clearTimeout(this._showTimeoutId);
    }

    _clearHideTimeout() {
      return clearTimeout(this._hideTimeoutId);
    }

    _clearTimeouts() {
      clearTimeout(this._visibilityStateTimeoutId);
      this._clearShowTimeout();
      return this._clearHideTimeout();
    }

    // Makes sure the trigger element exists, is visible, and part of this world.
    _triggerElementExists() {
      var el;
      el = this.adapter.unwrap(this.triggerElement);
      while (el.parentNode) {
        if (el.parentNode.tagName === "BODY") {
          return true;
        }
        el = el.parentNode;
      }
      // TODO: Add a check if the element is actually visible
      return false;
    }

    _loadAjax() {
      if (this.loading) {
        return;
      }
      this.loaded = false;
      this.loading = true;
      this.adapter.addClass(this.container, this.class.loading);
      // This will reset the dimensions so it has to be AFTER the `addClass` call
      // since the `loading` class might show a loading indicator that will change
      // the dimensions of the tooltip
      this.setContent("");
      this.debug(`Loading content from ${this.options.ajax}`);
      return this.adapter.ajax({
        url: this.options.ajax,
        method: this.options.ajaxMethod,
        onSuccess: (responseText) => {
          this.debug("Loading successful.");
          // This has to happen before setting the content since loading indicators
          // may still be visible.
          this.adapter.removeClass(this.container, this.class.loading);
          return this.setContent(responseText);
        },
        onError: (error) => {
          var message;
          message = this.options.ajaxErrorMessage;
          this.debug(message, error);
          this.setContent(message);
          return this.adapter.addClass(this.container, this.class.ajaxError);
        },
        onComplete: () => {
          this.adapter.removeClass(this.container, this.class.loading);
          this.loading = false;
          this.loaded = true;
          this._searchAndActivateCloseButtons();
          this._activateFirstInput();
          return this.reposition();
        }
      });
    }

    // Regularely checks if the element is still in the dom.
    _ensureTriggerElement() {
      if (!this._triggerElementExists()) {
        this.deactivate();
        return this._stopEnsureTriggerElement();
      }
    }

    // Sets up an interval to call _ensureTriggerElement regularely
    _startEnsureTriggerElement() {
      return this._ensureTriggerElementTimeoutId = setInterval((() => {
        return this._ensureTriggerElement();
      }), this._ensureTriggerElementInterval);
    }

    // Stops the interval
    _stopEnsureTriggerElement() {
      return clearInterval(this._ensureTriggerElementTimeoutId);
    }

  };

  Opentip.prototype.STICKS_OUT_TOP = 1;

  Opentip.prototype.STICKS_OUT_BOTTOM = 2;

  Opentip.prototype.STICKS_OUT_LEFT = 1;

  Opentip.prototype.STICKS_OUT_RIGHT = 2;

  Opentip.prototype.class = {
    container: "opentip-container",
    opentip: "opentip",
    header: "ot-header",
    content: "ot-content",
    loadingIndicator: "ot-loading-indicator",
    close: "ot-close",
    goingToHide: "ot-going-to-hide",
    hidden: "ot-hidden",
    hiding: "ot-hiding",
    goingToShow: "ot-going-to-show",
    showing: "ot-showing",
    visible: "ot-visible",
    loading: "ot-loading",
    ajaxError: "ot-ajax-error",
    fixed: "ot-fixed",
    showEffectPrefix: "ot-show-effect-",
    hideEffectPrefix: "ot-hide-effect-",
    stylePrefix: "style-"
  };

  // In milliseconds, how often opentip should check for the existance of the element
  Opentip.prototype._ensureTriggerElementInterval = 1000;

  return Opentip;

}).call(this);

// Utils
// -----
vendors = ["khtml", "ms", "o", "moz", "webkit"];

// Sets a sepcific css3 value for all vendors
Opentip.prototype.setCss3Style = function(element, styles) {
  var prop, results, value, vendor, vendorProp;
  element = this.adapter.unwrap(element);
  results = [];
  for (prop in styles) {
    if (!hasProp.call(styles, prop)) continue;
    value = styles[prop];
    if (element.style[prop] != null) {
      results.push(element.style[prop] = value);
    } else {
      results.push((function() {
        var j, len, results1;
        results1 = [];
        for (j = 0, len = vendors.length; j < len; j++) {
          vendor = vendors[j];
          vendorProp = `${this.ucfirst(vendor)}${this.ucfirst(prop)}`;
          if (element.style[vendorProp] != null) {
            results1.push(element.style[vendorProp] = value);
          } else {
            results1.push(void 0);
          }
        }
        return results1;
      }).call(this));
    }
  }
  return results;
};

// Defers the call
Opentip.prototype.defer = function(func) {
  return setTimeout(func, 0);
};

// Changes seconds to milliseconds
Opentip.prototype.setTimeout = function(func, seconds) {
  return setTimeout(func, seconds ? seconds * 1000 : 0);
};

// Turns only the first character uppercase
Opentip.prototype.ucfirst = function(string) {
  if (string == null) {
    return "";
  }
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// Converts a camelized string into a dasherized one
Opentip.prototype.dasherize = function(string) {
  return string.replace(/([A-Z])/g, function(_, character) {
    return `-${character.toLowerCase()}`;
  });
};

// Mouse position stuff.
mousePositionObservers = [];

mousePosition = {
  x: 0,
  y: 0
};

mouseMoved = function(e) {
  var j, len, observer, results;
  mousePosition = Opentip.adapter.mousePosition(e);
  results = [];
  for (j = 0, len = mousePositionObservers.length; j < len; j++) {
    observer = mousePositionObservers[j];
    results.push(observer());
  }
  return results;
};

Opentip.followMousePosition = function() {
  return Opentip.adapter.observe(document.body, "mousemove", mouseMoved);
};

// Called by opentips if they want updates on mouse position
Opentip._observeMousePosition = function(observer) {
  return mousePositionObservers.push(observer);
};

Opentip._stopObservingMousePosition = function(removeObserver) {
  var observer;
  return mousePositionObservers = (function() {
    var j, len, results;
    results = [];
    for (j = 0, len = mousePositionObservers.length; j < len; j++) {
      observer = mousePositionObservers[j];
      if (observer !== removeObserver) {
        results.push(observer);
      }
    }
    return results;
  })();
};

// Every position is converted to this class
Opentip.Joint = class Joint {
  // Accepts pointer in nearly every form.

  //   - "top left"
  //   - "topLeft"
  //   - "top-left"
  //   - "RIGHT to TOP"

  // All that counts is that the words top, bottom, left or right are present.

  // It also accepts a Pointer object, creating a new object then
  constructor(pointerString) {
    if (pointerString == null) {
      return;
    }
    if (pointerString instanceof Opentip.Joint) {
      pointerString = pointerString.toString();
    }
    this.set(pointerString);
    this;
  }

  set(string) {
    string = string.toLowerCase();
    this.setHorizontal(string);
    this.setVertical(string);
    return this;
  }

  setHorizontal(string) {
    var i, j, k, len, len1, results, valid;
    valid = ["left", "center", "right"];
    for (j = 0, len = valid.length; j < len; j++) {
      i = valid[j];
      if (~string.indexOf(i)) {
        this.horizontal = i.toLowerCase();
      }
    }
    if (this.horizontal == null) {
      this.horizontal = "center";
    }
    results = [];
    for (k = 0, len1 = valid.length; k < len1; k++) {
      i = valid[k];
      results.push(this[i] = this.horizontal === i ? i : void 0);
    }
    return results;
  }

  setVertical(string) {
    var i, j, k, len, len1, results, valid;
    valid = ["top", "middle", "bottom"];
    for (j = 0, len = valid.length; j < len; j++) {
      i = valid[j];
      if (~string.indexOf(i)) {
        this.vertical = i.toLowerCase();
      }
    }
    if (this.vertical == null) {
      this.vertical = "middle";
    }
    results = [];
    for (k = 0, len1 = valid.length; k < len1; k++) {
      i = valid[k];
      results.push(this[i] = this.vertical === i ? i : void 0);
    }
    return results;
  }

  // Checks if two pointers point in the same direction
  eql(pointer) {
    return (pointer != null) && this.horizontal === pointer.horizontal && this.vertical === pointer.vertical;
  }

  // Turns topLeft into bottomRight
  flip() {
    var flippedIndex, positionIdx;
    positionIdx = Opentip.position[this.toString(true)];
    // There are 8 positions, and smart as I am I layed them out in a circle.
    flippedIndex = (positionIdx + 4) % 8;
    this.set(Opentip.positions[flippedIndex]);
    return this;
  }

  toString(camelized = false) {
    var horizontal, vertical;
    vertical = this.vertical === "middle" ? "" : this.vertical;
    horizontal = this.horizontal === "center" ? "" : this.horizontal;
    if (vertical && horizontal) {
      if (camelized) {
        horizontal = Opentip.prototype.ucfirst(horizontal);
      } else {
        horizontal = ` ${horizontal}`;
      }
    }
    return `${vertical}${horizontal}`;
  }

};

// Returns true if top and left are equal
Opentip.prototype._positionsEqual = function(posA, posB) {
  return (posA != null) && (posB != null) && posA.left === posB.left && posA.top === posB.top;
};

// Returns true if width and height are equal
Opentip.prototype._dimensionsEqual = function(dimA, dimB) {
  return (dimA != null) && (dimB != null) && dimA.width === dimB.width && dimA.height === dimB.height;
};

// Just forwards to console.debug if Opentip.debug is true and console.debug exists.
Opentip.prototype.debug = function(...args) {
  if (Opentip.debug && ((typeof console !== "undefined" && console !== null ? console.debug : void 0) != null)) {
    args.unshift(`#${this.id} |`);
    return console.debug(...args);
  }
};


// Startup
// -------
Opentip.findElements = function() {
  var adapter, content, element, j, len, optionName, optionValue, options, ref, results;
  adapter = Opentip.adapter;
  ref = adapter.findAll(document.body, "[data-ot]");
  // Go through all elements with `data-ot="[...]"`
  results = [];
  for (j = 0, len = ref.length; j < len; j++) {
    element = ref[j];
    options = {};
    content = adapter.data(element, "ot");
    if (content === "" || content === "true" || content === "yes") {
      // Take the content from the title attribute
      content = adapter.attr(element, "title");
      adapter.attr(element, "title", "");
    }
    content = content || "";
    for (optionName in Opentip.styles.standard) {
      optionValue = adapter.data(element, `ot${Opentip.prototype.ucfirst(optionName)}`);
      if (optionValue != null) {
        if (optionValue === "yes" || optionValue === "true" || optionValue === "on") {
          optionValue = true;
        } else if (optionValue === "no" || optionValue === "false" || optionValue === "off") {
          optionValue = false;
        }
        options[optionName] = optionValue;
      }
    }
    results.push(new Opentip(element, content, options));
  }
  return results;
};

// Publicly available
// ------------------
Opentip.version = "2.4.7-dev";

Opentip.debug = false;

Opentip.lastId = 0;

Opentip.lastZIndex = 100;

Opentip.tips = [];

Opentip._abortShowingGroup = function(group, originatingOpentip) {
  var j, len, opentip, ref, results;
  ref = Opentip.tips;
  results = [];
  for (j = 0, len = ref.length; j < len; j++) {
    opentip = ref[j];
    if (opentip !== originatingOpentip && opentip.options.group === group) {
      results.push(opentip._abortShowing());
    } else {
      results.push(void 0);
    }
  }
  return results;
};

Opentip._hideGroup = function(group, originatingOpentip) {
  var j, len, opentip, ref, results;
  ref = Opentip.tips;
  results = [];
  for (j = 0, len = ref.length; j < len; j++) {
    opentip = ref[j];
    if (opentip !== originatingOpentip && opentip.options.group === group) {
      results.push(opentip.hide());
    } else {
      results.push(void 0);
    }
  }
  return results;
};

// A list of possible adapters. Used for testing
Opentip.adapters = {};

// The current adapter used.
Opentip.adapter = null;

firstAdapter = true;

Opentip.addAdapter = function(adapter) {
  Opentip.adapters[adapter.name] = adapter;
  if (firstAdapter) {
    Opentip.adapter = adapter;
    adapter.domReady(Opentip.findElements);
    adapter.domReady(Opentip.followMousePosition);
    return firstAdapter = false;
  }
};

Opentip.positions = ["top", "topRight", "right", "bottomRight", "bottom", "bottomLeft", "left", "topLeft"];

Opentip.position = {};

ref = Opentip.positions;
for (i = j = 0, len = ref.length; j < len; i = ++j) {
  position = ref[i];
  Opentip.position[position] = i;
}

// The standard style.
Opentip.styles = {
  standard: {
    
    // This config is not based on anything
    extends: null,
    // This style also contains all default values for other styles.

    // Following abbreviations are used:

    // - `POINTER` : a string that contains at least one of top, bottom, right or left
    // - `OFFSET` : [ XVALUE, YVALUE ] (integers)
    // - `ELEMENT` : element or element id

    // Will be set if provided in constructor
    title: void 0,
    // Whether the provided title should be html escaped
    escapeTitle: true,
    // Whether the content should be html escaped
    escapeContent: false,
    // The class name to be added to the HTML element
    className: "standard",
    // - `false` (no stem)
    // - `true` (stem at tipJoint position)
    // - `POINTER` (for stems in other directions)
    stem: true,
    // `float` (in seconds)
    // If null, the default is used: 0.2 for mouseover, 0 for click
    delay: null,
    // See delay
    hideDelay: 0.1,
    // If target is not null, elements are always fixed.
    fixed: false,
    // - eventname (eg: `"click"`, `"mouseover"`, etc..)
    // - `"creation"` (the tooltip will show when being created)
    // - `null` if you want to handle it yourself (Opentip will not register for any events)
    showOn: "mouseover",
    // - `"trigger"`
    // - `"tip"`
    // - `"target"`
    // - `"closeButton"`
    // - `"outside"` Somewhere outside the trigger or tip (Makes really only sense with the click event)
    // - `ELEMENT`

    // This is just a shortcut, and will be added to hideTriggers if hideTrigger
    // is an empty array
    hideTrigger: "trigger",
    // An array of hideTriggers.
    hideTriggers: [],
    // - eventname (eg: `"click"`)
    // - array of event strings if multiple hideTriggers
    // - `null` (let Opentip decide)
    hideOn: null,
    // Removes all HTML elements from DOM when an Opentip is hidden if true
    removeElementsOnHide: false,
    // `OFFSET`
    offset: [0, 0],
    // Whether the targetJoint/tipJoint should be changed if the tooltip is not in the viewport anymore.
    containInViewport: true,
    // If set to true, offsets are calculated automatically to position the tooltip. (pixels are added if there are stems for example)
    autoOffset: true,
    showEffect: "appear",
    hideEffect: "fade",
    showEffectDuration: 0.3,
    hideEffectDuration: 0.2,
    // integer
    stemLength: 5,
    // integer
    stemBase: 8,
    // `POINTER`
    tipJoint: "top left",
    // - `null` (no target, opentip uses mouse as target)
    // - `true` (target is the triggerElement)
    // - `ELEMENT` (for another element)
    target: null,
    
    // - `POINTER` (Ignored if target == `null`)
    // - `null` (targetJoint is the opposite of tipJoint)
    targetJoint: null,
    
    // If off and the content gets downloaded with AJAX, it will be downloaded
    // every time the tooltip is shown. If the content is a function, the function
    // will be executed every time.
    cache: true,
    // ajaxCache: on # Deprecated in favor of cache.

    // AJAX URL
    // Set to `false` if no AJAX or `true` if it's attached to an `<a />`
    // element. In the latter case the `href` attribute will be used.
    ajax: false,
    // Which method should AJAX use.
    ajaxMethod: "GET",
    // The message that gets displayed if the content couldn't be downloaded.
    ajaxErrorMessage: "There was a problem downloading the content.",
    // You can group opentips together. So when a tooltip shows, it looks if there are others in the same group, and hides them.
    group: null,
    // Will be set automatically in constructor
    style: null,
    // The background color of the tip
    background: "#fff18f",
    // Whether the gradient should be horizontal.
    backgroundGradientHorizontal: false,
    // Positive values offset inside the tooltip
    closeButtonOffset: [5, 5],
    // The little circle that stick out of a tip
    closeButtonRadius: 7,
    // Size of the cross
    closeButtonCrossSize: 4,
    // Color of the cross
    closeButtonCrossColor: "#d2c35b",
    // The stroke width of the cross
    closeButtonCrossLineWidth: 1.5,
    // You will most probably never want to change this.
    // It specifies how many pixels the invisible <a> element should be larger
    // than the actual cross
    closeButtonLinkOverscan: 6,
    // Border radius...
    borderRadius: 5,
    // Set to 0 or false if you don't want a border
    borderWidth: 1,
    // Normal CSS value
    borderColor: "#f2e37b",
    // Set to false if you don't want a shadow
    shadow: true,
    // How the shadow should be blurred. Set to 0 if you want a hard drop shadow 
    shadowBlur: 10,
    // Shadow offset...
    shadowOffset: [3, 3],
    // Shadow color...
    shadowColor: "rgba(0, 0, 0, 0.1)"
  },
  glass: {
    extends: "standard",
    className: "glass",
    background: [[0, "rgba(252, 252, 252, 0.8)"], [0.5, "rgba(255, 255, 255, 0.8)"], [0.5, "rgba(250, 250, 250, 0.9)"], [1, "rgba(245, 245, 245, 0.9)"]],
    borderColor: "#eee",
    closeButtonCrossColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 15,
    closeButtonRadius: 10,
    closeButtonOffset: [8, 8]
  },
  dark: {
    extends: "standard",
    className: "dark",
    borderRadius: 13,
    borderColor: "#444",
    closeButtonCrossColor: "rgba(240, 240, 240, 1)",
    shadowColor: "rgba(0, 0, 0, 0.3)",
    shadowOffset: [2, 2],
    background: [[0, "rgba(30, 30, 30, 0.7)"], [0.5, "rgba(30, 30, 30, 0.8)"], [0.5, "rgba(10, 10, 10, 0.8)"], [1, "rgba(10, 10, 10, 0.9)"]]
  },
  alert: {
    extends: "standard",
    className: "alert",
    borderRadius: 1,
    borderColor: "#AE0D11",
    closeButtonCrossColor: "rgba(255, 255, 255, 1)",
    shadowColor: "rgba(0, 0, 0, 0.3)",
    shadowOffset: [2, 2],
    background: [[0, "rgba(203, 15, 19, 0.7)"], [0.5, "rgba(203, 15, 19, 0.8)"], [0.5, "rgba(189, 14, 18, 0.8)"], [1, "rgba(179, 14, 17, 0.9)"]]
  }
};

// Change this to the style name you want all your tooltips to have as default.
Opentip.defaultStyle = "standard";

if (typeof module !== "undefined" && module !== null) {
  module.exports = Opentip;
} else {
  window.Opentip = Opentip;
}
