//
// This code needs major refactoring, documentation and care.
// It will be given in the coming months if usage is high
// enough. It will probably end up on public GitHub in that
// case.
//
// Author: Erik Stel (ErikOnBike at github)
// 

// Default profiles
var profiles = [
	{
		textId: "profile-fine",
		properties: {
			"draw-thickness": "20,30",
			"draw-thickness-distribution": "uniform",
			"draw-randomness": "30,40",
			"draw-randomness-distribution": "uniform",
			"fill-thickness": "20,30",
			"fill-thickness-distribution": "uniform",
			"fill-accuracy": "25,35",
			"fill-accuracy-distribution": "uniform",
			"fill-distance": "30,40",
			"fill-distance-distribution": "uniform",
			"fill-angle": "125,145",
			"fill-angle-distribution": "uniform",
			"draw-opacity": "70,80",
			"draw-opacity-distribution": "uniform",
			"fill-opacity": "70,80",
			"fill-opacity-distribution": "uniform",
			"font-size": "-20,-20",
			"font-size-distribution": "uniform",
			"color-opacity-options": "ignore-transparent-layers"
		}
	},
	{
		textId: "profile-coarse",
		properties: {
			"draw-thickness": "20,60",
			"draw-thickness-distribution": "uniform",
			"draw-randomness": "30,60",
			"draw-randomness-distribution": "uniform",
			"fill-thickness": "20,60",
			"fill-thickness-distribution": "uniform",
			"fill-accuracy": "30,60",
			"fill-accuracy-distribution": "uniform",
			"fill-distance": "40,70",
			"fill-distance-distribution": "uniform",
			"fill-angle": "125,145",
			"fill-angle-distribution": "uniform",
			"draw-opacity": "70,80",
			"draw-opacity-distribution": "uniform",
			"fill-opacity": "70,80",
			"fill-opacity-distribution": "uniform",
			"font-size": "-25,-15",
			"font-size-distribution": "uniform",
			"color-opacity-options": "ignore-transparent-layers"
		}
	},
	{
		textId: "profile-kid",
		properties: {
			"draw-thickness": "20,80",
			"draw-thickness-distribution": "uniform",
			"draw-randomness": "30,80",
			"draw-randomness-distribution": "uniform",
			"fill-thickness": "20,80",
			"fill-thickness-distribution": "uniform",
			"fill-accuracy": "30,80",
			"fill-accuracy-distribution": "uniform",
			"fill-distance": "30,80",
			"fill-distance-distribution": "uniform",
			"fill-angle": "35,145",
			"fill-angle-distribution": "uniform",
			"draw-opacity": "70,80",
			"draw-opacity-distribution": "uniform",
			"fill-opacity": "70,80",
			"fill-opacity-distribution": "uniform",
			"font-size": "-30,-10",
			"font-size-distribution": "uniform",
			"color-opacity-options": "ignore-transparent-layers"
		}
	},
	{
		textId: "profile-custom",
		properties: {}
	}
];

// Keep track of state
var state = null;
var State = Class.create({

	// Constructor
	initialize: function() {
		this.properties = {
			imageLoaded: "false",
			imageSketched: "false",
			imageDirty: "false",
			profileDirty: "false",
			profileIndex: "0",
			previewSketched: "false",
			openTab: "fake"
		};
		this.listeners = [];
	},

	// Public methods
	getProperty: function(name) {
		return this.properties[name];
	},
	setProperty: function(name, value) {
		var properties = this.properties;
		if(properties[name] !== undefined && properties[name] !== null && properties[name] !== value) {
			properties[name] = value;
			this.fireChangeEvent();
		}
	},
	addListener: function(listener) {
		this.listeners.push(listener);
	},
	fireChangeEvent: function() {
		this.listeners.forEach(function(listener) {
			listener();
		});
	}
});

// Initialize state
state = new State();

// Update sign post
var signPost = null;
var signs = [
	//	imageLoaded	imageSketched	imageDirty	profileDirty	previewSketched	openTab		text			position
	[	"false",	undefined,	undefined,	undefined,	undefined,	"",		"sp-load-svg",		[ "30vw", "20vh" ] ],
	[	"false",	undefined,	undefined,	undefined,	undefined,	"home",		"sp-load-svg-button",	[ "10vw", "10vh" ] ]
];
var stateFields = [
	"imageLoaded",
	"imageSketched",
	"imageDirty",
	"profileDirty",
	"previewSketched",
	"openTab"
];

function updateButtonStates() {

	// Allow download/apply/reset as soon as image is loaded (better usage if user reloads)
	var imageLoaded = state.getProperty("imageLoaded") === "true";
	var profileDirty = state.getProperty("profileDirty") === "true";
	d3.select("#download-button").attr("disabled", imageLoaded ? null : "true");
	d3.selectAll("button.apply").attr("disabled", imageLoaded ? null : "true");
	d3.select("#reset-button").attr("disabled", imageLoaded ? null : "true");
	d3.select("#save-profile-button").attr("disabled", profileDirty ? null : "true");
}

function updateSignPost() {

	// Update sign post after a short wait (give user some time to adjust)
	if(updateSignPost.delayedUpdate) {
		clearTimeout(updateSignPost.delayedUpdate);
		updateSignPost.delayedUpdate = null;
	}
	updateSignPost.delayedUpdate = window.setTimeout(function() {
		updateSignPostNow();
	}, 2000);
}

function updateSignPostNow() {
	signs.forEach(function(sign) {
		if(stateFields.every(function(fieldName, index) {
			var signFilterValue = sign[index];
			return signFilterValue === undefined || signFilterValue === state.getProperty(fieldName);
		})) {
			if(!signPost) {
				signPost = d3.select(".sign-post");
				signPost.datum({ visible: false })
			}
			signPost
				.html(tp.lang.getText(sign[stateFields.length]))
				.style("top", sign[stateFields.length + 1][1])
				.style("left", sign[stateFields.length + 1][0])
				.transition()
					.duration(600)
					.style("opacity", 1.0)
					.each("end", function() {
						signPost.datum().visible = true;
					})
			;
		}
	});
}

