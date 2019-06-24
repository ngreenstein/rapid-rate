jsPsych.plugins["rapid-rate"] = (function() {

	var plugin = {};
	
	plugin.info = {
		name: "rapid-rate",
		description: "jsPsych plugin for quickly gathering percentage ratings of many items",
		parameters: {
			submitKey: {
				type: jsPsych.plugins.parameterType.KEYCODE,
				default: 32,
				no_function: false,
				description: "Code of key used to submit all ratings and end trial",
			},
			submitButton: {
				type: jsPsych.plugins.parameterType.BOOL,
				default: false,
				no_function: false,
				description: "Whether to show a submit button",
			},
			rightClickSubmit: {
				type: jsPsych.plugins.parameterType.BOOL,
				default: false,
				no_function: false,
				description: "Whether to submit by right-clicking anywhere",
			},
			allowBlank: {
				type: jsPsych.plugins.parameterType.BOOL,
				default: false,
				no_function: false,
				description: "Whether to allow user to submit ratings and end trial with blank/unrated items",
			},
			allowNone: {
				type: jsPsych.plugins.parameterType.BOOL,
				default: true,
				no_function: false,
				description: "Whether to allow user to supply a rating of 'none' rather than 0-100",
			},
			logCommits: {
				type: jsPsych.plugins.parameterType.BOOL,
				default: false,
				no_function: false,
				description: "Whether rapid-rate should record each time a rating is committed (captures order of ratings, timing, user changing their mind, etc).",
			},
			defaultNone: {
				type: jsPsych.plugins.parameterType.BOOL,
				default: false,
				no_function: false,
				description: "Whether to pre-select 'None' for all items",
			},
			showShadows: {
				type: jsPsych.plugins.parameterType.BOOL,
				default: false,
				no_function: false,
				description: "Whether to, when the user rated an item on the previous rapid-rate screen, show a shadow of that rating",
			},
			submitTimeout: {
				type: jsPsych.plugins.parameterType.INT,
				default: -1,
				description: "Number of seconds after which to automatically attempt to submit ratings. Pass a negative number to disable.",
			},
			items: {
				type: jsPsych.plugins.parameterType.ARRAY,
				default: [],
				no_function: false,
				description: "An array of strings representing names of items to rate",
			},
			topMsg: {
				type: jsPsych.plugins.parameterType.HTML_STRING,
				default: null,
				no_function: false,
				description: "A message or prompt to display above the ratings UI. Can be HTML; will be wrapped in a <p> tag.",
			},
			bottomMsg: {
				type: jsPsych.plugins.parameterType.HTML_STRING,
				default: null,
				no_function: false,
				description: "A message or prompt to display below the ratings UI. Can be HTML; will be wrapped in a <p> tag.",
			},
		},
	},

	plugin.trial = function(display_element, trial) {

		// Default parameter values
		trial.submitKey = typeof trial.submitKey == "undefined" ? 32 : trial.submitKey; // spacebar to submit by default
		trial.submitButton = typeof trial.submitButton == "undefined" ? false : trial.submitButton; // no submit button by default
		trial.rightClickSubmit = typeof trial.rightClickSubmit == "undefined" ? false : trial.rightClickSubmit; // no right-click submit by default
		trial.allowBlank = typeof trial.allowBlank == "undefined" ? false : trial.allowBlank; // disallow blanks by default
		trial.allowNone = typeof trial.allowNone == "undefined" ? true : trial.allowNone // allow 'none' ratings by default
		trial.logCommits = typeof trial.logCommits == "undefined" ? false : trial.logCommits // do not log commits by default
		trial.defaultNone = typeof trial.defaultNone == "undefined" ? false : trial.defaultNone // do not default to None by default
		trial.showShadows = typeof trial.showShadows == "undefined" ? false : trial.showShadows // do not show shadows by default
		trial.submitTimeout = typeof trial.submitTimeout == "undefined" ? -1 : trial.submitTimeout // do not automatically submit by default
		
		// Time mark and container for commit log
		var startTime = Date.now();
		var commitLog = [];
		
		// Generate DOM
		display_element.classList.add("rr-container");
		var ratingHtml = '<style type="text/css">\
		body {\
			background-color: black;\
			color: white;\
		}\
		\
		.jspsych-content {\
			text-align: left;\
		}\
		\
		.rr-rating-outer {\
			margin-bottom: 5px;\
			box-sizing: padding-box;\
		}\
		\
		.rr-rating-inner, .rr-rating-none {\
			border: 2px solid white;\
			display: inline-block;\
			padding-left: 4px;\
			padding-right: 4px;\
		}\
		\
		.rr-rating-inner {\
			width: 250px;\
			position: relative;\
		}\
		\
		.rr-rating-inner span {\
			pointer-events: none;\
			display: inline-block;\
		}\
		\
		.rr-outside-label {\
			padding-left: 5px;\
		}\
		\
		.rr-rating-none.chosen {\
			background: #ff816d;\
		}\
		\
		.rr-rating-fill {\
			background: #ff816d;\
			position: absolute;\
			top: 0;\
			bottom: 0;\
			left: 0;\
			z-index: -2;\
		}\
		\
		.rr-shadow {\
			background: gray;\
		}\
		\
		.rr-rating-fill.rr-shadow {\
			background: none;\
			border-right: 3px solid white;\
		}\
		\
		.rr-missing {\
			font-weight: bold;\
		}\
		.button {\
		  background-color: #ff816d; /* Green */\
		  border: none;\
		  color: white;\
		  padding: 15px 32px;\
		  text-align: center;\
		  text-decoration: none;\
		  display: inline-block;\
		  font-size: 16px;\
		}\
		.rr-rating-outer[data-rr-rating] {\
			color: silver;\
		}\
		</style>\
		<p>' + trial.topMsg + '</p>\n';
		
		lastVals = {};
		if (trial.showShadows) {
			shadowCol = jsPsych.data.get().select("rr-shadow-ratings")
			if (shadowCol.count() > 0) {
				lastVals = shadowCol.values[0];
			}
		}
		
		for (var i = 0; i < trial.items.length; i ++) {
			var thisItem = trial.items[i];
			ratingHtml += '<div class="rr-rating-outer" data-rr-item="' + thisItem + '"';
			if (trial.defaultNone) {
				ratingHtml += ' data-rr-rating="-1"';
			}
			ratingHtml += '>\n';
			if (trial.allowNone) {
				ratingHtml += '\t<div class="rr-rating-none'
				if (trial.defaultNone) {
					ratingHtml += ' chosen';
				}
				if (trial.showShadows && lastVals[thisItem] && lastVals[thisItem] < 0) {
					ratingHtml += ' rr-shadow';
				}
				ratingHtml += '">None</div>\n';
			}
			ratingHtml += '\t<div class="rr-rating-inner">\n';
			ratingHtml += '\t\t<span></span>\n';
			ratingHtml += '\t\t<div class="rr-rating-fill"></div>\n';
			if (trial.showShadows && lastVals[thisItem] && lastVals[thisItem] >= 0) {
				ratingHtml += '\t\t<div class="rr-rating-fill rr-shadow" data-rr-shadow="' + lastVals[thisItem] + '"></div>\n';
			}
			ratingHtml += '\t</div>\n';
			ratingHtml += '\t<span class="rr-outside-label">' + thisItem + '</span>\n';
			ratingHtml += '</div>\n';
		};
		
		if (trial.bottomMsg) {
			ratingHtml += '<p>' + trial.bottomMsg + '</p>\n';
		}
		
		// Add a submit button if specified
		if (trial.submitButton) {
			ratingHtml += "<input type='button' id='submitBtn' value='Submit' class='button'/>\n"	;
		}
		
		display_element.innerHTML = ratingHtml;
		
		// All rows should be the same, so use the first one to cache offset/width info
		var sampleRow = $(".rr-rating-inner").first();
		var leftOffset = sampleRow.offset().left + parseInt(sampleRow.css("borderLeftWidth"), 10); //Subtract the border width
		var width = sampleRow.innerWidth();
		
		// Size shadow bars once the width is established
		if (trial.showShadows) {
			$(document).ready(function() {
				$(".rr-rating-fill.rr-shadow").each(function() {
					$(this).width(Math.ceil(($(this).attr("data-rr-shadow") / 100) * width));
				});
			});
		}
		
		// When the user enters the rating bar, hide any highight in the None box
		$(".rr-rating-inner").mouseenter(function(event) {
			var target = $(event.target);
			target.attr("data-rr-justcommitted", "false");
			target.siblings(".rr-rating-none").removeClass("chosen");
		});
		
		// Commit a rating
		$(".rr-rating-inner").click(function(event) {
			var target = $(event.target);
			var rating = target.attr("data-rr-fill");
			if (trial.logCommits) {
				var timeOffset = Date.now() - startTime;
				var item = target.parent().attr("data-rr-item");
				var logEntry = {
					time: timeOffset,
					item: item,
					rating: rating,
				};
				commitLog.push(logEntry);
			}
			target.attr("data-rr-justcommitted", "true");
			target.parent().attr("data-rr-rating", rating).removeClass("rr-missing");
		});
		
		// Update the rating bar highlight as the mouse moves
		$(".rr-rating-inner").mousemove(function(event) {
			var target = $(event.target);
			if (target.attr("data-rr-justcommitted") != "true") {
				var mouseX = event.pageX - leftOffset;
				var rating = Math.ceil((mouseX / width) * 100);
				if (rating >= 1 && rating <= 100) {
					target.attr("data-rr-fill", rating);
					target.find(".rr-rating-fill:not(.rr-shadow)").width(mouseX);
				}
			}
		});
		
		// When the user leaves the rating bar, restore previous status if no commit was made
		$(".rr-rating-inner").mouseleave(function(event) {
			var target = $(event.target);
			if (target.attr("data-rr-justcommitted") == "true") {
				target.attr("data-rr-justcommitted", "false");
			}
			var fillPct = parseInt(target.parent().attr("data-rr-rating")) / 100;
			var fillWidth = 0;
			if (fillPct >= 0) {
				fillWidth = fillPct * width;
			} else if (fillPct < 0) {
				target.siblings(".rr-rating-none").addClass("chosen");
			}
			target.find(".rr-rating-fill:not(.rr-shadow)").width(fillWidth);
		});
		
		// When the user enters the None box, highlight None and hide the current fill
		$(".rr-rating-none").mouseenter(function(event) {
			var target = $(event.target);
			target.siblings(".rr-rating-inner").find(".rr-rating-fill:not(.rr-shadow)").width(0);
			target.addClass("chosen");
		});
		
		// Commit a rating of None
		$(".rr-rating-none").click(function(event) {
			var target = $(event.target);
			if (trial.logCommits) {
				var timeOffset = Date.now() - startTime;
				var item = target.parent().attr("data-rr-item");
				var logEntry = {
					time: timeOffset,
					item: item,
					rating: -1,
				};
				commitLog.push(logEntry);
			}
			target.parent().attr("data-rr-rating", "-1").removeClass("rr-missing");
		});
		
		$(".rr-rating-none").mouseleave(function(event) {
			var target = $(event.target);
			var fillPct = parseInt(target.parent().attr("data-rr-rating")) / 100;
			var noneChosen = false;
			if (fillPct >= 0) {
				// If the user leaves the None box without committing, restore the previous fill
				target.siblings(".rr-rating-inner").find(".rr-rating-fill:not(.rr-shadow)").width(fillPct * width);
			} else if (fillPct < 0) {
				// Only keep the None box highlighted if the user committed
				noneChosen = true;
			}
			if (!noneChosen) {
				target.removeClass("chosen");
			}
		});
		
		// When the submit key is pressed, validate ratings and end trial if appropriate
		var submitKeyPressed = function(data) {
			
			var clean = true;
			var ratings = {};
			$(".rr-rating-outer").each(function(i) {
				var thisEl = $(this);
				var ratingKey = thisEl.attr("data-rr-item");
				var ratingVal = thisEl.attr("data-rr-rating");
				if (!trial.allowBlank && isNaN(ratingVal)) {
					clean = false;
					thisEl.addClass("rr-missing");
				}
				ratings[ratingKey] = ratingVal;
			});
			
			if (clean) {
				display_element.classList.remove("rr-container");
				var trialData = {
					ratings: ratings,
					allowedNone: trial.allowNone,
					allowedBlank: trial.allowBlank,
					rt: Date.now() - startTime,
				};
				if (trial.logCommits) {
					trialData["commitLog"] = commitLog;
				}
				
				if (submitTimeout) clearTimeout(submitTimeout);
				$("body").off("contextmenu");
				jsPsych.pluginAPI.cancelKeyboardResponse(keyboardListener);
				
				jsPsych.data.addProperties({"rr-shadow-ratings": ratings});
				
				jsPsych.finishTrial(trialData);
			}
		};
		
		if (trial.submitTimeout > 0) {
			var submitTimeout = setTimeout(submitKeyPressed, trial.submitTimeout * 1000);
		}
		
		// Listen for the submit key
		var keyboardListener = jsPsych.pluginAPI.getKeyboardResponse({
			callback_function: submitKeyPressed,
			valid_responses: [trial.submitKey],
			rt_method: "date",
			persist: true,
			allow_held_key: false,
		});
		
		if (trial.rightClickSubmit) {
			// If specified, listen for right clicks to submit
			$("body").contextmenu(submitKeyPressed);
		}

		$("#submitBtn").click(submitKeyPressed);

	};

	return plugin;
})();
