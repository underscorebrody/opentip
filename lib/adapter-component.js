// Component Opentip Adapter
// ======================

// Uses github.com/component components
var $, Adapter, ref;

$ = (ref = window.jQuery) != null ? ref : require("jquery");

// The adapter class
module.exports = Adapter = (function() {
  class Adapter {
    // Simply using $.domReady
    domReady(callback) {
      return $(callback);
    }

    // DOM
    // ===

    // Using bonzo to create html
    create(html) {
      return $(html);
    }

    // Element handling
    // ----------------

    // Wraps the element in ender
    wrap(element) {
      element = $(element);
      if (element.length > 1) {
        throw new Error("Multiple elements provided.");
      }
      return element;
    }

    // Returns the unwrapped element
    unwrap(element) {
      return $(element)[0];
    }

    // Returns the tag name of the element
    tagName(element) {
      return this.unwrap(element).tagName;
    }

    // Returns or sets the given attribute of element

    // It's important not to simply forward name and value because the value
    // is set whether or not the value argument is present
    attr(element, ...args) {
      return $(element).attr(...args);
    }

    // Returns or sets the given data of element
    // It's important not to simply forward name and value because the value
    // is set whether or not the value argument is present
    data(element, ...args) {
      return $(element).data(...args);
    }

    // Finds elements by selector
    find(element, selector) {
      return $(element).find(selector)[0];
    }

    // Finds all elements by selector
    findAll(element, selector) {
      return $(element).find(selector);
    }

    // Updates the content of the element
    update(element, content, escape) {
      element = $(element);
      if (escape) {
        return element.text(content);
      } else {
        return element.html(content);
      }
    }

    // Appends given child to element
    append(element, child) {
      return $(element).append(child);
    }

    // Removes element
    remove(element) {
      return $(element).remove();
    }

    // Add a class
    addClass(element, className) {
      return $(element).addClass(className);
    }

    // Remove a class
    removeClass(element, className) {
      return $(element).removeClass(className);
    }

    // Set given css properties
    css(element, properties) {
      return $(element).css(properties);
    }

    // Returns an object with given dimensions
    dimensions(element) {
      return {
        width: $(element).outerWidth(),
        height: $(element).outerHeight()
      };
    }

    // Returns the scroll offsets of current document
    scrollOffset() {
      return [window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft, window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop];
    }

    // Returns the dimensions of the viewport (currently visible browser area)
    viewportDimensions() {
      return {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight
      };
    }

    // Returns an object with x and y
    mousePosition(e) {
      if (e == null) {
        return null;
      }
      return {
        x: e.pageX,
        y: e.pageY
      };
    }

    // Returns the offset of the element
    offset(element) {
      var offset;
      offset = $(element).offset();
      return {
        left: offset.left,
        top: offset.top
      };
    }

    // Observe given eventName
    observe(element, eventName, observer) {
      return $(element).on(eventName, observer);
    }

    // Stop observing event
    stopObserving(element, eventName, observer) {
      return $(element).off(eventName, observer);
    }

    // Perform an AJAX request and call the appropriate callbacks.
    ajax(options) {
      var ref1, ref2;
      if (options.url == null) {
        throw new Error("No url provided");
      }
      return $.ajax({
        url: options.url,
        type: (ref1 = (ref2 = options.method) != null ? ref2.toUpperCase() : void 0) != null ? ref1 : "GET"
      }).done(function(content) {
        return typeof options.onSuccess === "function" ? options.onSuccess(content) : void 0;
      }).fail(function(request) {
        return typeof options.onError === "function" ? options.onError(`Server responded with status ${request.status}`) : void 0;
      }).always(function() {
        return typeof options.onComplete === "function" ? options.onComplete() : void 0;
      });
    }

    // Utility functions
    // =================

    // Creates a shallow copy of the object
    clone(object) {
      return $.extend({}, object);
    }

    // Copies all properties from sources to target
    extend(target, ...sources) {
      return $.extend(target, ...sources);
    }

  };

  Adapter.prototype.name = "component";

  return Adapter;

}).call(this);