function hideSignPost() {
	if(!signPost) {
		signPost = d3.select(".sign-post");
		signPost.datum({ visible: false })
	}
	if(signPost.datum().visible) {
		signPost
			.transition()
				.duration(200)
				.style("opacity", 0.0)
				.each("end", function() {
					signPost.datum().visible = false;
					updateSignPost();
				})
		;
	} else {
		updateSignPost();
	}
}
/*
document.addEventListener('mousedown', hideSignPost);
document.addEventListener('mousemove', hideSignPost);
*/
state.addListener(function() {
	updateButtonStates();
	updateHelp();
	//updateSignPost();
});

// Load resources (load language and dialogs)
tp.lang.loadResources();

// Initialize session management (with duplication handler)
var noSessionStorage = false;
var duplicateSession = false;
tp.session.initialize(function() {
	noSessionStorage = true;
}, function() {
	duplicateSession = true;
});

function keepState() {
	window.sessionStorage.setItem("state", JSON.stringify(state.properties));
	window.sessionStorage.setItem("profile", JSON.stringify(getProfileSettings()));
}

function restoreState() {
	var previousState = window.sessionStorage.getItem("state");
	if(previousState) {
		previousState = JSON.parse(previousState);
		tp.util.addProperties(state.properties, previousState);
	}
	var previousProfile = window.sessionStorage.getItem("profile");
	if(previousProfile) {
		previousProfile = JSON.parse(previousProfile);
		applySettings(previousProfile);
		if(previousState && previousState.profileIndex) {
			updateProfiles();
			tp.d3.updateInput(d3.select("#profile"), +previousState.profileIndex);
		}
	}
}

// Validate (and update) session
function validateSession(successCallback) {
	tp.session.currentSession(function(error, data) {
		if(error) {
			tp.session.signOut();
			tp.dialogs.showDialog("errorDialog", "#session-failure")
				.on("ok", function() {
					showSignInDialog(true, signedIn);
				})
			;
		} else {
			successCallback(data["sessionNew"]);
		}
	});
}

// Update profiles
function updateProfiles() {

	// Add default profiles, user profiles and one custom profile
	var select = d3.select(".select.profile");
	var options = profiles.map(function(profile) {
		if(profile.textId) {
			if(profile.textId !== "profile-custom" || state.getProperty("profileDirty") === "true") {
				return tp.lang.getText(profile.textId);
			}
		} else if(profile.text) {
			return profile.text;
		}
		return null;
	}).filter(function(option) {
		return !tp.util.isEmpty(option);
	});
	tp.controls.selectSetOptions(select, options);
}

// Retrieve settings (as object) or parameters (as JSON string)
function loadSettings(callback) {
	tp.session.loadSettings('sketchify.profiles', function(error, settings) {
		if(error) {
			console.error("Failed to load profiles", error, settings);
			tp.dialogs.showDialog("errorDialog", "#load-settings-failed");
		} else {

			// Update profiles
			if(settings.profiles) {
				var spliceArgs = [ 3, profiles.length - 4 ].concat(settings.profiles);
				Array.prototype.splice.apply(profiles, spliceArgs);
				updateProfiles();
			}

			console.log("Loaded profiles");

			// Perform callback
			if(callback) {
				callback();
			}
		}
	});

	tp.session.loadSettings('sketchify.options', function(error, settings) {
		if(error) {
			console.error("Failed to load options", error, settings);
			tp.dialogs.showDialog("errorDialog", "#load-settings-failed");
		} else {

			// Update other settings
			applySettings(settings.options);
		}
	});
}

function getSettingsProfiles() {
	return {
		profiles: profiles.slice(3, -1),
	};
}

function getSettingsOptions() {
	return {
		options: {
			"options-tooltips": d3.select("input[name=options-tooltips]").property("value"),
			"options-preview": d3.select("input[name=options-preview]").property("value"),
			"options-progress": d3.select("input[name=options-progress]").property("value"),
			"options-advanced": d3.select("input[name=options-advanced]").property("value")
		}
	};
}

function getProfileSettings() {
	return {
		"draw-thickness": d3.select("input[name=draw-thickness]").property("value"),
		"draw-thickness-distribution": d3.select("input[name=draw-thickness-distribution]").property("value"),
		"draw-randomness": d3.select("input[name=draw-randomness]").property("value"),
		"draw-randomness-distribution": d3.select("input[name=draw-randomness-distribution]").property("value"),
		"fill-thickness": d3.select("input[name=fill-thickness]").property("value"),
		"fill-thickness-distribution": d3.select("input[name=fill-thickness-distribution]").property("value"),
		"fill-accuracy": d3.select("input[name=fill-accuracy]").property("value"),
		"fill-accuracy-distribution": d3.select("input[name=fill-accuracy-distribution]").property("value"),
		"fill-distance": d3.select("input[name=fill-distance]").property("value"),
		"fill-distance-distribution": d3.select("input[name=fill-distance-distribution]").property("value"),
		"fill-angle": d3.select("input[name=fill-angle]").property("value"),
		"fill-angle-distribution": d3.select("input[name=fill-angle-distribution]").property("value"),
		"draw-opacity": d3.select("input[name=draw-opacity]").property("value"),
		"draw-opacity-distribution": d3.select("input[name=draw-opacity-distribution]").property("value"),
		"fill-opacity": d3.select("input[name=fill-opacity]").property("value"),
		"fill-opacity-distribution": d3.select("input[name=fill-opacity-distribution]").property("value"),
		"font-size": d3.select("input[name=font-size]").property("value"),
		"font-size-distribution": d3.select("input[name=font-size-distribution]").property("value"),
		"color-opacity-options": d3.select("input[name=color-opacity-options]").property("value")
	};
}

function applySettings(properties) {
	if(properties) {
		Object.keys(properties).forEach(function(key) {
			tp.d3.updateInput(d3.select("input[name=" + key + "]"), properties[key]);
		});
	}
}

// Handle preview
function initPreview() {
	// Start with unmodified (non-sketchified) sample
	d3.xml("sample.svg", function(error, data) {
		if(error || !data) {
			console.error("Failed to retrieve data for preview", error, data);
			return;
		}
		state.setProperty("previewSketched", "false");
		setPreviewImage(data.documentElement);
	});
}

function isPreviewHidden() {
	return d3.select("#global input[name=options-preview]").property("value") === "hide";
}

