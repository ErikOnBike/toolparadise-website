//
// This code needs major refactoring, documentation and care.
// It will be given in the coming months if usage is high enough.
// It will probably end up on public GitHub in that case.
//
// Author: Erik Stel (ErikOnBike at github)
// 

// Assume d3.js and tp.js are loaded

// Global variables
var applicationRequested = null;

// Show sign in dialog
function showSignInDialog(signInRequired, successCallback) {
	var dispatcher = tp.dialogs.showDialog("signInAndUpDialog", "#sign-in", {});
	addEventHandlerSignInDialog();
	dispatcher
		.on("ok", function() {
			signInOrSignUp(function() {
				tp.dialogs.closeDialog(dispatcher.target);
				if(successCallback) {
					successCallback();
				}
			});
			return false;
		})
		.on("cancel", function() {
			if(signInRequired) {
				tp.dialogs.showDialog("errorDialog", "#sign-in-required");
				return false;
			}
			setApplicationRequested(null);
			return true;
		})
	;

	return dispatcher;
}

// Sign in or sign up
function signInOrSignUp(successCallback) {
	var emailElement = d3.select("input[name=email]");
	var email = emailElement.property("value");
	var passwordElement = d3.select("input[name=password]");
	var password = passwordElement.property("value");
	var signIn = d3.select("input[name=operation]").property("value") === "sign-in";

	// Check for presence of email
	if(tp.util.isEmpty(email) || !validEmail(email)) {
		tp.dialogs.showDialog("errorDialog", tp.util.isEmpty(email) ? "#email-empty" : "#email-invalid")
			.on("ok", function() {
				emailElement.node().select();
			})
		;
		return;
	}

	// Handle sign in or sign up
	if(signIn) {

		// Check password
		if(tp.util.isEmpty(password)) {
			tp.dialogs.showDialog("errorDialog", "#no-credentials")
				.on("ok", function() {
					passwordElement.node().select();
				})
			;
			return;
		}
		if(password.length < 6) {
			tp.dialogs.showDialog("errorDialog", "#password-too-short")
				.on("ok", function() {
					passwordElement.node().select();
				})
			;
			return;
		}

		// Sign in
		var rememberMe = d3.select("input[name=persist-sign-in]").property("value") === "remember-me";
		var expires = rememberMe ? "false" : "true";
		var currentLanguage = tp.lang.default;
		tp.session.signIn(email, password, expires, function(error, data) {
			if(error) {
				tp.dialogs.showDialog("errorDialog", "#wrong-credentials")
					.on("ok", function() {
						passwordElement.node().select();
					})
				;
				return;
			}

			// Handle successful sign in
			tp.session.setHasAccount();
			tp.session.loadSettings('user.settings', function(error, settings) {
				if(!error) {
					tp.lang.setDefault(settings.lang);
				}
				if(applicationRequested) {
					doNavigate(applicationRequested);
				}
			});
			if(successCallback) {
				successCallback();
			}
		});
	} else {

		// Check for same passwords
		var password = d3.select("input[name=password]").property("value");
		var verifyPassword = d3.select("input[name=password-verify]").property("value");
		if(tp.util.isEmpty(password) || password.length < 6) {
			tp.dialogs.showDialog("errorDialog", "#password-too-short")
				.on("ok", function() {
					passwordElement.node().select();
				})
			;
			return;
		}
		if(password !== verifyPassword) {
			tp.dialogs.showDialog("errorDialog", "#passwords-different")
				.on("ok", function() {
					passwordElement.node().select();
				})
			;
			return;
		}

		// Sign up
		tp.session.createAccount(email, password, function(error, data) {
			if(error) {
				console.error(error, data);
				tp.dialogs.showDialog("errorDialog", "#account-add-failed");
				return;
			}

			// Handle successful sign up
			tp.dialogs.showDialog("messageDialog", "#activation-mail-sent")
				.on("ok", function() {
					if(successCallback) {
						successCallback();
					}
				})
			;
		});
	}
}

// Show change password dialog
function showChangePasswordDialog(passwordResetToken) {
	var errorCallback = function(error, data) {

		// Special case when old password did not match
		if(!passwordResetToken && !error && data && data["resultCode"] === "NOT_FOUND") {
			tp.dialogs.showDialog("errorDialog", "#wrong-password");
		} else {
			console.error(error, data);
			tp.dialogs.showDialog("errorDialog", "#password-change-failed")
				.on("ok", function() {
					if(passwordResetToken) {
						doNavigate("/home.html");
					}
				})
			;
		}
	};
	var changeDispatcher = tp.dialogs.showDialog("changePasswordDialog", tp.lang.getText(passwordResetToken ? "password-change" : "change-password"));
	if(!passwordResetToken) {
		d3.select(".password-old").classed("hidden", false);
	}
	changeDispatcher
		.on("ok", function() {
			var oldPasswordElement = d3.select("input[name=password-old]");
			var oldPassword = oldPasswordElement.property("value");
			var newPasswordElement = d3.select("input[name=password-new]");
			var newPassword = newPasswordElement.property("value");
			var verifyPassword = d3.select("input[name=password-verify]").property("value");
			if(!passwordResetToken) {
				if(tp.util.isEmpty(oldPassword) || oldPassword.length < 6) {
					tp.dialogs.showDialog("errorDialog", "#password-too-short")
						.on("ok", function() {
							oldPasswordElement.node().select();
						})
					;
					return false;
				}
			}
			if(tp.util.isEmpty(newPassword) || newPassword.length < 6) {
				tp.dialogs.showDialog("errorDialog", "#password-too-short")
					.on("ok", function() {
						newPasswordElement.node().select();
					})
				;
				return false;
			}
			if(newPassword !== verifyPassword) {
				tp.dialogs.showDialog("errorDialog", "#passwords-different")
					.on("ok", function() {
						newPasswordElement.node().select();
					})
				;
				return false;
			}
			if(passwordResetToken) {
				tp.session.resetPassword(passwordResetToken, newPassword, function(error, data) {
					if(error) {
						errorCallback(error, data);
					} else {
						tp.dialogs.showDialog("messageDialog", "#password-reset-change-successful")
							.on("ok", function() {
								doNavigate("/home.html?signin=true");
							})
						;
					}
				});
			} else {
				tp.session.changePassword(oldPassword, newPassword, function(error, data) {
					if(error) {
						errorCallback(error, data);
					} else {
						tp.dialogs.closeDialogWithMessage(changeDispatcher.target, "messageDialog", "#password-change-successful");
					}
				});
			}
			return false;
		})
		.on("cancel", function() {
			tp.dialogs.closeDialogWithMessage(changeDispatcher.target, "messageDialog", "#password-no-change");
			return false;
		})
	;
}

