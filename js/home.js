//
// This code needs major refactoring, documentation and care.
// It will be given in the coming months if usage is high enough.
//
// Author: Erik Stel (ErikOnBike at github)
// 

// Constants
var PI = Math.PI;
var CIRCLE = 2 * PI;
var HALF_CIRCLE = PI;
var QUARTER_CIRCLE = PI / 2;

// Load Sketchify product image
function loadSketchifyProductImage(url) {
	d3.xml(url, function(error, data) {
		if(error) {
			console.error(error);
			return;
		}
		if(!data) {
			console.error("No data retrieved for Sketchify product image");
			return;
		}

		// Show SVG
		var sketchifyProduct = d3.select("#sketchify");
		sketchifyProduct.append(function() { return data.documentElement; });

		// First or second SVG
		if(!sketchifyProduct.datum()) {

			// Update SVG size on resize
			var svgWidth = parseFloat(sketchifyProduct.select("svg").attr("width"));
			var svgHeight = parseFloat(sketchifyProduct.select("svg").attr("height"));
			var width = tp.dom.getStyleValue(sketchifyProduct.node(), "width");
			var height = width / svgWidth * svgHeight;
			sketchifyProduct.datum({
				originalSize: {
					width: width,
					height: height
				}
			});
			d3.select(window).on("resize", updateSketchifySize);
			updateSketchifySize();
		} else {

			// Start animation
			updateSketchifySize();
			startSketchifyAnimation();
		}
	});
}
function updateSketchifySize() {
	var sketchifyProduct = d3.select("#sketchify");
	var originalSize = sketchifyProduct.datum().originalSize;

	// Set size to fill container
	var width = tp.dom.getStyleValue(sketchifyProduct.node(), "width");
	var height = width / originalSize.width * originalSize.height;
	sketchifyProduct
		.style("height", height + "px")
		.selectAll("svg")
			.attr("width", width + "px")
			.attr("height", height + "px")
	;
}
function startSketchifyAnimation() {
	var sketchifyTransform = {
		width: 745,
		height: 315,
		squareSize: 1500,
		x: 372,
		previousX: 372,
		angle: 0,
		oldAngle: 0
	};
	var sketchifyProduct = d3.select("#sketchify");
	var clipping = sketchifyProduct.select("svg:last-of-type defs")
		.append("clipPath")
			.attr("id", "clip")
			.append("rect")
				.attr("x", -sketchifyTransform.squareSize)
				.attr("y", -(sketchifyTransform.squareSize - sketchifyTransform.height) / 2)
				.attr("width", sketchifyTransform.squareSize)
				.attr("height", sketchifyTransform.squareSize)
	;
	sketchifyProduct.select("svg:last-of-type > g")
		.style("clip-path", "url(#clip)")
	;

	var getSketchifyTransform = function(sketchifyTransform) {
		return "translate(" + sketchifyTransform.x + "," + (sketchifyTransform.height / 2) + ")rotate(" + sketchifyTransform.angle + ")translate(-" + sketchifyTransform.previousX + ",-" + (sketchifyTransform.height / 2) + ")";
	};
	var randomizeSketchifyTransform = function(sketchifyTransform) {
		sketchifyTransform.oldAngle = sketchifyTransform.angle;
		sketchifyTransform.angle += getRandomSign() * getRandom(30, 90);
		sketchifyTransform.previousX = sketchifyTransform.x;
		sketchifyTransform.x += getRandomSign() * getRandom(20, 60);

		// Retain x within bounds
		if(sketchifyTransform.x < 80) {
			sketchifyTransform.x = 80 + (80 - sketchifyTransform.x);
		} else if(sketchifyTransform.x > sketchifyTransform.width - 80) {
			sketchifyTransform.x = (sketchifyTransform.width - 80) - (sketchifyTransform.x - (sketchifyTransform.width - 80));
		}
	};
	var normalizeSketchifyTransform = function(sketchifyTransform) {
		while(sketchifyTransform.angle < 0) {
			sketchifyTransform.angle += 360;
		}
		while(sketchifyTransform.angle >= 360) {
			sketchifyTransform.angle -= 360;
		}
	};
	var getRandomSign = function() {
		return Math.random() >= 0.5 ? +1 : -1;
	};
	var getRandom = function(min, max) {
		return Math.random() * (max - min) + min;
	};
	var changeClippingPath = function() {
		clipping
			.attr("transform", function() {
				normalizeSketchifyTransform(sketchifyTransform);
				return getSketchifyTransform(sketchifyTransform);
			})
			.transition()
				.delay(1500)
				.duration(500)
				.ease("quad-in-out")
				.attr("transform", function() {
					randomizeSketchifyTransform(sketchifyTransform);
					return getSketchifyTransform(sketchifyTransform);
				})
				.each("end", changeClippingPath)
		;
	};

	// Start animating clipping path
	clipping
		.transition()
			.delay(2000)
			.duration(1000)
			.ease("sin")
			.attr("x", sketchifyTransform.width / 2 - sketchifyTransform.squareSize)
			.each("end", changeClippingPath)
	;
}