function updatePreview() {

	// Test if preview is hidden
	if(isPreviewHidden()) {
		return;
	}

	// Update sample svg
	tp.worker.send({ action: "getSample", properties: getProfileSettings() }, function(error, data) {
		if(error || !data || data["resultCode"] !== "OK") {
			console.error("Failed to get sample", error, data);
		} else {
			if(data["svg"]) {
				var svgDoc = (new DOMParser()).parseFromString(data["svg"], "image/svg+xml");
				if(svgDoc) {
					state.setProperty("previewSketched", "true");
					setPreviewImage(svgDoc.documentElement);
				}
			}
		}
	});
}

function updatePreviewDelayed() {

	// Test if preview is hidden
	if(isPreviewHidden()) {
		return;
	}

	// Update preview after short period (might be replaced by next call to updatePreviewDelayed)
	if(updatePreview.delayedUpdate) {
		clearTimeout(updatePreview.delayedUpdate);
		updatePreview.delayedUpdate = null;
	}
	updatePreview.delayedUpdate = window.setTimeout(function() {
		updatePreview();
	}, 600);
}

function setPreviewImage(documentElement) {

	// First remove previous preview
	var preview = d3.select("#preview");
	preview.selectAll("svg").remove();

	// Append new preview
	preview.append(function() { return documentElement; });

	// Fix for Chrome update
	if(!!window.chrome) {
		d3.selectAll("div.preview-block svg use").attr("xlink:href", "#preview-svg");
	}
}

// Handle drawing (sketch)
function updateDrawing(reset) {
	var svgOuterContainer = d3.select("#image > svg");
	var svgInnerContainer = svgOuterContainer.select("g");

	// Select existing SVG
	var svg = svgInnerContainer.select("svg");

	// Append new SVG
	d3.xml("/sessions/" + tp.session.getSessionToken() + "/sketchify/sketch.svg?" + Date.now(), function(error, data) {
		if(error || !data) {
			stopProgressMessage();
			console.error("Failed to retrieve data for sketch", error, data);
			return;
		}

		// Handle new SVG
		addFinishedDrawingTrigger(data.documentElement);
		var svgContent = svgInnerContainer.append(function() { return data.documentElement; });
		var svgProperties = svgOuterContainer.datum();
		if(!svgProperties || reset) {
			var viewBox = svgContent.attr("viewBox");
			if(viewBox) {
				viewBox = viewBox.replace(/[,\t ]+/, " ").split(" ").map(function(value) { return parseFloat(value); });
			} else {
				viewBox = [ svgContent.attr("width") || 1024, svgContent.attr("height") || 768 ];
			}
			var contentWidth = tp.dom.getStyleValue(svgContent.node(), "width");
			if(!contentWidth) {
				contentWidth = Math.max(viewBox[2] - viewBox[0], 0);
			}
			var contentHeight = tp.dom.getStyleValue(svgContent.node(), "height");
			if(!contentHeight) {
				contentHeight = Math.max(viewBox[3] - viewBox[1], 0);
			}
			var screen = d3.select("#screen");
			var screenWidth = tp.dom.getStyleValue(screen.node(), "width");
			var screenHeight = tp.dom.getStyleValue(screen.node(), "height");
			var scale = Math.min(screenWidth / contentWidth, screenHeight / contentHeight);
			svgProperties = {
				screenWidth: screenWidth,
				screenHeight: screenHeight,
				scale: scale,
				translate: [ 0, 0 ]
			};
			svgOuterContainer.datum(svgProperties);
		}
		function updateInnerContainer() {
			svgInnerContainer.attr("transform", "translate(" + svgProperties.translate + ")scale(" + svgProperties.scale + ")");
		}
		updateInnerContainer();
		svgOuterContainer
			.attr("width", svgProperties.screenWidth)
			.attr("height", svgProperties.screenHeight)
			.call(d3.behavior.zoom()
				.size([ svgProperties.screenWidth, svgProperties.screenHeight ])
				.scale(svgProperties.scale)
				.translate(svgProperties.translate)
				.on("zoom", function() {
					svgProperties.scale = d3.event.scale;
					svgProperties.translate = d3.event.translate;
					updateInnerContainer();
				})
			)
		;

		// Remove 'old' image
		svg.remove();		// Remove element from DOM

		// Store state info
		state.setProperty("imageLoaded", "true");
	});
}

function addFinishedDrawingTrigger(svgDoc) {

	// Trigger is based on animation (animation will start after svg is drawn)
	// Add g-node with specific class (rest of animation is defined in CSS)
	var node = d3.select(svgDoc).append("g").attr("class", "finishedDrawingTrigger").node();

	// Register the startanimation event (for the different browser flavours)
	node.addEventListener("mozAnimationStart", finishedDrawing, false);
	node.addEventListener("webkitAnimationStart", finishedDrawing, false);
	node.addEventListener("animationstart", finishedDrawing, false);
}

function finishedDrawing() {
	stopProgressMessage();
}

function removeDrawing() {
	state.setProperty("imageLoaded", "false");
	d3.select("#image > svg > g").select("svg").remove();
}

function isDrawingPresent() {
	return d3.select("#image > svg > g > svg").size() > 0;
}

function resetSVG() {

	// Check if drawing is present
	if(!isDrawingPresent()) {
		tp.dialogs.showDialog("errorDialog", "#session-empty");
		return;
	}

	// Send request to server
	startProgressMessage();
	tp.worker.send({ action: "resetSVG", sessionToken: tp.session.getSessionToken() }, function(error, data) {
		if(error || !data || data["resultCode"] !== "OK") {
			console.error("Failed to restore original", error, data);
			stopProgressMessage();
			tp.dialogs.showDialog("errorDialog", "#reset-failed");
		} else {
			state.setProperty("imageSketched", "false");
			state.setProperty("imageDirty", "false");
			updateDrawing();	// Will perform stopProgressMessage after drawing is drawn on screen
		}
	});
}

