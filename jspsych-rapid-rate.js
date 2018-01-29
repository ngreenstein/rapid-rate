jsPsych.plugins["rapid-rate"] = (function() {

	var plugin = {};
	
	plugin.info = {
		name: "rapid-rate",
		description: "jsPsych plugin for quickly gathering percentage ratings of many items",
		parameters: {
			commitKey: {
				type: jsPsych.plugins.parameterType.KEYCODE,
				default: 32,
				no_function: false,
				description: "Code of key used to commit all ratings and end trial",
			},
			allowBlank: {
				type: jsPsych.plugins.parameterType.BOOL,
				default: false,
				no_function: false,
				description: "Whether to allow user to commit ratings and end trial with blank/unrated items",
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
		trial.commitKey = typeof trial.commitKey == "undefined" ? 32 : trial.commitKey; // spacebar to commit by default
		trial.allowBlank = typeof trial.allowBlank == "undefined" ? false : trial.allowBlank; // disallow blanks by default
		trial.allowNone = typeof trial.allowNone == "undefined" ? true : trial.allowNone // allow 'none' ratings by default
		trial.logCommits = typeof trial.logCommits == "undefined" ? false : trial.logCommits // do not log commits by default
		
		// Time mark and container for commitment log
		var startTime = Date.now();
		var commitLog = [];
		
		// Generate DOM
		display_element.classList.add("rr-container");
		var ratingHtml = '<style type="text/css">\
		.rr-rating-outer {\
			margin-bottom: 5px;\
			box-sizing: padding-box;\
		}\
		\
		.rr-rating-inner, .rr-rating-none {\
			border: 2px solid black;\
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
			z-index: -1;\
		}\
		</style>\
		<p>' + trial.topMsg + '</p>\n';
		for (var i = 0; i < trial.items.length; i ++) {
			var thisItem = trial.items[i];
			ratingHtml += '<div class="rr-rating-outer" data-rr-item="' + thisItem + '">\n';
			if (trial.allowNone) {
				ratingHtml += '\t<div class="rr-rating-none">None</div>\n';
			}
			ratingHtml += '\t<div class="rr-rating-inner">\n';
			ratingHtml += '\t\t<span>' + thisItem + '</span>\n';
			ratingHtml += '\t\t<div class="rr-rating-fill"></div>\n';
			ratingHtml += '\t</div>\n';
			ratingHtml += '</div>\n';
		};
		ratingHtml += '<p>' + trial.bottomMsg + '</p>\n';
		
		display_element.innerHTML = ratingHtml;
		
		// All rows should be the same, so use the first one to cache offset/width info
		var sampleRow = $(".rr-rating-inner").first();
		var leftOffset = sampleRow.offset().left + parseInt(sampleRow.css("borderLeftWidth"), 10); //Subtract the border width
		var width = sampleRow.innerWidth();
		
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
			target.parent().attr("data-rr-rating", rating);
		});
		
		// Update the rating bar highlight as the mouse moves
		$(".rr-rating-inner").mousemove(function(event) {
			var target = $(event.target);
			if (target.attr("data-rr-justcommitted") != "true") {
				var mouseX = event.pageX - leftOffset;
				var rating = Math.round((mouseX / width) * 100);
				if (rating >= 0 && rating <= 100) {
					target.attr("data-rr-fill", rating);
					target.find(".rr-rating-fill").width(mouseX);
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
			target.find(".rr-rating-fill").width(fillWidth);
		});
		
		// When the user enters the None box, highlight None and hide the current fill
		$(".rr-rating-none").mouseenter(function(event) {
			var target = $(event.target);
			target.siblings(".rr-rating-inner").find(".rr-rating-fill").width(0);
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
			target.parent().attr("data-rr-rating", "-1");
		});
		
		$(".rr-rating-none").mouseleave(function(event) {
			var target = $(event.target);
			var fillPct = parseInt(target.parent().attr("data-rr-rating")) / 100;
			var noneChosen = false;
			if (fillPct >= 0) {
				// If the user leaves the None box without committing, restore the previous fill
				target.siblings(".rr-rating-inner").find(".rr-rating-fill").width(fillPct * width);
			} else if (fillPct < 0) {
				// Only keep the None box highlighted if the user committed
				noneChosen = true;
			}
			if (!noneChosen) {
				target.removeClass("chosen");
			}
		});
		
		// When the commit key is pressed, validate ratings and end trial if appropriate
		var commitKeyPressed = function(data) {
			
			var clean = true;
			var ratings = {};
			$(".rr-rating-outer").each(function(i) {
				var thisEl = $(this);
				var ratingKey = thisEl.attr("data-rr-item");
				var ratingVal = thisEl.attr("data-rr-rating");
				if (!trial.allowBlank && isNaN(ratingVal)) {
					clean = false;
					return false; // Just breaks the jQuery each
				}
				ratings[ratingKey] = ratingVal;
			});
			
			if (clean) {
				display_element.classList.remove("rr-container");
				var trialData = {
					ratings: ratings,
					allowedNone: trial.allowNone,
					allowedBlank: trial.allowBlank,
					rt: data.rt,
				};
				if (trial.logCommits) {
					trialData["commitLog"] = commitLog;
				}
				jsPsych.pluginAPI.cancelKeyboardResponse(keyboardListener);
				jsPsych.finishTrial(trialData);
			}
		};
		
		// Listen for the commit key
		var keyboardListener = jsPsych.pluginAPI.getKeyboardResponse({
			callback_function: commitKeyPressed,
			valid_responses: [trial.commitKey],
			rt_method: "date",
			persist: true,
			allow_held_key: false,
		});

	};

	return plugin;
})();
