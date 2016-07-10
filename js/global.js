//
// This code needs major refactoring, documentation and care.
// It will be given in the coming months if usage is high enough.
//
// Author: Erik Stel (ErikOnBike at github)
// 

// Assume d3.js and tp.js are loaded

// Load languages file
tp.lang.loadResources();

function doNavigate(url) {
	tp.util.navigate(url, { exclude: [ "activate", "password_reset", "signin" ] });
}

function doFeedback() {

	// Prevent original anchor
	d3.event.preventDefault();

	// Simple for HI, hopefully difficult enough for AI to comprehend
	var cnv = {
		'1': 'i',
		'2': 'to',
		'd': 'toolparadise.nl',
		'e': 'a',
		'f': 'Feedback',
		'n': 'info',
		's': 'subje',
		't': '@',
		'u': 'ct='
	};
	var href = "me1l2:ntd?suf".replace(/[^ml?:]/g, function(match) {
		return cnv[match];
	});
	doNavigate(href);
}

// Initialize application
tp.util.addInitializer(function() {

	// Add event handlers
	d3.selectAll(".home").on("click", function() {
		doNavigate("/home.html");
	});
	d3.select(".bottom-feedback a").on("click", doFeedback);
	d3.selectAll("[lang]").on("click", function() {
		tp.lang.setDefault(d3.select(this).attr("lang"));
	});
});