function sketchSVG() {
	validateSession(function(isNew) {
		if(isNew) {
			tp.dialogs.showDialog("errorDialog", isDrawingPresent() ? "#session-expired" : "#session-empty");
			removeDrawing();
			return;
		}
		if(state.getProperty("previewSketched") === "false") {
			updatePreview();
		}
		startProgressMessage("#progress-sketch");
		tp.worker.send({ action: "sketchSVG", properties: getProfileSettings(), sessionToken: tp.session.getSessionToken() }, function(error, data) {
			if(error || !data && data["resultCode"] !== "OK") {
				console.error("Failed to sketch", error, data);
				stopProgressMessage();
				tp.dialogs.showDialog("errorDialog", "#sketch-failed");
			} else {
				state.setProperty("imageSketched", "true");
				state.setProperty("imageDirty", "true");
				updateDrawing();	// Will perform stopProgressMessage after drawing is drawn on screen
			}
		});
	});
}

var progress = {
	dialog: null,
	timer: null,
	MAX_TIMEOUT: 15 * 1000		// 15 seconds
};
function startProgressMessage(message) {

	// In case progress message is already present, just reset timer
	stopProgressTimer();

	// Create dialog (if needed)
	if(!progress.dialog && !isProgressHidden()) {
		var dispatcher = tp.dialogs.showDialog("progressDialog", message || "#progress");
		progress.dialog = dispatcher.target;
	}

	// Start reset timer (just in case)
	progress.timer = window.setTimeout(function() {
		stopProgressMessage();
	}, progress.MAX_TIMEOUT);
}

function stopProgressMessage() {
	stopProgressTimer();
	var dialog = progress.dialog;
	if(dialog) {
		tp.dialogs.closeDialog(dialog);
		progress.dialog = null;
	}
}

function stopProgressTimer() {
	var timer = progress.timer;
	if(timer) {
		progress.timer = null;
		window.clearTimeout(timer);
	}
}

function isProgressHidden() {
	return d3.select("#global input[name=options-progress]").property("value") === "hide";
}

// Upload/download SVG
function showUploadDialog() {

	// Show upload dialog and handle events
	var dispatcher = tp.dialogs.showDialog("uploadDialog", "#upload-image");
	var uploadDialog = dispatcher.target;
	addEventHandlersUpload(function() {
		tp.dialogs.closeDialog(uploadDialog);
	});
}

function showDownloadDialog() {

	// Check if drawing is present
	if(!isDrawingPresent()) {
		tp.dialogs.showDialog("errorDialog", "#download-nothing");
		return;
	}

	// Show download dialog and handle events
	tp.dialogs.showDialog("downloadDialog", "#download-image");
	addEventHandlersDownload();
}

function uploadFile(successCallback) {
	var fileUpload = d3.select("#file-upload");
	var files = fileUpload.property("files");

	// Create SVG loader
	var loadSVG = function(file) {
		if(file.type !== "image/svg+xml") {
			tp.dialogs.showDialog("errorDialog", "#upload-not-svg");
		} else {
			var fileReader = new FileReader();
			fileReader.onload = function(evt) {
				if(evt && evt.target && evt.target.result) {
					uploadSVG(evt.target.result, file.name, successCallback);
				} else {
					console.error("Upload failed");
					tp.dialogs.showDialog("errorDialog", "#upload-failed");
				}
			};
			fileReader.onerror = function(evt) {
				console.error("Upload failed: " + evt.type);
				tp.dialogs.showDialog("errorDialog", "#upload-failed");
				
			};
			fileReader.readAsText(file);	// UTF-8 by default
		}
	}

	// Decide which file to load
	if(files.length > 1) {
		tp.dialogs.showDialog("confirmDialog", "#upload-too-many")
			.on("ok", function() {
				loadSVG(files[0]);
			})
		;
	} else if(files.length === 1) {
		loadSVG(files[0]);
	}

	// Reset form
	d3.select("form[name=upload-svg]").node().reset();
}

function uploadLink(url, successCallback) {

	if(!/^(http|https|ftp):\/\//.test(url)) {
		tp.dialogs.showDialog("errorDialog", "#upload-link-wrong-protocol");
		return;
	}

	var fileName = tp.util.getFileNameFromURL(url, "unknown.svg");
	if(fileName.slice(-4).toLowerCase() === ".svg") {
		uploadLinkWithFileName(url, fileName, successCallback);
	} else {
		tp.dialogs.showDialog("confirmDialog", "#none-svg-ext-confirm")
			.on("ok", function() {
				uploadLinkWithFileName(url, fileName, successCallback);
			})
		;
	}
}

function uploadLinkWithFileName(url, fileName, successCallback) {
	validateSession(function(isNew) {

		// Remove previous drawing
		removeDrawing();

		// Store file name for later download
		window.sessionStorage.setItem("fileName", fileName);

		// Handle upload
		startProgressMessage("#progress-upload");
		tp.worker.send({ action: "uploadLink", url: url, sessionToken: tp.session.getSessionToken() }, function(error, data) {
			if(error || !data || data["resultCode"] !== "OK") {
				console.error("Failed to upload link", error, data);
				stopProgressMessage();
				var errorMessages = {
					"SVG_TOO_BIG": "#upload-too-big",
					"INVALID_RESOURCE": "#upload-failed-resource"
				};
				tp.dialogs.showDialog("errorDialog", errorMessages[data["resultCode"]] || "#upload-failed");
			} else {
				state.setProperty("imageSketched", "false");
				state.setProperty("imageDirty", "false");
				if(successCallback) {
					successCallback();
				}
				updateDrawing(true);	// Will perform stopProgressMessage after drawing is drawn on screen
				showSVGProcessingWarnings(data);
			}
		});
	});
}

function uploadLink2(url, successCallback) {

	// Create SVG loader
	var loadSVG = function() {
		d3.text(url, "text/plain" /*"image/svg+xml"*/, function(error, data) {
			if(error || !data) {
				if(error && error.status === 404) {
					tp.dialogs.showDialog("errorDialog", "#upload-missing");
				} else {
					console.error("Failed to upload through URL: " + url, error, data);
					tp.dialogs.showDialog("errorDialog", data["resultCode"] === "SVG_TOO_BIG" ? "#upload-too-big" : "#upload-failed");
				}
			} else {
				uploadSVG(data, "noname.svg", successCallback);
			}
		});
	};

	var fileName = tp.util.getFileNameFromURL(url, "unknown.svg");
	if(fileName.slice(-4).toLowerCase() === ".svg") {
		loadSVG();
	} else {
		tp.dialogs.showDialog("confirmDialog", "#none-svg-ext-confirm")
			.on("ok", function() {
				loadSVG();
			})
		;
	}
}

