//
// This code needs major refactoring, documentation and care.
// It will be given in the coming months if usage is high enough.
// It will probably end up on public GitHub in that case.
//
// Author: Erik Stel (ErikOnBike at github)
// 
!function() {
	if(typeof require === "function" && !this.d3) {
		this.d3 = require("d3");
	}

	var tp = {};
	var tp_internals = {};

	// Initialize
	tp_internals.initializers = [];
	tp_internals.externalInitializers = [];
	tp_internals.windowResizeHandlers = [];
	tp_internals.dialogs = {
		namedDialogs: {}
	};
	tp_internals.controls = {
		inputIDPrefix: "tp_uid_",
		inputIDCounter: 1,
		getNextInputID: function() {
			return tp_internals.controls.inputIDPrefix + tp_internals.controls.inputIDCounter++;
		}
	};
	tp_internals.opposite = {
		"left": "right",
		"right": "left",
		"top": "bottom",
		"bottom": "top"
	};
	tp_internals.dialogButtons = [
		{ type: "message", buttons: [
			{ id: "ok", icon: "check", default: true }
		] },
		{ type: "confirm", buttons: [
			{ id: "ok", icon: "check" },
			{ id: "cancel", icon: "close", default: true }
		] },
		{ type: "select", buttons: [
			{ id: "ok", icon: "check" },
			{ id: "cancel", icon: "close", default: true }
		] },
		{ type: "input", buttons: [
			{ id: "ok", icon: "check", default: true },
			{ id: "cancel", icon: "close" }
		] },
		{ type: "sign-in", buttons: [
			{ id: "ok", icon: "check", default: true },
			{ id: "cancel", icon: "close" }
		] },
		{ type: "change-password", buttons: [
			{ id: "ok", icon: "check", default: true },
			{ id: "cancel", icon: "close" }
		] },
		{ type: "user-settings", buttons: [
			{ id: "ok", icon: "check", default: true },
			{ id: "cancel", icon: "close" }
		] },
		{ type: "download", buttons: [
			{ id: "close", icon: "close", default: true }
		] },
		{ type: "upload", buttons: [
			{ id: "close", icon: "close", default: true }
		] },
		{ type: "progress", buttons: [] }
	];
	tp_internals.selectionIcons = {
		checkbox: { checked: "check_box", unchecked: "check_box_outline_blank" },
		radiobutton: { checked: "radio_button_checked", unchecked: "radio_button_unchecked" }
	};
	tp_internals.loadingResources = 0;
	tp_internals.hasSessionStorage = function() {
		var testStorage = function(type) {
			var storage = window[type];
			if(!(storage && typeof storage.getItem === "function")) {
				return false;
			}
			storage.setItem("test123", "123");
			var result = storage.getItem("test123");
			storage.removeItem("test123");
			return result === "123";
		};
		return testStorage("localStorage") && testStorage("sessionStorage");
	};
	tp_internals.urlParser = document.createElement("a");

	// Class and object construction
	// Code is adopted from http://www.ruzee.com/blog/2008/12/javascript-inheritance-via-prototypes-and-closures/
	(function(){
		var isFunction = function(fn) {
			return typeof fn === "function";
		};
		Class = function() {
			// Empty prototype for base classes
		};
		Class.create = function(proto) {

			// Create new constructor
			var constructor = function(magic) {

				// Call init only if there is no magic cookie
				if(magic !== isFunction && isFunction(this.initialize)) {
					this.initialize.apply(this, arguments);
				}
			};

			// Create new prototype ('this' is either empty base prototype or super class prototype)
			constructor.prototype = new this(isFunction);	// Use our private method as magic cookie

			// Copy properties from prototype supplied
			Object.keys(proto).forEach(function(key) {

				// Define (overridden) method
				if(isFunction(proto[key]) && isFunction(constructor.prototype[key])) {

					// Create closure to create context containing a reference to the super(class) method
					(function(property, superProperty) {

						// Create invocation of method and let '_super' refer to method of superclass
						// Effectively every method (which overrides) is prefixed with setting '_super'
						// to point to the overwritten method, so this overridden method can be called.
						constructor.prototype[key] = function() {
							this._super = superProperty;
							return property.apply(this, arguments);
						};
					})(proto[key], constructor.prototype[key]);

				// Define property on prototype
				} else if(typeof proto[key] === "object" && (isFunction(proto[key].get) || isFunction(proto[key].set))) {
					Object.defineProperty(constructor.prototype, key, proto[key]);

				// Define direct value on prototype
				} else {
					constructor.prototype[key] = proto[key];
				}
			});

			// Set constructor on class and add extend method
			constructor.prototype.constructor = constructor;
			constructor.extend = this.extend || this.create;

			// Return constructor to allow instances to be created (using new)
			return constructor;
		};
	})();

	// DOM methods
	function tp_dom_getRelativePosition(domElement) {
		return domElement.offsetParent ? { top: domElement.offsetTop, left: domElement.offsetLeft } : { top: 0, left: 0 };
	}
	function tp_dom_getActualPosition(domElement) {
		var position = { top: 0, left: 0 };
		do {
			var positionWithinParent = tp_dom_getRelativePosition(domElement);
			position.top += positionWithinParent.top;
			position.left += positionWithinParent.left;
			domElement = domElement.offsetParent;
		} while(domElement);
		return position;
	}
	function tp_dom_getStyleValue(domElement, style) {
		var value = d3.select(domElement).style(style);
		if(value !== undefined && value !== null) {
			return parseFloat(value);
		}
		return null;
	}
	function tp_dom_getViewPortSize(size, horizontal) {
		var useWidth = horizontal === undefined || horizontal;
		return tp_util_round(size / tp_dom_getStyleValue(document.body, useWidth ? "width" : "height") * 100, 4);
	}
	function tp_dom_getViewPortStyleSize(domElement, style, horizontal) {
		var useWidth = horizontal === undefined || horizontal;
		return tp_dom_getViewPortSize(tp_dom_getStyleValue(domElement, style), useWidth) + (useWidth ? "vw" : "vh");
	}
	function tp_dom_appendSibling(newNode, existingSibling) {
		var parentNode = existingSibling.parentNode;
		if(existingSibling.nextSibling) {
			newNode = parentNode.insertBefore(newNode, existingSibling.nextSibling);
		} else {
			newNode = parentNode.appendChild(newNode);
		}
		return newNode;
	}
	function tp_dom_nearest(type, domElement) {
		var typeTagName = type.toUpperCase();
		var node = domElement.parentNode;
		while(node !== null) {
			if(node.tagName === typeTagName) {
				return node;
			}
			node = node.parentNode;
		}
		return null;
	}
	function tp_dom_updateTabIndices(show, selection) {
		if(selection === undefined) {
			selection = d3.select("body");
		}
		selection.selectAll("[tabindex]").each(function() {
			var element = d3.select(this);
			var tabIndex = tp_util_toNumber(element.attr("tabindex"));
			tabIndex += 1000 * (show ? 1 : -1);
			element.attr("tabindex", tabIndex);
		});
	}
	function tp_dom_move(domElement, destination) {
		var element = d3.select(domElement).remove();
		return d3.select(destination).append(function() { return element.node(); }).node();
	}
	function tp_dom_copyDataAttributes(domSourceElement, domTargetElement) {
		var attributes = tp_dom_collectAttributes(domSourceElement);
		var dataAttributes = attributes.filter(function(attribute) { return attribute.localName.indexOf("data-") === 0; });
		dataAttributes.forEach(function(attribute) {
			if(attribute.namespace) {
				domTargetElement.setAttributeNS(attribute.namespace, attribute.localName, attribute.value);
			} else {
				domTargetElement.setAttribute(attribute.localName, attribute.value);
			}
		});
	}
	function tp_dom_collectAttributes(domElement) {
		if(!domElement || !domElement.hasAttributes()) {
			return [];
		}
		var attributes = [];
		var attributeNameRegEx = /^((.*):)?(.*)$/;
		for(var i = 0; i < domElement.attributes.length; i++) {
			var attribute = domElement.attributes[i];
			var attributeNames = attributeNameRegEx.exec(attribute.name);
			if(attributeNames && attributeNames.length >= 4) {
				attributes.push({
					qualifiedName: attributeNames[0],
					namespace: attributeNames[2],
					localName: attributeNames[3],
					value: attribute.value
				});
			} else {
				attributes.push({
					qualifiedName: attribute.name,
					namespace: null,
					localName: attribute.name,
					value: attribute.value
				});
			}
		}
		return attributes;
	}

	// Expose DOM methods
	tp.dom = {
		getActualPosition: tp_dom_getActualPosition,
		getRelativePosition: tp_dom_getRelativePosition,
		getStyleValue: tp_dom_getStyleValue,
		getViewPortStyleSize: tp_dom_getViewPortStyleSize
	};

	// D3 methods
	function tp_d3_updateInput(inputElement, newValue, valueProperty) {
		if(!valueProperty) {
			valueProperty = "value";
		}
		var currentValue = inputElement.attr(valueProperty);
		if(currentValue !== newValue) {
			inputElement.attr(valueProperty, newValue);
			tp_d3_callAllHandlers(inputElement.node(), "change");
		}
	}
	function tp_d3_callAllHandlers(node, eventName, args) {
		var nameRegExp = new RegExp("^__on" + tp_util_escapeRegExp(eventName) + "(\\..*)?$");
		Object.keys(node).forEach(function(key) {
			if(nameRegExp.test(key)) {
				node[key].apply(node, args);
			}
		});
	}
	function tp_d3_copyDataAttributes(selection, sourceSelection) {
		tp_dom_copyDataAttributes(sourceSelection.node(), selection.node());
	}
	function tp_d3_makeResponsive(selection, style) {
		selection.style(style, tp_dom_getViewPortStyleSize(selection.node(), style));
	}
	function tp_d3_makeKeyboardSelectable(selection) {
		selection.attr("tabindex", "0");
	}
	function tp_d3_onKeyboardSelect(selection) {
		selection.on("keydown", function() {
			if(tp_util_modifierPressed(d3.event)) {
				return;
			}
			var keyCode = d3.event.keyCode;
			if(keyCode === 13 || keyCode === 32) {	// ENTER or Space
				var clickHandler = d3.select(this).on("click");
				if(clickHandler) {
					clickHandler.apply(this, arguments);
				}
				d3.event.preventDefault();
			}
		});
	}
	function tp_d3_toggleSlider(selection) {
		slidePaneToggle(selection);
	}

	// Expose D3 methods
	tp.d3 = {
		updateInput: tp_d3_updateInput,
		toggleSlider: tp_d3_toggleSlider
	};

	// Dialog methods
	function tp_dialogs_loadDialogs(htmlFile) {
		tp_internals.loadingResources++;
		d3.html(htmlFile, function(error, documentFragment) {
			if(!error && documentFragment) {
				d3.select(documentFragment)
					.call(tp_dialogs_updateDialogs)
					.selectAll("div.dialog").each(function() {
						var dialog = d3.select(this);
						var name = dialog.attr("id");
						if(name) {
							dialog.attr("id", null);	// Remove ID so multiple dialogs can be created without conflict
							tp_internals.dialogs.namedDialogs[name] = dialog.remove();
						}
					})
				;
			}

			// Trigger ready state to perform initializers
			tp_internals.loadingResources--;
			d3.select(document).on("readystatechange").apply(document);
		});
	}
	function tp_dialogs_updateDialogs(selection) {

		// Update dialog appearance
		selection.selectAll("div.dialog").each(function() {
			var dialog = d3.select(this);

			// Prepend header area for moving (dragging) dialog
			dialog.insert("div", "*")
				.attr("class", "header")
			;

			// Append footer area for buttons
			dialog.append("div")
				.attr("class", "footer")
			;
		});
	}
	function tp_dialogs_getButtons(dialog) {
		var dialogButtons = tp_internals.dialogButtons.find(function(each) {
			return dialog.classed(each.type);
		});
		return dialogButtons ? dialogButtons.buttons : [];
	}
	function tp_dialogs_createDialogButtons(dialog, buttons, dispatch) {
		var defaultButton = null;
		dialog.select("div.footer")
			.append("table")
				.attr("class", "buttons text-unselectable")
				.style("width", "100%")
				.append("tr")
					.selectAll("td").data(buttons)
					.enter()
						.append("td")
							.style("text-align", "center")
							.style("width", Math.floor(100 / buttons.length) + "%")
							.append("button")
								.attr("class", "icon large")
								.attr("data-id", function(d) { return d.id; })
								.attr("data-icon", function(d) { return d.icon; })
								.call(tp_d3_makeKeyboardSelectable)
								.each(function(d) {
									if(d.default) {
										defaultButton = d3.select(this);
										this.focus();	// Give default button focus
									}
								})
								.call(tp_dialogs_addButtonBehavior, dialog, dispatch)
		;
		return defaultButton;
	}
	function tp_dialogs_addButtonBehavior(selection, dialog, dispatch) {
		selection
			.on("click", function() {
				var id = d3.select(this).attr("data-id");
				this.blur();
				var node = dialog.node();
				var listener = dispatch.on(id);
				if(!listener || listener.apply(node) !== false) {
					tp_dialogs_closeDialog(dialog);
				}
			})
			.call(tp_d3_onKeyboardSelect)
		;
	}
	function tp_dialogs_addDragBehavior(dialog) {

		// Drag behavior for dialog
		var draggable = d3.behavior.drag()
			.on("dragstart", function() {
				var header = d3.select(this);
				var dialog = d3.select(this.parentNode);

				// Add dialog info to header datum
				header.datum({
					offset: d3.mouse(this)
				});

				// Highlight dialog
				dialog.classed("dragging", true);
			})
			.on("drag", function() {
				var header = d3.select(this);
				var dialog = d3.select(this.parentNode);

				// Calculate new position (based on modal which is parent of dialog)
				var position = d3.mouse(this.parentNode.parentNode);

				// Update position (make it responsive)
				dialog
					.style("left", tp_dom_getViewPortSize(position[0] - header.datum().offset[0], true) + "vw")
					.style("top", tp_dom_getViewPortSize(position[1] - header.datum().offset[1], false) + "vh")
				;
			})
			.on("dragend", function() {

				// Remove highlight from dialog
				var dialog = d3.select(this.parentNode);
				dialog.classed("dragging", false);
			})
		;

		dialog.select("div.header").call(draggable);
	}
	function tp_dialogs_addIgnoreCheckBox(dialog, properties) {
		if(properties && properties.name && properties.value && properties.form) {
			dialog.select("input")
				.attr("name", properties.name)
				.attr("value", properties.value)
				.attr("form", properties.form)
			;
		} else {
			console.error("No properties defined for ignorableMessageDialog");
		}
	}
	function tp_dialogs_isIgnored(dialog, properties) {
		if(dialog.classed("ignorable") && properties && properties.name && properties.value && properties.form) {
			if(d3.select("#" + properties.form + " input[name=" + properties.name + "]").property("value").split(",").indexOf(properties.value) >= 0) {
				return true;
			}
		}
		return false;
	}
	function tp_dialogs_addOptionsRadioButtons(dialog, properties) {
		if(properties && properties.options) {
			dialog.select(".radiobutton-group").selectAll("input").data(properties.options)
				.enter()
					.append("input")
						.attr("type", "radiobutton")
						.attr("name", "choice")
						.attr("value", function(d) { return d.value; })
						.attr("checked", function(d) { return d.value === properties.default ? "" : null; })
						.attr("data-text", function(d) { return d.text; })
			;
		} else {
			console.error("No properties defined for selectDialog");
		}
	}
	function tp_dialogs_showDialog(name, content, properties) {
		var namedDialog = tp_internals.dialogs.namedDialogs[name];
		if(!namedDialog) {
			return null;
		}

		// Test if dialog is ignored
		if(tp_dialogs_isIgnored(namedDialog, properties)) {
			return null;
		}

		// Remove tabindex from all elements
		tp_dom_updateTabIndices(false);

		// Create dialog by appending a copy of the stored dialog to the screen
		var screen = d3.select("#screen");
		var dialog = screen
			.append("div")
				.attr("class", "modal")
				.append(function() { return namedDialog.node().cloneNode(true); })
		;
		dialog.datum({});

		// Add buttons (and events) and drag behavior to dialog
		var buttons = tp_dialogs_getButtons(dialog);
		var dispatch = d3.dispatch.apply(dialog.node(), buttons.map(function(button) { return button.id; }));
		var defaultButton = tp_dialogs_createDialogButtons(dialog, buttons, dispatch);
		tp_dialogs_addDragBehavior(dialog);

		// Add check box to ignore message for ignorable messages
		if(dialog.classed("ignorable")) {
			tp_dialogs_addIgnoreCheckBox(dialog, properties);
		}

		// Add radio buttons to allow selection in select dialog
		if(dialog.classed("select")) {
			tp_dialogs_addOptionsRadioButtons(dialog, properties);
		}

		// Initialize radio and check buttons
		initializeRadioButtonControls(dialog);
		initializeCheckBoxControls(dialog);

		// Give default option focus
		var selectedRadioButton = dialog.select(".input.radiobutton.selected");
		if(selectedRadioButton.size() === 1) {
			selectedRadioButton.node().focus();
		}

		var handleEnter = function(selection) {
			selection
				.on("keydown.input", function() {
					var keyCode = d3.event.keyCode;
					if(keyCode === 13) {	// ENTER
						d3.event.preventDefault();
						if(defaultButton) {
							defaultButton.on("click").apply(defaultButton.node(), defaultButton.datum());
						}
					}
				})
			;
		};

		// Add input if remembered
		if(dialog.classed("input")) {
			dialog.select("input[name=input]")
				.call(handleEnter)
				.property("value", properties.input || "")
				.node().focus()
			;
		}

		// Add e-mail address if remembered
		if(dialog.classed("sign-in")) {
			dialog.select("input[name=password]")
				.call(handleEnter)
				.property("value", "")
			;
			dialog.select("input[name=email]")
				.call(handleEnter)
				.property("value", properties.email || "")
				.node().focus()
			;
		}

		// Set text to dialog (creating its size)
		dialog
			.select("span.content")
				.attr("data-text", content)
		;
		initializeTextFields(dialog);
		initializeTooltips(dialog);

		// Update position now size is set (center dialog) and make it responsive
		dialog
			.style("left", function() { return tp_dom_getViewPortSize((tp_dom_getStyleValue(screen.node(), "width") - tp_dom_getStyleValue(this, "width")) / 2, true) + "vw"; })
			.style("top", function() { return tp_dom_getViewPortSize((tp_dom_getStyleValue(screen.node(), "height") - tp_dom_getStyleValue(this, "height")) / 2, false) + "vh"; })
		;

		// Extend dispatch
		tp_dialogs_extendDispatch(dispatch, dialog);

		// Answer event dispatcher
		return dispatch;
	}
	function tp_dialogs_extendDispatch(dispatch, dialog) {

		// Refer to dialog
		dispatch.target = dialog;
	}
	function tp_dialogs_closeDialog(dialog) {
		var result = null;
		if(dialog.classed("dialog")) {

			// Remove controller
			var dialogProperties = dialog.datum();
			if(dialogProperties.controller) {
				dialogProperties.controller.destroy();
			}

			// Remove dialog (and if present modal parent)
			var modal = d3.select(dialog.node().parentNode);
			result = dialog.remove();
			if(modal.classed("modal")) {
				modal.remove();
			}

			// Restore tabindex for all elements
			tp_dom_updateTabIndices(true);
		}
		return result ? result.node() : null;
	}
	function tp_dialogs_closeDialogWithMessage(dialog, name, content, properties) {
		var dispatch = tp_dialogs_showDialog(name, content, properties);
		dispatch.on("ok", function() {
			// Close dialogs in correct order (will not be the case if dialog is closed first)
			tp_dialogs_closeDialog(dispatch.target);
			tp_dialogs_closeDialog(dialog);
			return false;
		});
	}

	// Expose dialog methods
	tp.dialogs = {
		loadDialogs: tp_dialogs_loadDialogs,
		showDialog: tp_dialogs_showDialog,
		closeDialog: tp_dialogs_closeDialog,
		closeDialogWithMessage: tp_dialogs_closeDialogWithMessage
	};

	// Model View Controller
	var Model = Class.create({

		// Constructor
		initialize: function(valueElement) {
			this._valueElement = valueElement;
			if(this._valueElement.attr("value") === null) {
				this._valueElement.attr("value", "");
			}
		},

		// Public instance variables
		value: {
			get: function() {
				return this.getValue();
			},
			set: function(newValue) {

				// Set value and determine if it really changed afterwards (prevents early conversions for numbers/booleans/etc)
				var previousValue = this.getValue();
				this.setValue(newValue);
				if(!tp_util_equals(this.getValue(), previousValue)) {
					tp_d3_callAllHandlers(this._valueElement.node(), "change");
				}
			}
		},

		// Public methods
		getValue: function() {
			return this._valueElement.attr("value");
		},
		setValue: function(newValue) {
			return this._valueElement.attr("value", newValue);
		},
		getValueAsNumber: function() {
			return +this.getValue();
		},
		on: function() {
			this._valueElement.on.apply(this._valueElement, arguments);
		},
		destroy: function() {
			this._valueElement = null;
		}
	});
	var RangeModel = Model.extend({

		// Constructor
		initialize: function(valueElement) {
			this._super(valueElement);

			// Set default step value
			if(this._valueElement.attr("step") === null) {
				this._valueElement.attr("step", 1);
			}

			// Normalize max value (put it on step boundary)
			this._valueElement.attr("max", this._normalize(this.max));
		},

		// Public instance variables
		min: {
			get: function() {
				return +this._valueElement.attr("min");
			}
		},
		max: {
			get: function() {
				return +this._valueElement.attr("max");
			},
			set: function(newMax) {
				this._valueElement.attr("max", newMax);
			}
		},
		step: {
			get: function() {
				return +this._valueElement.attr("step");
			}
		},

		// Public methods
		getValue: function() {
			var values = this._super();
			var numericValues = values.split(",").map(function(value) {
				return +value;
			});
			return numericValues;
		},
		setValue: function(newValue) {
			var self = this;
			var normalizedValues = newValue.map(function(value) {
				return self._normalize(value);
			});
			return this._super(normalizedValues.join(","));
		},
		valueFromRange: function(value, min, max) {

			// Transpose value to a value within the receivers range
			var relativePosition = (value - min) / (max - min);
			return this._normalize(this.min + (this.max - this.min) * relativePosition);
		},
		valueForRange: function(index, min, max) {

			// Transpose receiver's value into a value within the range supplied
			var stepCount = (this.max - this.min) / this.step;
			var stepSize = (max - min) / stepCount;
			var valueCount = (this.value[index] - this.min) / this.step;
			return min + valueCount * stepSize;
		},
		add: function(delta, index) {
			if(delta === 0) {
				return this;
			}

			// Decide min value for elements on right of index (to prevent overlap)
			var min = this.max;
			if(delta > 0 && index !== undefined) {
				min = this.value[index] + delta;
			}

			// Decide max value for elements on left of index (to prevent overlap)
			var max = this.min;
			if(delta < 0 && index !== undefined) {
				max = this.value[index] + delta;
			}

			// Update value(s)
			return this.value = this.value.map(function(value, i) {
				if(index === undefined || i === index) {
					return value + delta;
				} else if(delta > 0 && i > index) {
					return Math.max(value, min);
				} else if(delta < 0 && i < index) {
					return Math.min(value, max);
				} else {
					return value;
				}
			});
		},
		set: function(fixedValue, index) {
			return this.add(fixedValue - this.value[index], index);
		},

		// Private methods
		_normalize: function(value) {
			return this.min + Math.floor((Math.min(this.max, Math.max(this.min, value)) - this.min + this.step / 2) / this.step) * this.step;
		}
	});
	var SelectionModel = Model.extend({

		// Constructor
		initialize: function(valueElement, multiSelect) {
			this._super(valueElement);
			this._multiSelect = multiSelect;
		},

		// Public instance variables
		multiSelect: {
			get: function() {
				return this._multiSelect;
			}
		},

		// Public methods
		getValue: function() {
			var value = this._super();
			return value.length === 0 ? [] : value.split(",");
		},
		setValue: function(newValue) {
			return this._super(newValue.join(","));
		},
		toggle: function(toggleValue) {
			if(this.multiSelect) {
				// Make copy of values without toggled value
				var found = false;
				var newValue = this.value.filter(function(value) {
					var isToggleValue = value === toggleValue;
					found = found || isToggleValue;
					return !isToggleValue;
				});

				// If toggled value was not present add it (toggle it)
				if(!found) {
					newValue.push(toggleValue);
				}
				this.value = newValue;
			} else {
				this.value = [ toggleValue ];
			}
		},
		isChecked: function(testValue) {
			return this.value.indexOf(testValue) >= 0;
		}
	});
	var View = Class.create({

		// Constructor
		initialize: function(model) {
			this._model = model;
			this._uniqueID = tp_internals.controls.getNextInputID();

			var view = this;
			this.model.on("change." + this._uniqueID, function() {
				view.update.apply(view, arguments);
			});
		},

		// Public instance variables
		model: {
			get: function() {
				return this._model;
			}
		},

		// Public methods
		update: function() {
			// SubclassResponsibility
		},
		destroy: function() {
			this.model.on("change." + this._uniqueID, null);	// Remove event handler
			this._model = null;
		}
	});
	var RangeView = View.extend({

		// Constructor
		initialize: function(model, selection) {
			this._super(model);
			this._selection = selection;
			this._rangeSelection = null;
			this._rangeSelected = 0;
		},

		// Public instance variables
		selection: {
			get: function() {
				return this._selection;
			}
		},
		rangeSelection: {
			get: function() {
				return this._rangeSelection;
			},
			set: function(newRangeSelection) {
				// Do not call update() since rangeSelection is updated from within update
				this._rangeSelection = newRangeSelection;
				if(this._rangeSelection.size() === 0) {
					this._rangeSelected = 0;
				} else if(this._rangeSelected >= this._rangeSelection.size()) {
					this._rangeSelected = this._rangeSelection.size() - 1;
				}
			}
		},
		rangeSelected: {
			get: function() {
				return this._rangeSelected;
			},
			set: function(newRangeSelected) {
				if(newRangeSelected >= 0 && newRangeSelected < this._rangeSelection.size() && newRangeSelected !== this._rangeSelected) {
					this._rangeSelected = newRangeSelected;
					this.update();
				}
			}
		},
		destroy: function() {
			this._super();
			this._selection = null;
			this._rangeSelection = null;
		}
	});
	var SliderView = RangeView.extend({

		// Constructor
		initialize: function(model, selection) {
			this._super(model, selection);
		},

		// Public methods
		update: function() {
			var model = this.model;
			var slider = this.selection;

			// Join model on view
			this.rangeSelection = slider.select("span.dot-overlay").selectAll("span.dot").data(model.value);

			// Enter (new dots)
			this.rangeSelection.enter()
				.append("span")
					.attr("class", "dot")
			;

			// Update (new and existing dots) and keep track of lower/upper bound
			var min = 100;
			var max = 0;
			var dotSelected = this.rangeSelected;
			this.rangeSelection
				.style("left", function(d, i) {
					var value = model.valueForRange(i, 0, 100);
					min = Math.min(min, value);
					max = Math.max(max, value);
					return value + "%";
				})
				.classed("focus", function(d, i) { return i === dotSelected; })
			;

			// Exit (remove old dots)
			this.rangeSelection.exit()
				.remove()
			;

			// Update range
			slider.select("span.range")
				.style("left", min + "%")
				.style("width", (max - min) + "%")
			;
		}
	});
	var AngleView = RangeView.extend({

		// Constructor
		initialize: function(model, selection) {
			this._super(model, selection);
			this._centerSelection = selection.select(".center");
			this._needleSelection = null;
		},

		// Public methods
		update: function() {

			// Update gauge based on angle in model
			var range = this.model.value;
			var gauge = this.selection;

			// Create data structure to keep track of needle
			var data = this.model.value.map(function(value) { return { degrees: value, needle: null }; });

			// Join model on view (for needles)
			this._needleSelection = gauge.select(".needle-overlay").selectAll("span.needle").data(data);

			// Enter (new needles)
			this._needleSelection.enter()
				.append("span")
					.attr("class", "needle")
			;

			// Update (new and existing needles)
			var angleInDegrees = function(degrees) {
				// Change from corner between negative x-axis and needle to corner between
				// positive x-axis and needle (required for normal mathematics).
				// The needle starts in upright position.
				return degrees - 90;
			};
			this._needleSelection
				.style("-webkit-transform", function(d) { return "rotate(" + angleInDegrees(d.degrees) + "deg)"; })
				.style("-moz-transform", function(d) { return "rotate(" + angleInDegrees(d.degrees) + "deg)"; })
				.style("-ms-transform", function(d) { return "rotate(" + angleInDegrees(d.degrees) + "deg)"; })
				.style("transform", function(d) { return "rotate(" + angleInDegrees(d.degrees) + "deg)"; })
				.each(function(d) { d.needle = d3.select(this); })
			;

			// Exit (remove old needles)
			this._needleSelection.exit()
				.remove()
			;

			// Join model on view (for dots)
			this.rangeSelection = gauge.select(".dot-overlay").selectAll("span.dot").data(data);

			// Enter (new dots)
			this.rangeSelection.enter()
				.append("span")
					.attr("class", "dot")
			;

			// Exit (remove old dots)
			this.rangeSelection.exit()
				.remove()
			;

			// Update (new and existing dots)
			var radius = tp_dom_getStyleValue(gauge.node(), "height");
			var angleInRadians = function(degrees) {
				// Change from corner between negative x-axis and needle to corner between
				// positive x-axis and needle (required for normal mathematics).
				return Math.PI + tp_util_degToRad(degrees);
			};
			var dotSelected = this.rangeSelected;
			this.rangeSelection
				.style("left", function(d) { return tp_dom_getViewPortSize(radius + Math.cos(angleInRadians(d.degrees)) * radius) + "vw"; })
				.style("bottom", function(d) { return tp_dom_getViewPortSize(-(Math.sin(angleInRadians(d.degrees)) * radius)) + "vw"; })
				.style("-webkit-transform", function(d) { return "rotate(" + angleInDegrees(d.degrees) + "deg)"; })
				.style("-moz-transform", function(d) { return "rotate(" + angleInDegrees(d.degrees) + "deg)"; })
				.style("-ms-transform", function(d) { return "rotate(" + angleInDegrees(d.degrees) + "deg)"; })
				.style("transform", function(d) { return "rotate(" + angleInDegrees(d.degrees) + "deg)"; })
				.classed("focus", function(d, i) { return i === dotSelected; })
			;
		},
		destroy: function() {
			this._super();
			this._centerSelection = null;
			this._needleSelection = null;
		}
	});
	var SelectView = View.extend({

		// Constructor
		initialize: function(model, selectSelection) {
			this._super(model);
			this._selectSelection = selectSelection;
			this._optionSelection = selectSelection.selectAll("span.option");
			this._isOpen = false;
		},

		// Public instance variables
		selectSelection: {
			get: function() {
				return this._selectSelection;
			}
		},
		optionSelection: {
			get: function() {
				return this._optionSelection;
			}
		},

		// Public methods
		setOptions: function(newOptions) {
			this._optionSelection.remove();
			var list = this.selectSelection;
			var options = newOptions.slice(0).reverse();
			var optionsElements = list.selectAll("span.option").data(options);
			optionsElements
				.enter()
					.insert("span", "span")
			;
			optionsElements
				.attr("class", "option")
				.text(function(d) { return d; })
			;
			optionsElements
				.exit()
					.remove()
			;
			this._optionSelection = list.selectAll("span.option");
			this.update();
		},
		update: function() {

			// Expand or collapse select
			var view = this;
			var selectSelection = this._selectSelection;
			var optionSelection = this._optionSelection;
			var newIsOpen = selectSelection.classed("open");
			var newTopFactor = 0;
			if(newIsOpen) {
				newTopFactor = 1;	// Expand
			} else {
				newTopFactor = 0;	// Collapse
			}
			var top = 0;
			var selectedIndex = this.model.value[0];
			optionSelection.each(function(d, i) {
				var option = d3.select(this);
				top += tp_dom_getStyleValue(this, "height") * newTopFactor;
				var optionIsSelected = selectedIndex === i + 1;
				option
					.classed("selected", optionIsSelected)
					.transition()
						.duration(view._isOpen !== newIsOpen ? 200 : 0)	// Animate on changed status (open/close)
						.style("top", top + "px")
						.each("end", function(d, i) {

							// Make select responsive
							if(newIsOpen) {
								option.call(tp_d3_makeResponsive, "top")
							}

							// Change isOpen status once
							if(i === 0) {
								view._isOpen = newIsOpen;
							}
						})
				;
			});
		},
		destroy: function() {
			this._super();
			this._selectSelection = null;
			this._optionSelection = null;
		}
	});
	var SelectionView = View.extend({

		// Constructor
		initialize: function(model, selection, type) {
			this._super(model);
			this._selection = selection;
			this._icons = tp_internals.selectionIcons[type];
		},

		// Public instance variables
		selection: {
			get: function() {
				return this._selection;
			}
		},
		icons: {
			get: function() {
				return this._icons;
			}
		},

		// Public methods
		update: function() {

			// Update all selections
			var icons = this.icons;
			var model = this.model;
			this.selection.each(function() {
				var selection = d3.select(this);
				var isChecked = model.isChecked(selection.attr("value"));

				// Mark selected item and show correct radio button
				selection
					.classed("selected", isChecked)
					.attr("tabindex", isChecked ? "0" : "-1")
					.select(".icon").text(isChecked ?  icons.checked : icons.unchecked)
				;
			});
		},
		destroy: function() {
			this._super();
			this._selection = null;
			this._icons = null;
		}
	});
	var Controller = Class.create({

		// Constructor
		initialize: function(model, view) {
			this._model = model;
			this._view = view;
			this._uniqueID = tp_internals.controls.getNextInputID();

			// Update (initialize) view and add event handlers
			this.view.update();
			this.addEventHandlers();
		},

		// Public instance variables
		model: {
			get: function() {
				return this._model;
			}
		},
		view: {
			get: function() {
				return this._view;
			}
		},

		// Public methods
		addEventHandlers: function() {
			var self = this;
			this.model.on("change." + this._uniqueID, function() {
				self.modelChanged();
			});
		},
		removeEventHandlers: function() {
			this.model.on("change." + this._uniqueID, null);	// Remove event handler
		},
		modelChanged: function() {
			// SubclassResponsibility
		},
		destroy: function() {
			this.removeEventHandlers();
			this.view.destroy();
			this._view = null;
			this.model.destroy();
			this._model = null;
		}
	});
	var RangeController = Controller.extend({

		// Constructor
		initialize: function(model, view) {
			this._super(model, view);
			this._dotCount = model.value.length;
		},

		// Public instance variables
		dotCount: {
			get: function() {
				return this._dotCount;
			}
		},

		// Public methods
		addEventHandlers: function() {
			this._super();

			// Add key events
			var model = this.model;
			var view = this.view;
			var controller = this;
			view.selection
				.on("keydown", function() {
					var delta = null;
					var keyCode = d3.event.keyCode;
					var modifierPressed = tp_util_modifierPressed(d3.event);
					if(!modifierPressed && keyCode === 39 && controller.dotCount > 1) 	{	// Right
						if(view.rangeSelected + 1 < controller.dotCount) {
							view.rangeSelected++;
							delta = 0;
						}
					} else if(!modifierPressed && keyCode === 37 && controller.dotCount > 1) {	// Left
						if(view.rangeSelected > 0) {
							view.rangeSelected--;
							delta = 0;
						}
					} else if((!modifierPressed && (keyCode === 38 || keyCode === 39)) || keyCode === 107 || keyCode === 187) {	// Up or Right or +
						delta = model.step;
					} else if((!modifierPressed && (keyCode === 40 || keyCode === 37)) || keyCode === 109 || keyCode === 189) {	// Down or Left or -
						delta = -model.step;
					}
					if(delta !== null) {
						if(delta !== 0) {
							model.add(delta, view.rangeSelected);
						}
						d3.event.preventDefault();
					}
				})
			;

			// Add drag event for dot(s)
			this._addDotEventHandler();
		},
		removeEventHandlers: function() {
			this._super();
			this.view.selection.on("keydown", null);
		},
		modelChanged: function() {
			if(this.model.value.length !== this.dotCount) {
				this._updateDotCount();
				this._addDotEventHandler();
			}
		},

		// Private methods
		_addDotEventHandler: function() {
			// SubclassResponsibility
		},
		_removeDotEventHandler: function() {
			// SubclassResponsibility
		},
		_addDragBehavior: function(drag) {

			// Create drag behavior for control
			var view = this.view;
			var dragBehavior = d3.behavior.drag()
				.on("dragstart", function(d, i) {
					var element = d3.select(this);
					view.rangeSelected = i;
					element.classed("dragging", true);
				})
				.on("drag", drag)
				.on("dragend", function() {
					var element = d3.select(this);
					element.classed("dragging", false);
				})
			;

			// Add drag behavior to range selection
			view.rangeSelection.call(dragBehavior);
		},
		_removeDragBehavior: function() {
			this.view.rangeSelection.on(".drag", null);
		},
		_updateDotCount: function() {
			this._dotCount = this.model.value.length;
		}
	});
	var SliderController = RangeController.extend({

		// Constructor
		initialize: function(model, view) {
			this._super(model, view);
		},

		// Public methods
		addEventHandlers: function() {
			this._super();

			// Add click event on slider (setting closest dot to clicked position)
			var model = this.model;
			var view = this.view;
			view.selection.on("click.setdot", function() {
				var mouse = d3.mouse(view.selection.node());
				var maxPosition = tp_dom_getStyleValue(view.selection.node(), "width");
				var value = model.valueFromRange(mouse[0], 0, maxPosition);

				// Decide which dot is closest
				var range = model.value;
				var index = 0;
				var distance = Math.abs(range[0] - value);
				var closestDot = range.reduce(function(result, dotValue, index) {
					var dotDistance = Math.abs(dotValue - value);
					if(dotDistance < result.distance) {
						result.distance = dotDistance;
						result.index = index;
					}
					return result;
				}, { distance: distance, index: 0 });

				// Update model
				model.set(value, closestDot.index);
				view.rangeSelected = closestDot.index;
			});
		},
		removeEventHandlers: function() {
			this._super();
			this.view.selection.on("click.setdot", null);
		},

		// Private methods
		_addDotEventHandler: function() {
			this._super();

			// Add drag event for dot(s)
			var view = this.view;
			var model = this.model;
			this._addDragBehavior(function(d, i) {
				var mouse = d3.mouse(view.selection.node());
				var maxPosition = tp_dom_getStyleValue(view.selection.node(), "width");
				var value = model.valueFromRange(mouse[0], 0, maxPosition);

				// Update model
				model.set(value, i);
			});
		},
		_removeDotEventHandler: function() {
			this._super();
			this._removeDragBehavior();
		}
	});
	var AngleController = RangeController.extend({

		// Constructor
		initialize: function(model, view) {
			this._super(model, view);
		},

		// Private methods
		_addDotEventHandler: function() {
			this._super();

			// Add drag event for dot(s)
			var view = this.view;
			var model = this.model;
			this._addDragBehavior(function(d, i) {
				var mouse = d3.mouse(view._centerSelection.node());
				var dx = mouse[0];
				var dy = -mouse[1];		// Center is at the bottom (below dot)
				if(dy < 0) {
					dy = 0;
				}
				var angle = Math.atan(dy / dx);
				if(dx < 0) {
					angle += Math.PI;
				}
				angle = Math.PI - angle;	// Change from corner between positive x-axis and needle to corner between negative x-axis and needle

				// Update model
				model.set(tp_util_radToDeg(angle), i);
			});
		},
		_removeDotEventHandler: function() {
			this._super();
			this._removeDragBehavior();
		}
	});
	var SelectController = Controller.extend({

		// Constructor
		initialize: function(model, view) {
			this._super(model, view);
		},

		// Public methods
		setOptions: function(newOptions) {
			this.removeEventHandlers();
			this.model.max = newOptions.length;
			this.model.setValue(this.model.getValue());	// Reset selectionIndex
			this.view.setOptions(newOptions);		// Updates view
			this.addEventHandlers();
		},
		addEventHandlers: function() {
			this._super();

			var model = this.model;
			var view = this.view;
			var selectSelection = view.selectSelection;
			var optionSelection = view.optionSelection;
			selectSelection
				.on("click", function() {
					selectSelection.classed("open", !selectSelection.classed("open"));
					view.update();
				})
				.on("keydown", function() {
					if(tp_util_modifierPressed(d3.event)) {
						return;
					}
					var delta = 0;
					var keyCode = d3.event.keyCode;
					if(keyCode === 40) {		// Down
						delta = 1;
					} else if(keyCode === 38) {	// Up
						delta = -1;
					} else if(keyCode === 13) {	// ENTER
						d3.select(this).on("blur").apply(this);
					}
					if(delta !== 0) {
						model.add(delta);
						d3.event.preventDefault();
					}
				})
				.on("blur", function() {
					if(selectSelection.classed("open")) {
						selectSelection.classed("open", false);
						view.update();
					}
				})
			;
			optionSelection.each(function(d, i) {
				var option = d3.select(this);
				option
					.on("click", function() {
						if(selectSelection.classed("open")) {
							model.set(i + 1, 0);
						}
					})
				;
			});
		},
		removeEventHandlers: function() {
			this._super();
			this.view.selectSelection
				.on("click", null)
				.on("keydown", null)
				.on("blur", null)
			;
			this.view.optionSelection.each(function() {
				d3.select(this).on("click", null);
			});
		}
	});
	var SelectionController = RangeController.extend({

		// Constructor
		initialize: function(model, view) {
			this._super(model, view);
		},

		// Public methods
		addEventHandlers: function() {
			this._super();

			var model = this.model;
			var view = this.view;
			view.selection
				.on("click", function() {
					model.toggle(d3.select(this).attr("value"));
				})
				.on("keydown", function(d, i) {
					if(tp_util_modifierPressed(d3.event)) {
						return;
					}
					var keyCode = d3.event.keyCode;
					var delta = 0;
					var doToggle = false;
					var ifChecked = true;
					if(keyCode === 32) {		// Space
						doToggle = true;
					} else if(keyCode === 40) {	// Down
						delta = 1;
					} else if(keyCode === 38) {	// Up
						delta = -1;
					}
					var value = d3.select(this).attr("value");
					if(doToggle && (ifChecked || !model.isChecked(value))) {
						model.toggle(value);
						d3.event.preventDefault();
					}
					if(delta) {
						var element = this;
						var selectables = view.selection;
						var index = 0;
						selectables.each(function(d, i) {
							if(element === this) {
								index = i;
							}
						});
						index += delta;
						if(index >= selectables.size()) {
							index = 0;
						} else if(index < 0) {
							index = selectables.size() - 1;
						}
						selectables.each(function(d, i) {
							if(i === index) {
								this.focus();
							}
						});
						d3.event.preventDefault();
					}
					
				})
			;
		},
		removeEventHandlers: function() {
			this._super();
			this.view.selection
				.on("click", null)
				.on("keydown", null)
			;
		}
	});

	// Control methods
	function tp_controls_selectSetOptions(selection, newOptions) {
		var datum = selection.datum();
		if(datum && datum.controller && datum.controller.setOptions) {
			datum.controller.setOptions(newOptions);
		}
	}

	// Expose controls methods
	tp.controls = {
		selectSetOptions: tp_controls_selectSetOptions
	};

	// Worker methods
	if(!window.Worker) {
		window.Worker = function(script) {
			var self = this;
			self.onmessage = function(e) {
				// Empty message (to be replaced by Worker implementation
			};
			self.postMessage = function(e) {
				// Ignore script (implement "js/tp_handler.js" since it is only usage for now)
				window.setTimeout(function() {
					d3.json("php/handle.php")
						.header("Content-Type", "application/json")
						.post(JSON.stringify(e.request), function(error, data) {
							self.onmessage({ data: { id: e.id, error: error, data: data } });
						})
					;
				}, 100);
			};
		};
	}
	tp_internals.worker = new window.Worker("js/tp_handler.js");
	tp_internals.worker.onmessage = function(e) {
		if(e && e.data && e.data.id) {
			var id = e.data.id;
			var callback = tp_internals.workerCallbacks[id];
			delete tp_internals.workerCallbacks[id];
			if(callback) {
				callback(e.data.error, e.data.data);
			} else {
				console.error("Retrieved unbound message from Web Worker");
			}
		} else {
			console.error("Failed to retrieve data from Web Worker");
		}
	};
	tp_internals.workerId = 0;
	tp_internals.workerCallbacks = {};
	function tp_worker_send(request, callback) {
		try {
			var id = "cb" + tp_internals.workerId++;	// Create new id and increment id after usage
			tp_internals.workerCallbacks[id] = callback;	// Store callback handling when worker returns
			tp_internals.worker.postMessage({ id: id, request: request });
		} catch(ex) {
			callback({ error: ex, data: null });
		}
	}

	// Expose worker methods
	tp.worker = {
		send: tp_worker_send
	};

	// Session methods
	function tp_session_checkDuplicate(callback) {
		var sessionToken = window.sessionStorage.getItem("sessionToken");
		if(sessionToken) {
			if(window.sessionStorage.getItem("duplicateSession")) {
				callback();
			} else {
				window.sessionStorage.setItem("duplicateSession", "true");
			}
		}
	}
	function tp_session_unloadDuplicate() {
		window.sessionStorage.removeItem("duplicateSession");
	}
	function tp_session_initialize(noSessionStorageCallback, duplicateCallback) {
		if(!tp_internals.hasSessionStorage()) {
			noSessionStorageCallback();
			return;
		}
		d3.select(window).on("load.session", function() {
			tp_session_checkDuplicate(duplicateCallback);
		});
		d3.select(window).on("beforeunload.session", function() {
			tp_session_unloadDuplicate();
		});
		d3.select(window).on("unload.session", function() {
			tp_session_unloadDuplicate();
		});
	}
	function tp_session_signIn(email, password, expires, callback) {
		tp_session_sendToServer({ action: "signIn", email: email, password: password, expires: expires, sessionToken: tp_session_getSessionToken() }, callback);
	}
	function tp_session_signOut(callback) {
		tp_session_sendToServer({ action: "signOut", signInToken: tp_session_getSignInToken(), sessionToken: tp_session_getSessionToken() }, function(error, data) {
			tp_session_setSignInToken("");
			tp_session_setSessionToken("");
			if(callback) {
				callback(error, data);
			}
		});
	}
	function tp_session_isSignedIn(callback) {
		tp_session_sendToServer({ action: "isSignedIn", signInToken: tp_session_getSignInToken() }, callback);
	}
	function tp_session_currentSession(callback) {
		tp_session_sendToServer({ action: "currentSession", signInToken: tp_session_getSignInToken(), sessionToken: tp_session_getSessionToken() }, callback);
	}
	function tp_session_createAccount(email, password, callback) {
		tp_session_sendToServer({ action: "createAccount", email: email, password: password }, callback);
	}
	function tp_session_activateAccount(activationToken, callback) {
		tp_session_sendToServer({ action: "activateAccount", activationToken: activationToken }, callback);
	}
	function tp_session_sendPasswordReset(email, callback) {
		tp_session_sendToServer({ action: "sendPasswordReset", email: email }, callback);
	}
	function tp_session_resetPassword(passwordResetToken, password, callback) {
		tp_session_sendToServer({ action: "resetPassword", passwordResetToken: passwordResetToken, password: password }, callback);
	}
	function tp_session_changePassword(oldPassword, newPassword, callback) {
		tp_session_sendToServer({ action: "changePassword", signInToken: tp_session_getSignInToken(), oldPassword: oldPassword, newPassword: newPassword }, callback);
	}
	function tp_session_sendToServer(request, callback) {

		// Send request to server
		d3.json("php/handle.php")
			.header("Content-Type", "application/json")
			.post(JSON.stringify(request), function(error, data) {
				if(error) {
					if(callback) {
						callback(error, data);
					}
					return;
				}
				if(!data || data["resultCode"] !== "OK") {
					if(callback) {
						callback({ type: "applicationError" }, data);
					}
					return;
				}
				if(data["signInToken"] === "" || data["signInToken"]) {
					tp_session_setSignInToken(data["signInToken"]);
				}
				if(data["sessionToken"] === "" || data["sessionToken"]) {
					tp_session_setSessionToken(data["sessionToken"]);
				}
				if(callback) {
					callback(null, data);
				}
			})
		;
	}
	function tp_session_setSignInToken(signInToken) {
		if(signInToken && signInToken.length > 0) {
			window.localStorage.setItem("signInToken", signInToken);
		} else {
			window.localStorage.removeItem("signInToken");
		}
	}
	function tp_session_getSignInToken() {
		return window.localStorage.getItem("signInToken");
	}
	function tp_session_setSessionToken(sessionToken) {
		if(sessionToken && sessionToken.length > 0) {
			window.sessionStorage.setItem("sessionToken", sessionToken);
		} else {
			window.sessionStorage.removeItem("sessionToken");
		}
	}
	function tp_session_getSessionToken() {
		return window.sessionStorage.getItem("sessionToken");
	}
	function tp_session_hasAccount() {
		return window.localStorage.getItem("hasAccount") === "true";
	}
	function tp_session_setHasAccount() {
		return window.localStorage.setItem("hasAccount", "true");
	}
	function tp_session_loadSettings(appName, callback) {
		tp_session_sendToServer({ action: "loadSettings", signInToken: tp_session_getSignInToken(), appName: appName }, function(error, data) {

			// Handle some special cases
			if(!error && data && data["resultCode"] === "OK" && data["settings"]) {
				callback(null, data["settings"]);
			} else if(error && data && data["resultCode"] === "NOT_FOUND") {
				callback(null, {});
			} else {
				callback(error, data);
			}
		});
	}
	function tp_session_storeSettings(appName, settings, callback) {
		tp_session_sendToServer({ action: "storeSettings", signInToken: tp_session_getSignInToken(), appName: appName, settings: settings }, callback);
	}

	// Expose session methods
	tp.session = {
		initialize: tp_session_initialize,
		signIn: tp_session_signIn,
		signOut: tp_session_signOut,
		isSignedIn: tp_session_isSignedIn,
		currentSession: tp_session_currentSession,
		createAccount: tp_session_createAccount,
		activateAccount: tp_session_activateAccount,
		sendPasswordReset: tp_session_sendPasswordReset,
		resetPassword: tp_session_resetPassword,
		changePassword: tp_session_changePassword,
		getSignInToken: tp_session_getSignInToken,
		getSessionToken: tp_session_getSessionToken,
		hasAccount: tp_session_hasAccount,
		setHasAccount: tp_session_setHasAccount,
		loadSettings: tp_session_loadSettings,
		storeSettings: tp_session_storeSettings
	};

	// Language methods
	var languages = { ids: [] };
	function tp_lang_loadLanguage(csvFile, callback) {
		tp_internals.loadingResources++;
		d3.csv(csvFile, function(error, data) {
			if(!error && data.length > 0 && data[0].id !== undefined) {
				var langKeys = Object.keys(data[0]).filter(function(key) { return key !== "id"; });
				data.forEach(function(text) {

					// Find index for new text (or create new entry)
					var index = languages.ids.indexOf(text.id);
					if(index < 0) {
						index = languages.ids.push(text.id) - 1;	// Push returns length
					}

					// Add all languages
					langKeys.forEach(function(key) {

						// Create language if it does not already exist
						if(!languages[key]) {
							languages[key] = [];
						}

						// Set value
						languages[key][index] = text[key];
					});
				});
				if(callback) {
					callback();
				}
			}

			// Trigger ready state to perform initializers
			tp_internals.loadingResources--;
			d3.select(document).on("readystatechange").apply(document);
		});
	}
	function tp_lang_loadResources() {
		var loadFiles = function() {
			tp.lang.loadLanguage("data/lang.csv", function() {
				tp.dialogs.loadDialogs("data/dialogs.html");
			});

			// Trigger ready state to perform initializers
			tp_internals.loadingResources--;
			d3.select(document).on("readystatechange").apply(document);
		};

		// Prevent ready state from starting initializers (will be handled in loadFiles)
		tp_internals.loadingResources++;

		tp_session_loadSettings("user.settings", function(error, settings) {
			var lang = null;
			if(error) {

				// Use previously stored (chosen) language
				lang = window.localStorage.getItem("lang");

				// Use browser language as default
				if(!lang) {
					lang = window.navigator.userLanguage;	// IE
					if(!lang) {
						lang = window.navigator.language;	// Rest of the world
					}
				}
			} else {
				lang = settings.lang;
			}

			// Use supplied language (overrides settings or other defaults)
			var suppliedLang = tp_util_getQueryStringValue("lang");
			if(suppliedLang) {
				suppliedLang = suppliedLang.toLowerCase();
				if(suppliedLang === "nl" || suppliedLang === "en") {
					lang = suppliedLang;
				}
			}

			// Check if language is valid
			if(lang && lang.substr(0, 2).toLowerCase() === "nl") {
				lang = "nl";
			} else {
				lang = "en";
			}
			tp.lang.default = lang;

			// Load files
			loadFiles();
		});
	}
	function tp_lang_getText(textId, lang) {
		var textIndex = languages.ids.indexOf(textId);
		if(textIndex >= 0) {
			var actualLang = lang || tp.lang.default;
			if(!languages[actualLang]) {
				actualLang = tp.lang.fallback;
				if(!languages[actualLang]) {
					return "";
				}
			}
			var text = languages[actualLang][textIndex];
			if((text === undefined || text === null) && actualLang !== tp.lang.fallback) {
				text = languages[tp.lang.fallback][textIndex];
			}

			// Unescape text
			if(text) {
				var escapeChars = "bfnrtv\'\"\\\\";
				var unescapedChars = "\b\f\n\r\t\v\'\"\\";
				text = text.replace(new RegExp("\\\\[" + escapeChars + "]", "g"), function(match) {
					var index = escapeChars.indexOf(match.substr(1));	// Strip '\'
					if(index >= 0) {
						return unescapedChars[index];
					}
					return match;
				});
			}

			return text || "";
		}
		return "";
	}
	function tp_lang_getFormattedText(textId, value, lang) {
		return tp_util_formatString(tp_lang_getText(textId, lang), value);
	}
	function tp_lang_setDefault(lang) {
		if(lang !== "nl") {
			lang = "en";
		}
		if(lang !== tp.lang.default) {
			tp.lang.default = lang;
			initializeTextFields();		// Reset all text fields
			initializeTooltips();		// Reset all tooltips

			// Reset all dialogs (these are not visible and therefore not reachable directly)
			Object.keys(tp_internals.dialogs.namedDialogs).forEach(function(name) {
				var namedDialog = tp_internals.dialogs.namedDialogs[name];
				initializeTextFields(namedDialog);
				initializeTooltips(namedDialog);
			});

			// Keep language as backup
			window.localStorage.setItem("lang", lang);
		}
	}

	// Expose language methods and properties
	tp.lang = {
		loadLanguage: tp_lang_loadLanguage,
		loadResources: tp_lang_loadResources,
		getText: tp_lang_getText,
		updateText: initializeTextFields,
		getFormattedText: tp_lang_getFormattedText,
		setDefault: tp_lang_setDefault,
		default: "en",
		fallback: "en"
	};

	// Utility methods
	function tp_util_getParameters(parameterString) {
		var parameters = {};
		var keyValues = parameterString.split("&");	// Retrieve "<key>[=<value>]" pairs (separated by "&")
		if(keyValues.length > 0) {
			keyValues.forEach(function(keyValue) {
				var result = keyValue.replace(/\+/g, " ").split("=");
				if(result.length > 0 && result[0].length > 0) {
					parameters[decodeURIComponent(result[0])] = result.length === 2 ? decodeURIComponent(result[1]) : "";
				}
			});
		}
		return parameters;
	}
	function tp_util_getSearchParameters() {
		if(!window.searchParameters || window.searchParameters.search !== window.location.search) {
			window.searchParameters = {
				search: window.location.search,
				parameters: tp_util_getParameters(window.location.search.substr(1))
			};
		}
		return window.searchParameters.parameters;
	}
	function tp_util_getQueryStringValue(key) {
		return tp_util_getSearchParameters()[key];
	}
	function tp_util_navigate(url, options) {
		window.location.href = tp_util_getNavigateURL(url, options);
	}
	function tp_util_getNavigateURL(url, options) {

		// No support for the 'hash' yet

		// Parameters for the new location
		var parameters = {};

		// Retrieve all query arguments from current location
		var searchParameters = tp_util_getSearchParameters();

		// Retrieve all query arguments from supplied url
		var urlParametersIndex = url.indexOf("?");
		var urlParameters = {};
		if(urlParametersIndex >= 0) {
			urlParameters = tp_util_getParameters(url.substr(urlParametersIndex + 1));
			url = url.substr(0, urlParametersIndex);
		}

		// Decide which parameters are used in navigation
		tp_util_addProperties(parameters, searchParameters);
		if(options) {

			// Remove unwanted search parameters
			if(options.exclude) {
				if(options.exclude === "*") {
					parameters = {};
				} else {
					tp_util_removeProperties(parameters, options.exclude);
				}
			}

			// Add url parameters
			tp_util_addProperties(parameters, urlParameters);

			// Add extra search parameters
			if(options.include) {
				tp_util_addProperties(parameters, options.include);
			}
		}

		// Turn parameters into search query string
		var queryString = "";
		Object.keys(parameters).forEach(function(key) {
			var value = parameters[key];
			if(queryString) {
				queryString += "&";
			}
			queryString += tp_util_encodeURIComponent(key);
			if(value) {
				queryString += "=" + tp_util_encodeURIComponent(value);
			}
		});

		// Differentiate between absolute url and relative url supplied
		var href = "";
		if(/^(http|https|mailto):/.test(url)) {
			href = url;
		} else {
			var currentLocation = window.location;
			href = currentLocation.protocol + "//" + currentLocation.host;

			// Differentiate between absolute path and relative path supplied (url is relative)
			var path = "/";
			if(url.substr(0, 1) !== "/") {

				// Retrieve last directory from current location (always starts and ends with a slash)
				path = currentLocation.pathname.replace(/\/[^\/]*$/, "/");
			}

			// Process the relative path supplied
			var relativePath = url
				.replace(/\/\/+/g, "/")				// Collapse all repeated occurrences of /
				.replace(/\/(\.\/)+/g, "/")			// Remove all (possibly repeated) occurrences of /./ in path
			;
			if(relativePath.substr(0, 2) === "./") {
				relativePath = relativePath.substr(2);		// Remove ./ at start of path
			} else if(relativePath.substr(0, 1) === "/") {
				relativePath = relativePath.substr(1);
			}

			// Add relative path directory by directory
			var pathSeparator;
			while((pathSeparator = relativePath.indexOf("/")) >= 0) {
				var directory = relativePath.substr(0, pathSeparator + 1);	// Including /
				if(directory === "../") {
					path = path.replace(/\/[^\/]*\/$/, "/");		// Remove last directory
				} else {
					path += directory;					// Add directory
				}
				relativePath = relativePath.substr(pathSeparator + 1);		// Move to next directory, just after the /
			}

			// Add final file to full path
			path += relativePath;

			// Build up url
			href += path;
		}

		// Navigate (incl. search query string)
		if(queryString) {
			 href += "?" + queryString;
		}

		return href;
	}
	function tp_util_getFileNameFromURL(url, defaultName) {

		// Parse URL
		tp_internals.urlParser.href = url;
		var pathName = tp_internals.urlParser.pathname;
		if(!pathName) {
			return defaultName;
		}

		// Extract file name from path name
		var fileName = "/" + pathName;
		var lastPathSeparator = fileName.lastIndexOf("/");	// Always successful
		fileName = fileName.slice(lastPathSeparator + 1);

		return fileName || defaultName;
	}
	function tp_util_modifierPressed(event) {
		return event.shiftKey || event.ctrlKey || event.altKey || event.metaKey;
	}
	function tp_util_equals(a, b) {

		// Check null-ness
		if(a === null) {
			return b === null;
		} else if(b === null) {
			return false;
		}

		// Check for Arrays
		if(Array.isArray(a)) {
			if(!Array.isArray(b) || a.length !== b.length) {
				return false;
			}
			return a.every(function(value, i) {
				return tp_util_equals(b[i], value);
			});
		} else if(Array.isArray(b)) {
			return false;
		}

		// Check for Objects
		if(typeof a === "object") {
			var keys = Object.keys(a);
			if(!typeof b === "object" || keys.length !== Object.keys(b)) {
				return false;
			}
			return keys.every(function(key) {
				return tp_util_equals(a[key], b[key]);
			});
		}

		// Use strict equality on rest (booleans, numbers, strings, functions)
		return a === b;
	}
	function tp_util_isEmpty(value) {
		return value === null || value === undefined || value.trim().length === 0;
	}
	function tp_util_sign(value) {
		return value >= 0 ? 1 : -1;
	}
	function tp_util_radToDeg(rad) {
		return rad * 360 / (Math.PI * 2);
	}
	function tp_util_degToRad(deg) {
		return deg / 360 * (Math.PI * 2);
	}
	function tp_util_round(value, decimals) {
		var shiftDecimals = Math.pow(10, decimals);
		return Math.floor(value * shiftDecimals) / shiftDecimals;
	}
	function tp_util_toNumber(value) {
		// Special case value is null, undefined or 0
		if(!value) {
			return 0;
		}
		var number = +value;
		return isNaN(number) ? 0 : number;
	}
	function tp_util_toNumbers(value) {
		// Special case value is null, undefined or 0
		if(!value) {
			return [ 0 ];
		}
		return value.split(",").map(function(singleValue) {
			var number = +singleValue;
			return isNaN(number) ? 0 : number;
		});
	}
	function tp_util_formatString(formatString, value) {
		var result = "";

		// Separate fixed text from formatted text
		var re = /([^%]*)(%[^%]*%)([^%]*)/g;
		var match;
		while((match = re.exec(formatString)) !== null) {

			// formatString contains %<format>[:<valueSpecifier>]*%
			// Strip % from start and end
			// Separate <format> from <valueSpecifier>s (0 or more)
			var format = match[2].substr(1, match[2].length - 2);
			var formatRe = /^([^:]+)(:.+)?$/;
			var formatMatch;
			var formattedValue = "";
			if((formatMatch = formatRe.exec(format)) !== null) {
				var valueString = formatMatch[1] === "*" ? value : d3.format(formatMatch[1])(value);

				// If 1 or more <valueSpecifier>s is given, select appropriate (if any)
				if(formatMatch[2]) {

					// valueSpecifier contains (:<value>=<text>)*
					// Strip : from start
					// Separate <value> from <text>
					// Select first match (<value> matching <valueString> or "*" matching all)
					var valueSpecifiers = formatMatch[2].substr(1).split(":");
					var valueText = valueSpecifiers.reduce(function(result, valueSpecifier) {
						if(result === null) {
							var valueAndText = valueSpecifier.split("=");
							if(valueAndText.length === 2) {

								// Wildcard matching any value
								if(valueAndText[0] === "*") {
									result = valueAndText[1];

								// Specific value
								} else if(valueAndText[0] === valueString) {
									result = valueAndText[1];
								}
							}
						}
						return result;
					}, null);

					// Replace any * inside text with formatted value string
					if(valueText) {
						formattedValue = valueText.replace("*", valueString);
					}

				// If no <valueSpecifier> is given, use formatted value string directly
				} else {
					formattedValue = valueString;
				}
			}

			// Append fixed text (match[1] and match[3]) and formatted string value
			result +=
				(match[1] || "") +
				formattedValue +
				(match[3] || "")
			;
		}

		// If no formatter was found, just use the supplied formatString as a fixed string */
		if(result.length === 0 && formatString.indexOf("%") < 0) {
			result = formatString;
		}

		// Replace any escaped characters
		re = /\\x([0-9a-fA-F][0-9a-fA-F])/g;
		while((match = re.exec(result)) !== null) {

			// Change result
			// - Copy prefix up until escaped character
			// - Append encoded (escaped) character
			// - Append remaining part after escaped character
			result =
				result.substr(0, match.index) +
				String.fromCharCode(parseInt(match[1], 16)) +
				result.substr(re.lastIndex);

			// Adjust lastIndex since result has been shortened by 3 characters (\x25 becomes single character %)
			re.lastIndex -= 3;
		}

		return result;
	}
	function tp_util_encodeURIComponent(str) {
		return encodeURIComponent(str).replace(/[!'()*\r\n]/g, function(c) {
			return "%" + c.charCodeAt(0).toString(16);
		});
	}
	function tp_util_escapeRegExp(str) {
		// See: http://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
		return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
	}
	function tp_util_addProperties(properties, additionalProperties) {
		Object.keys(additionalProperties).forEach(function(key) {
			properties[key] = additionalProperties[key];
		});
		return properties;
	}
	function tp_util_removeProperties(properties, extraneousProperties) {
		var keys = Array.isArray(extraneousProperties) ? extraneousProperties : Object.keys(extraneousProperties);
		keys.forEach(function(key) {
			delete properties[key];
		});
		return properties;
	}
	function tp_util_addInitializer(initializer) {
		tp_internals.externalInitializers.push(initializer);
	}

	// Expose utility methods
	tp.util = {
		getQueryStringValue: tp_util_getQueryStringValue,
		navigate: tp_util_navigate,
		getNavigateURL: tp_util_getNavigateURL,
		getFileNameFromURL: tp_util_getFileNameFromURL,
		equals: tp_util_equals,
		isEmpty: tp_util_isEmpty,
		sign: tp_util_sign,
		round: tp_util_round,
		toNumber: tp_util_toNumber,
		toNumbers: tp_util_toNumbers,
		formatString: tp_util_formatString,
		encodeURIComponent: tp_util_encodeURIComponent,
		escapeRegExp: tp_util_escapeRegExp,
		addProperties: tp_util_addProperties,
		removeProperties: tp_util_removeProperties,
		addInitializer: tp_util_addInitializer
	};

	// Replace controls with tp-versions (order of items is important)
	function initializeControls() {
		initializeForms();
		initializeTextFields();
		initializeSliderControls();
		initializeAngleControls();
		initializeSelectControls();
		initializeCheckBoxControls();
		initializeRadioButtonControls();
		initializeButtons();
		initializeHelpButton();
		initializeInputFields();
		initializeSlidePanes();
		initializeTooltips();
	}
	tp_internals.initializers.push(initializeControls);

	// Initialize forms
	function initializeForms() {

		// Give every form an id
		d3.selectAll("form").each(function() {
			var form = d3.select(this);

			// Add (auto-generated) id to form if none is present
			if(form.attr("id") === null) {
				form.attr("id", tp_internals.controls.getNextInputID());
			}
		});
	}

	// Initialize tooltips
	function initializeTooltips(selection) {
		if(!selection) {
			selection = d3.select("body");
		}
		selection.selectAll("[data-tooltip]").each(function() {
			var element = d3.select(this);
			var tooltip = element.attr("data-tooltip");

			// Replace tooltip id's with appropriate text
			if(tooltip.substr(0, 1) === "#") {
				tooltip = tp_lang_getText(tooltip.substr(1));	// Strip '#'
			}
			element.attr("data-tooltip-text", tooltip);
		});
	}

	// Initialize slider controls
	function initializeSliderControls() {

		// Change range input fields into sliders
		d3.selectAll("input[type=range][data-type=slider]").each(function() {

			// Change numbers with a minimum and maxium value into a slider
			var rangeInput = d3.select(this);
			if(rangeInput.attr("min") === null || rangeInput.attr("max") === null) {
				return;
			}
			var range = tp_util_toNumbers(rangeInput.attr("value"));
			var min = tp_util_toNumber(rangeInput.attr("min"));
			var max = tp_util_toNumber(rangeInput.attr("max"));
			var step = tp_util_toNumber(rangeInput.attr("step"));

			// Add (auto-generated) id to input field if none is present
			if(rangeInput.attr("id") === null) {
				rangeInput.attr("id", tp_internals.controls.getNextInputID());
			}

			// Insert the slider before the input field
			var slider = d3.select(this.parentNode)
				.insert("span", "#" + rangeInput.attr("id"))
					.attr("class", "input slider " + rangeInput.attr("class"))
					.call(tp_d3_makeKeyboardSelectable)
					.style("width", rangeInput.attr("data-width"))
					.call(initializeTooltip, rangeInput)
			;

			// Add ticks
			var tickRegExp = /^tick-[0-9]+$/;
			var ticks = rangeInput.attr("class").split(" ").filter(function(className) {
				return tickRegExp.test(className);
			});
			ticks.forEach(function(tick) {
				slider
					.append("span")
						.attr("class", "tick")
						.style("left", tick.substr(5) + "%")
				;
			});

			// Add range indicator (for sliders with multiple dots)
			slider
				.append("span")
					.attr("class", "range")
			;

			// Add overlay for storing the dots
			var dotOverlay = slider
				.append("span")
					.attr("class", "dot-overlay")
			;

			// Hide input field
			rangeInput.attr("type", "hidden");

			// Create Model View and Controller
			var model = new RangeModel(rangeInput);
			var view = new SliderView(model, slider);
			var controller = new SliderController(model, view);
			slider
				.datum({ controller: controller })
				.classed("controller", true)
			;
		});
	}

	// Initialize angle controls
	function initializeAngleControls() {

		// Change angle input fields into 'gauge'
		d3.selectAll("input[type=range][data-type=angle]").each(function() {

			// Retrieve initial value
			var angleInput = d3.select(this);

			// Add (auto-generated) id to input field if none is present
			if(angleInput.attr("id") === null) {
				angleInput.attr("id", tp_internals.controls.getNextInputID());
			}

			// Insert the gauge before the input field
			var gauge = d3.select(this.parentNode)
				.insert("span", "#" + angleInput.attr("id"))
					.attr("class", "input angle")
					.call(tp_d3_makeKeyboardSelectable)
					.call(initializeTooltip, angleInput)
			;

			// Add (single) center to gauge
			gauge.append("span")
				.attr("class", "center")
			;

			// Append clipping overlay (similar shape as angle)
			var clippingGauge = gauge
				.append("span")
					.attr("class", "angle needle-overlay")
			;

			// Append dot overlay
			var dotOverlay = gauge
				.append("span")
					.attr("class", "dot-overlay")
			;

			// Hide input field
			angleInput
				.attr("type", "hidden")
				.attr("min", 0)
				.attr("max", 180)
			;

			// Create Model View and Controller
			var model = new RangeModel(angleInput);
			var view = new AngleView(model, gauge);
			var controller = new AngleController(model, view);
			gauge
				.datum({ controller: controller })
				.classed("controller", true)
			;
		});
	}

	// Initialize selection controls
	function initializeSelectControls() {

		// Change select into list
		d3.selectAll("select").each(function() {

			// Retrieve options
			var select = d3.select(this);
			var options = select.selectAll("option");
			var optionCount = options.size();

			// Retrieve selectedIndex
			var selectedIndex = tp_util_toNumber(select.attr("data-selected-index"));
			if(selectedIndex === 0) {
				selectedIndex = null;
			} else if(selectedIndex < 1 || selectedIndex > optionCount) {
				selectedIndex = 1;
			}

			// Add (auto-generated) id to select if none is present
			var selectId = select.attr("id");
			if(selectId === null) {
				selectId = tp_internals.controls.getNextInputID();
				select.attr("id", selectId);
			}

			// Create hidden input field (to allow "change" events to be caught)
			var inputField = d3.select(this.parentNode)
				.insert("input", "#" + selectId)
					.attr("id", selectId)	// Take over id from select (select will be removed)
					.attr("type", "hidden")
					.attr("min", 1)
					.attr("max", options.size())
					.attr("value", selectedIndex)
			;

			// Insert the list before the select
			var list = d3.select(this.parentNode)
				.insert("span", "#" + select.attr("id"))	// Add link to make list tababble
					.attr("class", "input select " + select.attr("class"))
					.call(tp_d3_makeKeyboardSelectable)
					.style("width", select.attr("data-width"))
					.call(initializeTooltip, select)
			;

			// Copy options from select to list as list items
			options.each(function() {
				var option = d3.select(this);
				list.append("span")
					.attr("class", "option")
					.text(option.text())
				;
			});

			// Add title to select (if present)
			if(select.attr("title")) {
				list.append("span")
					.attr("class", "title")
					.text(select.attr("title"))
				;
			}

			// Add drop down symbol
			list.append("span")
				.append("i")
					.attr("class", "material-icons")
					.text("arrow_drop_down")
			;

			// Remove select (now everything is copied)
			select.remove();

			// Create Model View and Controller
			var model = new RangeModel(inputField);
			var view = new SelectView(model, list);
			var controller = new SelectController(model, view);
			list
				.datum({ controller: controller })
				.classed("controller", true)
			;
		});
	}

	// Initialize check box controls
	function initializeCheckBoxControls(dialog) {
		initializeSelectionControls(dialog, "checkbox", true);
	}

	// Initialize radio button controls
	function initializeRadioButtonControls(dialog) {
		initializeSelectionControls(dialog, "radiobutton", false);
	}

	// Initialize selection controls (check boxes and radio buttons)
	function initializeSelectionControls(selection, type, multiSelect) {
		if(!selection) {
			selection = d3.select("body");
		}

		// Store temporary MVC info
		var namedModels = {};

		// Change selection input fields
		selection.selectAll("input[type=" + type + "]").each(function() {

			// Retrieve initial value
			var inputField = d3.select(this);
			var name = inputField.attr("name");
			var value = inputField.attr("value");
			var isChecked = inputField.attr("checked") !== null;
			if(name === null || value === null) {
				console.error("Input field without name and/or value");
				return;
			}

			// Find form to which input belongs
			var formId = inputField.attr("form");
			var form = null;
			var formIsRemote = true;
			if(formId) {
				form = d3.select("#" + formId);
				if(!form) {
					console.error("Invalid reference to form with id: " + formId);
					return;
				}
			} else {
				var form = tp_dom_nearest("form", inputField.node());
				if(!form) {
					console.error("Input field named \"" + name + "\" is not part of a form.");
					return;
				}
				formId = d3.select(form).attr("id");
				if(!formId) {
					console.error("Internal error: Form without id found");
					return;
				}
				formIsRemote = false;
			}

			// Add (auto-generated) id to input field if none is present
			if(inputField.attr("id") === null) {
				inputField.attr("id", tp_internals.controls.getNextInputID());
			}

			// Insert the selection before the input field
			var selection = d3.select(this.parentNode)
				.insert("span", "#" + inputField.attr("id"))
					.attr("class", "input " + type)
					.call(initializeTooltip, inputField)
			;

			// Make all elements keyboard selectable (only check boxes)
			if(type === "checkbox") {
				selection.call(tp_d3_makeKeyboardSelectable);
			}

			// Append selection icon
			selection.append("span")
				.append("i")
					.attr("class", "icon material-icons")
			;

			// Append text
			var text = inputField.attr("data-text");
			if(text !== null) {
				if(text.substr(0, 1) === "#") {
					text = tp_lang_getText(text.substr(1));	// Strip '#'
				}
				selection.append("span")
					.text(text)
				;
			}

			// Move input field to form location (ie make input local)
			var inputFieldIsCreated = false;
			if(formIsRemote) {
				var existingInputField = d3.select("#" + formId + " input[name=" + name + "]");
				if(existingInputField.size() === 1) {
					inputField.remove();
					inputField = existingInputField;
					inputFieldIsCreated = true;
				} else {
					inputField = d3.select(tp_dom_move(inputField.node(), d3.select("#" + formId).node()));
				}
			}

			// Hide input field (and clean some copied attributes)
			if(!inputFieldIsCreated) {
				inputField
					.attr("type", "hidden")
					.attr("value", "")
					.attr("form", null)
					.attr("checked", null)
					.attr("data-text", null)
				;
			}

			// Store MVC info
			var fullName = formId + "_" + name;
			if(!namedModels[fullName]) {
				var initValue = inputField.attr("value");
				var values = initValue === null || initValue === "" ? [] : initValue.split(",");
				namedModels[fullName] = { inputField: inputField, values: values, viewInstances: [] };
			} else {
				// Remove input field
				if(!inputFieldIsCreated) {
					inputField.remove();
				}
			}
			selection
				.attr("name", fullName)
				.attr("value", value)
			;
			if(isChecked && namedModels[fullName].values.indexOf(value) < 0) {
				namedModels[fullName].values.push(value);
			}
			namedModels[fullName].viewInstances.push(selection);
		});

		// Create Model View and Controller (only if full document is processed)
		Object.keys(namedModels).forEach(function(name) {

			// Give input (model) selected values
			namedModels[name].inputField.attr("value", namedModels[name].values.join(","));

			var model = new SelectionModel(namedModels[name].inputField, multiSelect);
			var view = new SelectionView(model, selection.selectAll("span." + type + "[name=" + name + "]"), type);
			var controller = new SelectionController(model, view);

			// Add MVC to dialog @@(addProperties should be checked)
			if(selection.classed(".dialog")) {
				tp_util_addProperties(selection.datum(), { controller: controller });
			}
		});
	}

	// Initialize buttons
	function initializeButtons() {

		// Select all buttons and make icons (actually text) unselectable
		d3.selectAll("button.icon").each(function() {
			var button = d3.select(this);
			
			// Update button
			button
				.call(tp_d3_makeKeyboardSelectable)
				.call(tp_d3_onKeyboardSelect)
			;
		});
	}

	// Initialize slide panes
	function initializeSlidePanes() {

		// Add control to slide pane
		var sliderContainers = {};
		var needClipping = false;
		d3.selectAll("div.slide-pane").each(function() {
			var pane = d3.select(this);

			// Add (auto-generated) id to select if none is present
			var paneId = pane.attr("id");
			if(paneId === null) {
				paneId = tp_internals.controls.getNextInputID();
				pane.attr("id", paneId);
			}

			// Store pane position and make pane hidden (by overflow) if pane on right or bottom
			var panePosition = pane.attr("data-position");
			if(panePosition === null) {
				panePosition = "right";
				pane.attr("data-position", panePosition);
			}
			if(panePosition === "right" || panePosition === "bottom") {
				needClipping = true;
			}

			// Make input fields unselectable by default
			tp_dom_updateTabIndices(false, pane);

			// Add slider container (before pane) if not present yet
			if(!sliderContainers[panePosition]) {
				var parentElement = d3.select(pane.node().parentNode);
				sliderContainers[panePosition] = parentElement.insert("div", "#" + paneId)
					.attr("class", "slider-container " + panePosition)
				;

				// Add pane margin
				parentElement
					.insert("div", "#" + paneId)
						.attr("class", "pane-margin " + panePosition)
				;
			}

			// Add slider control to slider container (and store pane and container)
			sliderContainers[panePosition]
				.append("div")
					.attr("class", "slider " + panePosition)
					.datum({
						pane: pane,
						sliderContainer: sliderContainers[panePosition]
					})
					.call(slidePaneAddDragBehavior)
					.append("span")
						.attr("data-tooltip", pane.attr("data-icon-tooltip"))
						.attr("data-tooltip-position", tp_internals.opposite[panePosition])
						.append("i")
							.attr("class", "material-icons")
							.text(pane.attr("data-icon"))
			;
		});
/*
		if(needClipping) {
			d3.select("body").style("overflow", "hidden");
		}
*/
	}
	function slidePaneAddDragBehavior(selection) {

		// Drag behavior for slide pane control
		var draggable = d3.behavior.drag()
			.on("dragstart", function() {
				slidePaneStartDrag.apply(this);
			})
			.on("drag", function() {
				slidePaneDrag.apply(this);
			})
			.on("dragend", function() {
				slidePaneEndDrag.apply(this);
			})
		;

		// Add drag behavior to selection
		selection.call(draggable);
	}
	function slidePaneToggle(selection) {

		// Fake clicking on slider
		slidePaneStartDrag.apply(selection.node(), [ [ 0, 0 ] ]);
		slidePaneEndDrag.apply(selection.node(), [ [ 0, 0 ] ]);
	}
	function slidePaneStartDrag(fakeMouse) {
		var slider = d3.select(this);
		var sliderProperties = slider.datum();
		var sliderContainer = sliderProperties.sliderContainer;
		var pane = sliderProperties.pane;

		// Store static slider and pane information (only once)
		if(!sliderProperties.isInitialized) {
			var panePosition = pane.attr("data-position");	// Beware name is reused in other meaning below!
			var sliderContainer = d3.select("div.slider-container." + panePosition);
			var isVerticalPane = panePosition === "left" || panePosition === "right";
			var isAtEnd = panePosition === "right" || panePosition === "bottom";

			tp_util_addProperties(sliderProperties, {
				open: false,
				isVerticalPane: isVerticalPane,
				isAtEnd: isAtEnd,
				sliderContainerPositionStyle: isVerticalPane ? "top" : "left",
				panePositionStyle: isAtEnd ? (isVerticalPane ? "left" : "top") : (isVerticalPane ? "right" : "bottom"),
				sliderPositionStyle: isVerticalPane ? "left" : "top",
				paneSizeStyle: isVerticalPane ? "width" : "height",
				sliderContainerMouseIndex: isVerticalPane ? 1 : 0,
				paneAndSliderMouseIndex: isVerticalPane ? 0 : 1,
				isInitialized: true
			});
		}

		// Highlight slider and pane
		slider.classed("dragging", true);
		pane.classed("dragging", true);

		// Make only selected slide pane active
		d3.selectAll("div.slide-pane[data-position=" + pane.attr("data-position") + "]").classed("active", function() {
			return d3.select(this).classed("dragging");
		});

		// Store current (ie dynamic) slider and pane positions
		tp_util_addProperties(sliderProperties, {
			sliderContainerPosition: tp_dom_getStyleValue(sliderContainer.node(), sliderProperties.sliderContainerPositionStyle),
			panePosition: tp_dom_getStyleValue(pane.node(), sliderProperties.panePositionStyle),
			sliderPosition: tp_dom_getStyleValue(slider.node(), sliderProperties.sliderPositionStyle),
			margin: tp_dom_getStyleValue(pane.node(), "margin-" + sliderProperties.panePositionStyle),
			//paneSize: tp_dom_getStyleValue(pane.node(), sliderProperties.paneSizeStyle),
			paneSize: (sliderProperties.paneSizeStyle === "width" && (window.msPerformance || window.msIsSiteMode || window.msIsStaticHTML) ?
				pane.node().clientWidth :
				tp_dom_getStyleValue(pane.node(), sliderProperties.paneSizeStyle)
			),
			mouse: fakeMouse ? fakeMouse : d3.mouse(d3.select("body").node()),
			dragged: false
		});
	}
	function slidePaneDrag() {
		var slider = d3.select(this);

		// Register movement
		var sliderProperties = slider.datum();
		sliderProperties.dragged = true;

		// Calculate movement
		var sliderContainer = sliderProperties.sliderContainer;
		var sliderContainerPosition = sliderProperties.sliderContainerPosition;
		var pane = sliderProperties.pane;
		var panePosition = sliderProperties.panePosition;
		var sliderPosition = sliderProperties.sliderPosition;
		var movement = slidePaneCalculateMovement(slider);

		// Draw slider, slider container and pane at new position
		sliderContainer.style(sliderProperties.sliderContainerPositionStyle, tp_dom_getViewPortSize(sliderContainerPosition + movement.sliderContainer) + "vw");
		slider.style(sliderProperties.sliderPositionStyle, (sliderPosition + movement.paneAndSlider) + "px");
		if(sliderProperties.isAtEnd) {
			pane.style(sliderProperties.panePositionStyle, (panePosition + movement.paneAndSlider) + "px");
		} else {
			pane.style(sliderProperties.panePositionStyle, (panePosition - movement.paneAndSlider) + "px");
		}
	}
	function slidePaneEndDrag(fakeMouse) {
		var slider = d3.select(this);

		// Calculate final position
		var sliderProperties = slider.datum();
		var sliderContainer = sliderProperties.sliderContainer;
		var sliderContainerPosition = sliderProperties.sliderContainerPosition;
		var pane = sliderProperties.pane;
		var panePosition = sliderProperties.panePosition;
		var sliderPosition = sliderProperties.sliderPosition;
		var paneSize = sliderProperties.paneSize - Math.abs(sliderProperties.margin);
		var movement = slidePaneCalculateMovement(slider, fakeMouse);

		// Open/close pane if clicked (ie no drag) or final movement is large enough
		var sliderChanged = false;
		if(!sliderProperties.dragged || Math.abs(movement.paneAndSlider) > paneSize / 3) {

			if(sliderProperties.open) {
				panePosition += paneSize;
				sliderPosition += paneSize * (sliderProperties.isAtEnd ? 1 : -1);
			} else {
				panePosition -= paneSize;
				sliderPosition += paneSize * (sliderProperties.isAtEnd ? -1 : 1);
			}
			sliderChanged = true;

			// Make input fields (un)selectable
			tp_dom_updateTabIndices(!sliderProperties.open, pane);
		}

		// Draw slider and pane in final position (could be original or new position)
		slidePaneDrawFinal(slider, panePosition, sliderPosition, sliderChanged);
	}
	function slidePaneCalculateMovement(slider, fakeMouse) {

		// Calculate (bounded) movement
		var sliderProperties = slider.datum();
		var mouse = fakeMouse ? fakeMouse : d3.mouse(d3.select("body").node());
		var sliderContainerMove = mouse[sliderProperties.sliderContainerMouseIndex] - sliderProperties.mouse[sliderProperties.sliderContainerMouseIndex];
		var paneAndSliderMove = mouse[sliderProperties.paneAndSliderMouseIndex] - sliderProperties.mouse[sliderProperties.paneAndSliderMouseIndex];
		if(sliderProperties.open) {
			if((paneAndSliderMove > 0 && !sliderProperties.isAtEnd) || (paneAndSliderMove < 0 && sliderProperties.isAtEnd)) {
				paneAndSliderMove = 0;
			}
		} else {
			var paneSize = sliderProperties.paneSize - Math.abs(sliderProperties.margin);
			if((paneAndSliderMove > paneSize && !sliderProperties.isAtEnd) || (-paneAndSliderMove > paneSize && sliderProperties.isAtEnd)) {
				paneAndSliderMove = tp_util_sign(paneAndSliderMove) * paneSize;
			}
		}

		return { paneAndSlider: paneAndSliderMove, sliderContainer: sliderContainerMove };
	}
	function slidePaneDrawFinal(slider, panePosition, sliderPosition, sliderChanged) {

		// Slider and pane don't share (logical) selection, therefore use 'tween' to synchronize them
		var sliderProperties = slider.datum();
		var pane = sliderProperties.pane;
		var paneStartPosition = tp_dom_getStyleValue(pane.node(), sliderProperties.panePositionStyle);
		var paneMoveDelta = panePosition - paneStartPosition;
		slider
			.transition()
				.duration(500)
				.style(sliderProperties.sliderPositionStyle, sliderPosition + "px")
				.tween("pane", function() {
					return function(t) {
						pane.style(sliderProperties.panePositionStyle, (paneStartPosition + paneMoveDelta * t) + "px");
						return t;
					};
				})
				.each("end", function() {

					// Set new open status
					if(sliderChanged) {
						sliderProperties.open = !sliderProperties.open;
					}

					// Make slider and pane responsive
					slider.style(sliderProperties.sliderPositionStyle, sliderProperties.open ? tp_dom_getViewPortSize(sliderPosition, sliderProperties.isVerticalPane) + (sliderProperties.isVerticalPane ? "vw" : "vh") : null);
					pane.style(sliderProperties.panePositionStyle, sliderProperties.open ? tp_dom_getViewPortSize(panePosition, sliderProperties.isVerticalPane) + (sliderProperties.isVerticalPane ? "vw" : "vh") : null);
					slider.classed("dragging", false);
					pane
						.classed("dragging", false)
						.classed("active", sliderProperties.open)
						.classed("open", sliderProperties.open)
					;
				})
		;
	}

	// Initialize tooltip on selection
	function initializeTooltip(selection, sourceSelection) {
		var tooltip = sourceSelection.attr("data-tooltip");
		if(tooltip !== null) {
			if(tooltip.substr(0, 1) === "#") {
				tooltip = tp_lang_getText(tooltip.substr(1));	// Strip '#'
			}
			selection.attr("data-tooltip-position", sourceSelection.attr("data-tooltip-position"));
			sourceSelection
				.on("change.tooltip", function() {
					selection.attr("data-tooltip-text", tp_util_formatString(tooltip, sourceSelection.attr("value")));
				})
				.each(function() {
					d3.select(this).on("change.tooltip").apply(this);
				})
			;
		}
	}

	// Initialize help button
	function initializeHelpButton() {
		
		// Drag behavior for help button
		var draggable = d3.behavior.drag()
			.on("dragstart", function() {
				var helpButton = d3.select(this);
				var duplicate = d3.select(this.parentNode).select(".help.duplicate");

				// Add help info to help datum
				helpButton.datum({
					duplicate: duplicate,
					offset: d3.mouse(this),
					hovering: null
				});

				// Highlight duplicate
				duplicate.classed("dragging", true);
			})
			.on("drag", function() {
				var helpButton = d3.select(this);
				var helpProperties = helpButton.datum();
				var duplicate = helpProperties.duplicate;

				// Calculate new position
				var position = d3.mouse(d3.select("body").node());

				// Check element at cursor
				var element = document.elementFromPoint(position[0], position[1]);
				var found = false;
				while(element && element.tagName) {
					var elm = d3.select(element);
					if(elm.attr("data-tooltip-text")) {

						// Make element hovering
						var hovering = helpProperties.hovering;
						if(hovering !== element) {
							if(hovering !== null) {
								d3.select(hovering).classed("hovering", false);
							}
							helpProperties.hovering = element;
							elm.classed("hovering", true);
						}
						element = null;
						found = true;
					} else {
						element = element.parentNode;
					}
				}
				if(!found) {
					if(helpProperties.hovering) {
						d3.select(helpProperties.hovering).classed("hovering", false);
						helpProperties.hovering = null;
					}
				}

				// Update position of duplicate (make it responsive)
				duplicate
					.style("left", tp_dom_getViewPortSize(position[0] - helpProperties.offset[0], true) + "vw")
					.style("top", tp_dom_getViewPortSize(position[1] - helpProperties.offset[1], false) + "vh")
				;
			})
			.on("dragend", function() {

				// Remove highlight from duplicate and restore position
				var helpButton = d3.select(this);
				var helpProperties = helpButton.datum();
				var duplicate = helpProperties.duplicate;
				duplicate
					.style("left", null)	// Remove temporary position (return to predefined position)
					.style("top", null)
					.classed("dragging", false)
				;

				// Remove hovering on last element hovered
				if(helpProperties.hovering) {
					d3.select(helpProperties.hovering).classed("hovering", false);
					helpProperties.hovering = null;
				}
			})
		;

		// Create duplicate for help button and add draggable behavior
		d3.selectAll("span.help").each(function() {
			var helpButton = d3.select(this);
			d3.select(tp_dom_appendSibling(helpButton.node().cloneNode(true), this))
				.classed("duplicate", true)
			;
			helpButton.call(draggable);
		});
	}

	// Initialize input fields
	function initializeInputFields() {
		d3.selectAll("input").each(function() {
			var input = d3.select(this);
			if(input.attr("type") !== "hidden" && !input.attr("tabindex")) {
				input.call(tp_d3_makeKeyboardSelectable);
			}
		});
	}

	// Initialize text fields
	function initializeTextFields(selection) {
		if(selection === undefined) {
			selection = d3.select("body");
		}
		selection.selectAll("[data-text]").each(function() {
			var element = d3.select(this);
			var text = element.attr("data-text");
			if(text.substr(0, 1) === "#") {
				text = tp_lang_getText(text.substr(1));	// Strip '#'
			}
			element.text(text);
		});
		selection.selectAll("[data-html]").each(function() {
			var element = d3.select(this);
			var text = element.attr("data-html");
			if(text.substr(0, 1) === "#") {
				text = tp_lang_getText(text.substr(1));	// Strip '#'
			}
			element.html(text);
		});
	}

	// Initialize polyfills
	function initializePolyfills() {
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
		if (!Array.prototype.find) {
			Array.prototype.find = function(predicate) {
				if (this === null) {
					throw new TypeError("Array.prototype.find called on null or undefined");
				}
				if (typeof predicate !== "function") {
					throw new TypeError("predicate must be a function");
				}
				var list = Object(this);
				var length = list.length >>> 0;
				var thisArg = arguments[1];
				var value;

				for (var i = 0; i < length; i++) {
					value = list[i];
					if (predicate.call(thisArg, value, i, list)) {
						return value;
					}
				}
				return undefined;
			};
		}
	}

	// Create polyfills
	initializePolyfills();

	// Handle initialization when document is fully loaded and processed
	if(typeof document !== "undefined") {
		d3.select(document)
			.on("readystatechange", function() {
				if(document.readyState === "complete" && tp_internals.loadingResources === 0) {
					tp_internals.initializers.forEach(function(initializer) {
						initializer();
					});
					tp_internals.externalInitializers.forEach(function(initializer) {
						initializer();
					});
				}
			})
			.on("readystatechange").apply(document)
		;
	}

	// Handle window resize
	if(typeof window !== "undefined") {
		d3.select(window).on("resize", function() {
			tp_internals.windowResizeHandlers.forEach(function(windowResizeHandler) {
				windowResizeHandler();
			});
		});
	}

	// Export tp and Class
	this.tp = tp;
	this.Class = Class;
}();