// Load sketchify product image
function loadSketchifyProductImages() {

	// Load images and
	loadSketchifyProductImage("sketchify1.svg");
	loadSketchifyProductImage("sketchify2.svg");
}

// Test activation
function testActivation() {
	var activationToken = tp.util.getQueryStringValue("activate");
	if(!tp.util.isEmpty(activationToken)) {
		tp.session.activateAccount(activationToken, function(error, data) {
			if(error) {
				console.error(error, data);
				tp.dialogs.showDialog("errorDialog", "#activate-failed")
					.on("ok", function() {
						doNavigate("/home.html");
					})
				;
				return;
			}

			// Handle successful activate account
			tp.session.setHasAccount();
			tp.dialogs.showDialog("messageDialog", "#activate-successful")
				.on("ok", function() {
					doNavigate("/home.html?signin=true");
				})
			;
		});
	}
}

// Test password reset
function testPasswordReset() {
	var passwordResetToken = tp.util.getQueryStringValue("password_reset");
	if(!tp.util.isEmpty(passwordResetToken)) {
		showChangePasswordDialog(passwordResetToken);
	}
}

// Test sign in
function testSignIn() {
	if(tp.util.getQueryStringValue("signin") === "true") {
		d3.select("#sign-in-button").on("click").apply(null);
	}
}

// Show sign in status and make sign in/out buttons visible
function showSignIn(visible) {
	if(arguments.length === 0) {
		tp.session.isSignedIn(function(error, data) {
			showSignIn(tp.session.getSignInToken() === null);
		});
		return;
	}
	d3.select(".top-sign-in").classed("hidden", !visible);
	d3.select(".top-sign-out").classed("hidden", visible);
	d3.select(".top-user-settings").classed("hidden", visible);
}

// Add event handler sign in button
function addEventHandlerSignInButton() {
	d3.select("#sign-in-button").on("click", function() {
		showSignInDialog(false, function() {
			showSignIn();
		});
	});
}

// Add event handler sign out button
function addEventHandlerSignOutButton() {
	d3.select("#sign-out-button").on("click", function() {
		signOut(function() {
			showSignIn(true);
		});
	});
}

// Add event handler user settings button
function addEventHandlerUserSettingsButton() {
	d3.select("#user-settings-button").on("click", function() {
		showUserSettingsDialog();
	});
}

// Add event handler Sketchify
function addEventHandlerSketchifyButton() {
	d3.select("#go-sketchify-button")
		.on("click", function() {
			tp.session.isSignedIn(function(error, data) {
				if(error) {
					tp.dialogs.showDialog("messageDialog", "#sign-in-first")
						.on("ok", function() {
							setApplicationRequested("/sketchify.html");
							d3.select("#sign-in-button").on("click").apply(null);
						})
					;
					return;
				}

				// Handle successful is signed in
				doNavigate("/sketchify.html");
			});
		})
	;
}

function addEventHandlerSketchifyLogo() {
	d3.select("#sketchify").on("click", function() {
		d3.select("#go-sketchify-button").on("click").apply(null);
	});
}

// Initialize Facebook like
function initializeFacebookLike() {
	var headElement = d3.select("head");
	headElement.append("script")
		.attr("id", "facebook-jssdk")
		.attr("src", "//connect.facebook.net/" + (tp.lang.default === "nl" ? "nl_NL" : "en_GB") + "/sdk.js#xfbml=1&version=v2.5")
	;
}

// Initialize Google like
function initializeGoogleLike() {
	window.___gcfg = {
		lang: tp.lang.default === "nl" ? "nl" : "en-GB",
		parsetags: 'onload'
	};
	var headElement = d3.select("head");
	headElement.append("script")
		.attr("src", "https://apis.google.com/js/platform.js")
		.attr("async", "")
		.attr("defer")
	;
}

// Initialize application
tp.util.addInitializer(function() {
	loadSketchifyProductImages();
	addEventHandlerSignInButton();
	addEventHandlerSignOutButton();
	addEventHandlerUserSettingsButton();
	addEventHandlerSketchifyButton();
	addEventHandlerSketchifyLogo();

	// Add Facebook/Google like button
	initializeFacebookLike();
	initializeGoogleLike();

	// Show sign in or sign out
	showSignIn();

	// Check for activation, password reset or sign in
	testActivation();
	testPasswordReset();
	testSignIn();
});