function uploadSVG(svgString, fileName, successCallback) {

	validateSession(function(isNew) {

		// Remove previous drawing
		removeDrawing();

		// Store file name for later download
		window.sessionStorage.setItem("fileName", fileName);

		// Handle upload
		startProgressMessage("#progress-upload");
		tp.worker.send({ action: "uploadSVG", svg: svgString, sessionToken: tp.session.getSessionToken() }, function(error, data) {
			if(error || !data || data["resultCode"] !== "OK") {
				console.error("Failed to upload", error, data);
				stopProgressMessage();
				tp.dialogs.showDialog("errorDialog", data["resultCode"] === "SVG_TOO_BIG" ? "#upload-too-big" : "#upload-failed");
			} else {
				state.setProperty("imageSketched", "false");
				state.setProperty("imageDirty", "false");
				if(successCallback) {
					successCallback();
				}
				updateDrawing(true);	// Will perform stopProgressMessage after drawing is drawn on screen
				showSVGProcessingWarnings(data);
			}
		});
	});
}

function showSVGProcessingWarnings(data) {
	if(data["svgProcessed"]) {
		var svgProcessed = data["svgProcessed"];
		var processedItems = [];
		Object.keys(svgProcessed).forEach(function(key) {
			if(svgProcessed[key] === "true") {
				var message = tp.lang.getText("upload-processed-" + key);
				if(message) {
					processedItems.push(message);
				}
			}
		});
		if(processedItems.length > 0) {
			var dispatcher = tp.dialogs.showDialog("messageDialog", "#upload-processed");
			var dialog = dispatcher.target;
			dialog
				.style("width", tp.dom.getStyleValue(dialog.node(), "width") + "px")
			;
			var content = dialog.select("div.content").append("div");
			content
				.append("span")
					.attr("class", "warning")
					.text(tp.lang.getText("upload-processed2"))
			;
			content
				.append("ul")
					.attr("class", "warning")
					.selectAll("li")
					.data(processedItems)
					.enter()
						.append("li")
							.attr("class", "warning")
							.text(function(d) { return d; })
			;
		}
	}
}

function downloadSVG() {

	// Mark image as clean
	state.setProperty("imageDirty", "false");

	// Handle download
	tp.util.navigate(getDownloadURL(), { exclude: "*" });
}

function getDownloadFileName() {

	// Retrieve file name from session
	var fileName = window.sessionStorage.getItem("fileName");
	if(!fileName) {
		fileName = "noname.svg";
	}

	// Add sketchify tag in file name
	if(fileName.slice(-4).toLowerCase() === ".svg") {
		fileName = fileName.slice(0, -4) + ".sketchify" + fileName.slice(-4);
	} else {
		fileName = "sketchify." + fileName;
	}

	return fileName;
}

function getDownloadURL() {
	return tp.util.getNavigateURL("/php/download.php", {
		exclude: "*",
		include: {
			"session-token": tp.session.getSessionToken(),
			"file-name": getDownloadFileName()
		}
	});
}

// Event handler for profiles
var profilesChangeCounter = 0;
function addEventHandlersProfiles() {

	// Event handler for changed profile: update fields to reflect chosen profile
	var profile = d3.select("#profile");
	profile
		.on("change.profile", function() {
			profilesChangeCounter++;
			var profileId = +d3.select(this).property("value");
			var profile = profiles[profileId - 1];
			state.setProperty("profileIndex", "" + profileId);

			// If anything different than empty profile (which is the unsaved profile) is selected, profile is clean
			if(Object.keys(profile.properties).length > 0) {
				state.setProperty("profileDirty", "false");
				updateProfiles();
			}
			applySettings(profile.properties);
			profilesChangeCounter--;
		})
		.on("change.profile").apply(profile.node())
	;

	// Event handler for changed input fields: set profile to 'custom' and update preview
	d3.selectAll("input.custom").on("change.profile", function() {
		var profile = d3.select("#profile");
		var profileId = +profile.property("value");
		if(profileId !== profiles.length && profilesChangeCounter === 0) {
			state.setProperty("profileDirty", "true");
			updateProfiles();
			tp.d3.updateInput(profile, profiles.length);
		}
		keepState();
		if(d3.select(this).classed("direct")) {
			updatePreview();
		} else {
			updatePreviewDelayed();
		}
	});

	// Event handler for save profile button
	d3.select("#save-profile-button")
		.on("click", saveProfiles)
	;
}

// Load/save profiles
function saveProfiles() {
	var saveOptions = {
		options: [
		]
	};

	// Copy custom profiles in use
	if(profiles.length > 4) {
		saveOptions.options = profiles.slice(3, -1);
	}

	// Append empty custom profiles
	var emptyProfileName = tp.lang.getText("save-profile-empty");
	var defaultIndex = null;
	while(saveOptions.options.length < 6) {
		if(defaultIndex === null) {
			defaultIndex = saveOptions.options.length;
		}
		saveOptions.options.push({ value: "profile" + (saveOptions.options.length + 1), text: emptyProfileName, isNew: true });
	}
	saveOptions.default = saveOptions.options[defaultIndex !== null ? defaultIndex : 0].value;

	// Let user select custom profile slot
	tp.dialogs.showDialog("selectDialog", "#save-profile-title", saveOptions)
		.on("ok", function() {
			var optionId = d3.select(this).select("input[name=choice]").property("value");
			storeProfiles(saveOptions, optionId);
		})
	;
}

function storeProfiles(saveOptions, optionId) {
	var selectedOption = saveOptions.options.find(function(option) {
		return option.value === optionId;
	});
	if(selectedOption) {
		tp.dialogs.showDialog("inputDialog", "#save-profile-name", { input: selectedOption.isNew ? "" : selectedOption.text })
			.on("ok", function() {
				var optionText = d3.select(this).select("input[name=input]").property("value");
				storeSelectedProfile(saveOptions, selectedOption, optionText);
			})
		;
	}
}