// Show user settings dialog
function showUserSettingsDialog() {
	var dispatcher = tp.dialogs.showDialog("userSettingsDialog", "#user-settings");
	addEventHandlerUserSettingsDialog();
	var languageElement = d3.select("input[name=language]");
	var currentLanguage = languageElement.property("value");
	dispatcher
		.on("ok", function() {
			var newLanguage = languageElement.property("value");
			tp.session.storeSettings('user.settings', { lang: newLanguage }, function(error, data) {
				if(error) {
					console.error(error, data);
					tp.dialogs.closeDialogWithMessage(dispatcher.target, "errorDialog", "#store-settings-failed");
				} else {
					tp.lang.setDefault(newLanguage);	// Use chosen language for following dialogs
					tp.dialogs.closeDialog(dispatcher.target);
				}
			});
			return false;
		})
		.on("cancel", function() {
			tp.lang.setDefault(currentLanguage);
		})
	;
}

// Sign out
function signOut(callback) {
	tp.session.signOut(function(error, data) {
		if(error) {
			console.error("Failed sign out", error, data);
		}

		if(callback) {
			callback();
		}
	});
}

// Add event handlers for sign in dialog
function addEventHandlerSignInDialog() {
	addEventHandlerSignInSignUp();
	addEventHandlerForgotPasswordButton();
}

// Add event handlers for user settings dialog
function addEventHandlerUserSettingsDialog() {
	addEventHandlerChangeLanguage();
	addEventHandlerChangePasswordButton();
}

// Add event handler sign in account button
function addEventHandlerSignInSignUp() {
	d3.select("input[name=operation]").on("change", function() {
		var signIn = d3.select(this).property("value") === "sign-in";
		d3.select("#forgot-password-button").classed("hidden", !signIn);
		d3.select(".persist-sign-in").classed("hidden", !signIn);
		d3.select(".password-verify").classed("hidden", signIn);
		d3.select(".sign-in.sign-up.dialog span.content").text(tp.lang.getText(signIn ? "sign-in" : "sign-up"));
	});
}

// Add event handler forgot password button
function addEventHandlerForgotPasswordButton() {
	d3.select("#forgot-password-button").on("click", function() {
		d3.event.preventDefault();
		var emailElement = d3.select("input[name=email]");
		var email = emailElement.property("value");
		if(tp.util.isEmpty(email) || !validEmail(email)) {
			tp.dialogs.showDialog("errorDialog", "#password-reset-email-invalid")
				.on("ok", function() {
					emailElement.node().select();
				})
			;
			return;
		}
		var confirmDispatcher = tp.dialogs.showDialog("confirmDialog", tp.lang.getFormattedText("password-reset-confirm", email))
			.on("ok", function() {
				tp.session.sendPasswordReset(email, function(error, data) {
					if(error) {
						console.error(error, data);
						tp.dialogs.closeDialogWithMessage(confirmDispatcher.target, "errorDialog", "#password-reset-failed");
						return;
					}

					// Handle successful send passwors reset
					tp.dialogs.closeDialogWithMessage(confirmDispatcher.target, "messageDialog", "#password-reset-successful");
				});
				return false;
			})
		;
	});
}

// Add event handler for change language
function addEventHandlerChangeLanguage() {

	// Add update handler
	var languageElement = d3.select("input[name=language]");
	languageElement.on("change", function() {
		tp.lang.setDefault(d3.select("input[name=language]").property("value"));
	});

	// Set default value
	tp.d3.updateInput(languageElement, tp.lang.default);
}

// Add event handler for change password button
function addEventHandlerChangePasswordButton() {
	d3.select("#change-password-button").on("click", function() {
		d3.event.preventDefault();
		showChangePasswordDialog();
	});
}

// Test email address (only very rudimentory check for presence @ and . in domain)
function validEmail(email) {
	return /^.+@.+\..+$/.test(email);
}

// Keep track of application request
function setApplicationRequested(newApplicationRequested) {
	applicationRequested = newApplicationRequested;
}