function storeSelectedProfile(saveOptions, selectedOption, optionText) {
	if(tp.util.isEmpty(optionText)) {
		optionText = tp.lang.getText("save-profile-no-name");
	}
	selectedOption.text = optionText;
	selectedOption.properties = getProfileSettings();
	if(selectedOption.isNew) {
		delete selectedOption.isNew;
		selectedOption.value = "profile" + (profiles.length - 3);
		profiles.splice(-1, 0, selectedOption);
	}
	updateProfiles();
	profilesChangeCounter++;
	tp.d3.updateInput(d3.select("#profile"), 3 + (+selectedOption.value.replace("profile", "")));
	profilesChangeCounter--;
	tp.session.storeSettings('sketchify.profiles', getSettingsProfiles(), function(error, data) {
		if(error) {
			console.error("Failed to store profiles", error, data);
			tp.dialogs.showDialog("errorDialog", "#store-settings-failed");
		} else {
			state.setProperty("profileDirty", "false");
		}
	});
}

// Add event handlers for settings
function addEventHandlersSettings() {

	// Event handler for hide tooltips
	var optionTooltips = d3.select("input[name=options-tooltips]");
	optionTooltips
		.on("change.option", function() {
			d3.select("body").classed("tooltips-enabled", optionTooltips.property("value") !== "hide");
		})
		.on("change.option").apply(optionTooltips.node())	// Initialize
	;

	// Event handler for hide preview
	d3.select("input[name=options-preview]")
		.on("change.option", function() {

			// Show/hide previews
			var isHidden = isPreviewHidden();
			d3.selectAll(".preview-block")
				.style("display", isHidden ? "none" : "block")
			;

			// If shown, update preview once to be in line with settings
			if(!isHidden) {
				updatePreview();
			}
		})
	;

	// Event handler for advanced settings
	var advancedOptions = d3.select("input[name=options-advanced]");
	advancedOptions
		.on("change.option", function() {
			var advancedSelected = advancedOptions.property("value") === "yes";
			if(advancedSelected) {
				d3.selectAll(".with-distribution").style("width", "86%");
				d3.selectAll(".distribution").style("display", "inline-block");
			} else {
				d3.selectAll(".with-distribution").style("width", "100%");
				d3.selectAll(".distribution").style("display", "none");
			}
		})
		.on("change.option").apply(advancedOptions.node())	// Initialize
	;

	// Event handler for save settings
	d3.select("#save-options-button").on("click", saveSettings);
}

function saveSettings() {
	tp.session.storeSettings('sketchify.options', getSettingsOptions(), function(error, data) {
		if(error) {
			console.error("Failed to store options", error, data);
			tp.dialogs.showDialog("errorDialog", "#store-settings-failed");
		} else {
			console.log("Saved options");
			tp.dialogs.showDialog("messageDialog", "#store-settings-successful");
		}
	});
}

// Event handlers for help menu and help button: show text
function addEventHandlersHelpMenu(selection) {
	if(!selection) {
		selection = d3.select("body");

		// Add keyboard handler
		d3.selectAll("body,#main,#screen,#image").on("keydown", function() {
			if(d3.event.keyCode === 112) {
				d3.event.preventDefault();
				toggleMenu();
			}
		});
	}
	selection.select("span.help").on("click", function() {
		toggleMenu();
	});
	selection.selectAll(".menu-close").on("click", function() {
		d3.select("#help").classed("hidden", true);
	});
	selection.selectAll(".menu-main").on("click", function() {
		updateMenuContent("#help-content-main");
	});
	selection.selectAll(".menu-settings").on("click", function() {
		updateMenuContent("#help-content-settings");
	});
	selection.selectAll(".menu-guide").on("click", function() {
		updateMenuContent("#help-content-guide");
	});
	selection.selectAll(".menu-feedback").on("click", function() {
		updateMenuContent("#help-content-feedback");
	});
	selection.selectAll(".menu-about").on("click", function() {
		updateMenuContent("#help-content-about");
	});
	selection.selectAll("a[href=\"feedback.html\"]").on("click", doFeedback);
	selection.selectAll("i.anchor").on("click", function() {
		var anchorElement = d3.select(this);
		var anchorText = anchorElement.text();
		updateOpenTabState();
		var openTabText = state.getProperty("openTab");
		var openSlider = null;
		var closeSlider = null;
		d3.select(".slider-container").selectAll(".slider").each(function() {
			var sliderElement = d3.select(this);
			var sliderText = sliderElement.select("i.material-icons").text();
			if(sliderText === anchorText) {
				openSlider = sliderElement;
			}
			if(sliderText === openTabText) {
				closeSlider = sliderElement;
			}
		});

		// Decide which slider to close and to open
		if(closeSlider === openSlider) {
			openSlider = null;	// Only close slider if both are the same
		}
		if(closeSlider) {
			tp.d3.toggleSlider(closeSlider);
			if(!openSlider) {
				window.setTimeout(updateOpenTabState, 600);
			}
		}
		if(openSlider) {

			// Wait for other tab to close (depends on tp.js animation for now)
			window.setTimeout(function() {
				tp.d3.toggleSlider(openSlider);
				window.setTimeout(updateOpenTabState, 600);
			}, closeSlider ? 600 : 0);
		}
	});
}

function toggleMenu() {

	// Set context help
	updateMenuUsingContext();

	// Toggle menu
	var helpDialog = d3.select("#help");
	helpDialog.classed("hidden", !helpDialog.classed("hidden"));
}

var helpSteps = [
	//	imageLoaded	imageSketched	imageDirty	profileDirty	previewSketched	openTab		step
	[	"false",	undefined,	undefined,	undefined,	undefined,	undefined,	"step1" ],
	[	"true",		"false",	undefined,	"false",	undefined,	undefined,	"step3" ],
	[	"true",		"true",		"true",		undefined,	undefined,	"home",		"step4" ],
	[	"true",		"true",		"true",		undefined,	undefined,	"home",		"step4" ],
	[	"true",		"true",		"false",	undefined,	undefined,	undefined,	"step5" ],
	[	"true",		"true",		undefined,	undefined,	undefined,	"gesture",	"step6" ],
	[	"true",		"true",		undefined,	undefined,	undefined,	"format_paint",	"step6" ],
	[	"true",		"true",		undefined,	undefined,	undefined,	"palette",	"step6" ],
	[	"true",		"true",		undefined,	undefined,	undefined,	"format_size",	"step6" ],
	[	"true",		"true",		undefined,	"true",		undefined,	"",		"step7" ],
	[	"true",		"true",		undefined,	"true",		undefined,	"home",		"step7" ]
];

function updateMenuUsingContext() {
	updateMenuContent("#help-content-guide");
	updateMenuMiniGuideStep();
}

function updateMenuMiniGuideStep() {
	if(d3.select("#help .content").attr("data-html") !== "#help-content-guide") {
		return;
	}
	helpSteps.forEach(function(helpStep) {
		if(stateFields.every(function(fieldName, index) {
			var helpStepFilterValue = helpStep[index];
			return helpStepFilterValue === undefined || helpStepFilterValue === state.getProperty(fieldName);
		})) {
			var step = helpStep[stateFields.length];
			d3.selectAll("#help li.highlight").classed("highlight", false);
			d3.select("#help li." + step).classed("highlight", true);
			updateMenuMiniGuideScroll();
		}
	});
}

function updateMenuMiniGuideScroll() {
	var highlightedStep = d3.select("#help li.highlight");
	if(highlightedStep.size() === 1) {
		if(highlightedStep.classed("step6") || highlightedStep.classed("step7")) {
			d3.select("#help .content").node().scrollTop = 4000;
		}
	}
}

function updateMenuContent(helpID) {
	var helpElement = d3.select("#help");
	var headerElement = helpElement.select(".header");
	headerElement.selectAll("span.help-menu").classed("selected", false);
	headerElement.select("span.help-menu." + helpID.replace("#help-content-", "menu-")).classed("selected", true);
	var contentElement = helpElement.select(".content");
	contentElement.attr("data-html", helpID);
	tp.lang.updateText(helpElement);
	addEventHandlersHelpMenu(helpElement);
}

function updateHelp() {
	updateMenuMiniGuideStep();
	updateHelpSize();
}

function updateHelpSize() {
	var openTab = state.getProperty("openTab");
	d3.select("#help")
		.style("right", !openTab || openTab === "fake" ? "15vw" : "35vw")
	;
	updateMenuMiniGuideScroll();
}

// Event handlers for reset/apply button
function addEventHandlersResetButton() {
	d3.select("#reset-button").on("click", function() {
		resetSVG();
	});
}

function addEventHandlersApplyButton() {
	d3.selectAll("button.apply").on("click", function() {
		sketchSVG();
	});
}

// Event handlers for refresh buttons
function addEventHandlersRefreshButtons() {
	d3.selectAll(".refresh").on("click", function() {
		updatePreview();
	});
}

// Event handlers for distribution buttons
function addEventHandlersDistributionButtons() {
	d3.selectAll(".distribution button").on("click", function() {
		var button = d3.select(this);
		var inputName = button.attr("data-input-name");
		var inputField = d3.select("input[name=" + inputName + "-distribution]");
		var distributionOptions = {
			options: [
				{ value: "uniform", text: "#distribution-uniform" },
				{ value: "normalLarge", text: "#distribution-normalLarge" },
				{ value: "normalSmall", text: "#distribution-normalSmall" }
			],
			default: inputField.property("value")
		};
		tp.dialogs.showDialog("selectDialog", "#distribution-title", distributionOptions)
			.on("ok", function() {
				var distribution = d3.select(this).select("input[name=choice]").property("value");
				inputField.property("value", distribution);
				var rangeInput = d3.select("input[name=" + inputName + "]");
				var values = rangeInput.property("value").split(",");
				if(distribution === "uniform") {
					if(values.length !== 2) {
						tp.d3.updateInput(rangeInput, "" + values[0] + "," + values[2]);
					}
				} else {
					if(values.length !== 3) {
						tp.d3.updateInput(rangeInput, "" + values[0] + "," + Math.round((+values[0] + +values[1]) / 2) + "," + values[1]);
					}
				}
			})
		;
	});
}

// Event handlers user settings button
function addEventHandlersUserSettingsButton() {
	d3.select("#user-settings-button").on("click", function() {
		showUserSettingsDialog();
	});
}

// Event handlers sign out button
function addEventHandlersSignOutButton() {
	d3.select("#sign-out-button").on("click", function() {
		tp.dialogs.showDialog("confirmDialog", "#sign-out-confirm")
			.on("ok", function() {
				window.sessionStorage.removeItem("state");
				window.sessionStorage.removeItem("profile");
				window.sessionStorage.removeItem("fileName");
				tp.session.signOut(function(error, data) {
					if(error) {
						console.error("Failed to sign out", error, data);
					} else {
						console.log("Signed out successfully");
						doNavigate("/home.html");
					}
				});
			})
		;
	});
}

// Event handlers for upload/download buttons
function addEventHandlersUploadDownloadButtons() {

	// Upload button
	d3.select("#upload-button")
		.on("click", function() {
			showUploadDialog();
		})
	;

	// Download button
	d3.select("#download-button")
		.on("click", function() {
			showDownloadDialog();
		})
	;
}

// Event handlers showing SVG
function addEventHandlersShowSVG() {

	// Event handler for panning of SVG image
	var image = d3.select("#image");
	var imageNode = image.node();
	var drag = function() {

		// Calculate new scroll position
		var datum = image.datum();
		var mouse = d3.mouse(imageNode);
		var move = [ mouse[0] - datum.mouse[0], mouse[1] - datum.mouse[1] ];
		var scrollTop = Math.min(Math.max(datum.scrollTop - move[1], 0), datum.scrollTopMax);
		var scrollLeft = Math.min(Math.max(datum.scrollLeft - move[0], 0), datum.scrollLeftMax);

		// Change scroll position
		imageNode.scrollTop = scrollTop;
		imageNode.scrollLeft = scrollLeft;

		// Remember values for next time
		datum.mouse = mouse;
		datum.scrollTop = scrollTop;
		datum.scrollLeft = scrollLeft;
	};
	var draggable = d3.behavior.drag()
		.on("dragstart", function() {

			// Initialize info object with scroll and mouse location information
			image.datum({
				scrollTop: imageNode.scrollTop,
				scrollLeft: imageNode.scrollLeft,
				scrollTopMax: imageNode.scrollHeight - imageNode.clientHeight,
				scrollLeftMax: imageNode.scrollWidth - imageNode.clientWidth,
				mouse: d3.mouse(imageNode)
			});
		})
		.on("drag", drag)
		.on("dragend", function() {
			drag();
			image.datum(null);
		})
	;
	image.call(draggable);
}

// Add event handlers for sliders opening/closing
function addEventHandlersSliders() {
	d3.selectAll(".slider")
		.on("click.updateState", function() {

			// Allow slider to open/close (depends on animation in tp.js for now)
			window.setTimeout(updateOpenTabState, 600);
		})
	;
}

function updateOpenTabState() {
	var openTab = d3.select(".slide-pane.open");
	var isOpen = openTab.size() === 1;
	state.setProperty("openTab", isOpen ? openTab.attr("data-icon") : "");
}

// Add event handlers for download/upload
function addEventHandlersDownload() {
	d3.select("#store-locally-button")
		.on("click", function() {
			downloadSVG();
		})
	;
	d3.select("#store-in-dropbox-button")
		.on("click", function() {
			Dropbox.save({
				files: [ { url: getDownloadURL(), filename: getDownloadFileName() } ],

				success: function() {
					tp.dialogs.showDialog("messageDialog", "#download-success");

					// Mark image as clean
					state.setProperty("imageDirty", "false");
				},

				progress: function(progress) {
					// Ignore progress events for now
					//console.log("Upload at " + Math.floor(progress * 100) + "%");
				},

				cancel: function() {
					tp.dialogs.showDialog("messageDialog", "#download-cancelled");
				},

				error: function(errorMessage) {
					tp.dialogs.showDialog("errorDialog", tp.lang.getText("download-failed") + (errorMessage || "<no message>"));
				}
			});
		})
	;
}

function addEventHandlersUpload(successCallback) {

	// Set change handler to trigger file upload
	d3.select("#file-upload")
		.on("change", function() {
			uploadFile(successCallback);
		})
	;

	// Upload button (will on Safari/Chrome/IE need no further attention because it is overlapped by the file input control)
	var uploadButton = d3.select("#retrieve-locally-button");

	// Special handling for Firefox and IE (test for Firefox/IE features)
	if(window.mozPaintCount != undefined || window.mozInnerScreenX != undefined || window.msPerformance || window.msIsSiteMode || window.msIsStaticHTML) {
		uploadButton
			.on("click", function() {
				d3.select("#file-upload").node().click();
			})
		;
	}

	d3.select("#retrieve-from-dropbox-button")
		.on("click", function() {
			Dropbox.choose({
				success: function(files) {
					uploadLink(files[0].link, successCallback);
				},

				cancel: function() {
					tp.dialogs.showDialog("messageDialog", "#upload-cancelled");
				},

				linkType: "direct",

				multiselect: false,

				extensions: [ '.svg' ]
			});
		})
	;
	d3.select("#retrieve-link-button")
		.on("click", function() {
			tp.dialogs.showDialog("inputDialog", "#retrieve-link-name", { input: "http://" })
				.on("ok", function() {
					var url = d3.select(this).select("input[name=input]").property("value");
					uploadLink(url, successCallback);
				})
			;
		})
	;
	d3.select("#retrieve-example-button")
		.on("click", function() {
			//uploadLink("http://www.toolparadise.nl/example.svg", successCallback);	// Why does this fail since oct 2016?
			uploadLink("https://github.com/ErikOnBike/toolparadise-website/raw/master/example.svg", successCallback);
		})
	;
}

// Show sign in (not needed for this product page)
function showSignIn(visible) {
	// Nothing here
}

// Add event handlers and perform initialization
tp.util.addInitializer(function() {

	// Event handlers for profiles
	addEventHandlersProfiles();

	// Event handlers for help menu
	addEventHandlersHelpMenu();

	// Event handlers for upload/download buttons
	addEventHandlersUploadDownloadButtons();

	// Event handler for reset/apply buttons
	addEventHandlersResetButton();
	addEventHandlersApplyButton();

	// Event handlers for refresh buttons
	addEventHandlersRefreshButtons();

	// Event handlers for distribution buttons
	addEventHandlersDistributionButtons();

	// Event handler for user settings button
	addEventHandlersUserSettingsButton();

	// Event handler for sign out button
	addEventHandlersSignOutButton();

	// Event handlers for settings
	addEventHandlersSettings();

	// Event hanlders for showing SVG
	addEventHandlersShowSVG();

	// Event handlers for sliders
	addEventHandlersSliders();

	// Initialize application
	initApplication();
});

// Signed in
function signedIn() {
	loadSettings();
	console.log("Signed in successfully");
	showUploadDialog();
}

// Initialize application
function initApplication() {

	// Update profiles
	updateProfiles();

	// Load first preview (unsketched)
	initPreview();

	// Notify for wrong session support (tested before initApplication)
	if(noSessionStorage) {
		tp.dialogs.showDialog("errorDialog", "#no-session-storage")
			.on("ok", function() {
				doNavigate("/home.html");
			})
		;
		return;
	}
	if(duplicateSession) {
		//tp.dialogs.showDialog("errorDialog", "#duplicate-session-unsupported")
		//	.on("ok", function() {
				window.sessionStorage.removeItem("sessionToken");
				removeDrawing();
		//	})
		//;
	}

	var restoreStateFunc = function() {
		// Restore state
		restoreState();
		state.setProperty("openTab", "");	// Triggers update
		state.addListener(function() {
			keepState();
		});
	};

	var updateStateForNewSession = function() {

		// Reflect fact we have a new session
		state.setProperty("imageLoaded", "false");
		state.setProperty("imageSketched", "false");
		state.setProperty("imageDirty", "false");
		state.setProperty("previewSketched", "false");
	};

	// Decide if user needs to sign in and set initial state (to trigger first update)
	tp.session.isSignedIn(function(error, data) {
		if(error) {
			showSignInDialog(true, signedIn);
			restoreStateFunc();
			updateStateForNewSession();
		} else {
			loadSettings(restoreStateFunc);
			validateSession(function(isNew) {
				if(isNew) {
					updateStateForNewSession();
					showUploadDialog();
				} else {
					startProgressMessage();
					updateDrawing();	// Will perform stopProgressMessage after drawing is drawn on screen
				}
			});
		}

	});
}
