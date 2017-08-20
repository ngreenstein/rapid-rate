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
			items: {
				type: jsPsych.plugins.parameterType.ARRAY,
				default: [],
				no_function: false,
				description: "An array of strings representing names of items to rate",
			},
		},
	},

	plugin.trial = function(display_element, trial) {

		// Default parameter values
		trial.commitKey = typeof trial.commitKey == "undefined" ? 32 : trial.commitKey; // spacebar to commit by default
		trial.allowBlank = typeof trial.allowBlank == "undefined" ? false : trial.allowBlank; // disallow blanks by default
		trial.allowNone = typeof trial.allowNone == "undefined" ? true : trial.allowNone // allow 'none' ratings by default
		
		// Generate DOM
		display_element.classList.add("rr-container");
		var ratingHtml = "";
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
		
		display_element.innerHTML = ratingHtml;
		
		// All rows should be the same, so use the first one to cache offset/width info
		var sampleRow = $(".rr-rating-inner").first();
		var leftOffset = sampleRow.offset().left + parseInt(sampleRow.css("borderLeftWidth"), 10); //Subtract the border width
		var width = sampleRow.innerWidth();
		
		// When the user enters the rating bar, hide any highight in the None box
		$(".rr-rating-inner").mouseenter(function(event) {
			target = $(event.target);
			target.attr("data-rr-justcommitted", "false");
			target.siblings(".rr-rating-none").removeClass("chosen");
		});
		
		// Committ a rating
		$(".rr-rating-inner").click(function(event) {
			target = $(event.target);
			target.attr("data-rr-justcommitted", "true");
			target.parent().attr("data-rr-rating", target.attr("data-rr-fill"));
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
		
		// When the user leaves the rating bar, restore previous status if no committ was made
		$(".rr-rating-inner").mouseleave(function(event) {
			target = $(event.target);
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
			target = $(event.target);
			target.siblings(".rr-rating-inner").find(".rr-rating-fill").width(0);
			target.addClass("chosen");
		});
		
		// Commit a rating of None
		$(".rr-rating-none").click(function(event) {
			target = $(event.target);
			target.parent().attr("data-rr-rating", "-1");
		});
		
		$(".rr-rating-none").mouseleave(function(event) {
			target = $(event.target);
			var fillPct = parseInt(target.parent().attr("data-rr-rating")) / 100;
			noneChosen = false;
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
		
		// When the committ key is pressed, validate ratings and end trial if appropriate
		var committKeyPressed = function() {
			
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
				};
				jsPsych.pluginAPI.cancelKeyboardResponse(keyboardListener);
				jsPsych.finishTrial(trialData);
			}
		};
		
		// Listen for the committ key
		var keyboardListener = jsPsych.pluginAPI.getKeyboardResponse({
			callback_function: committKeyPressed,
			valid_responses: [trial.commitKey],
			rt_method: "date",
			persist: true,
			allow_held_key: false,
		});

	};

	return plugin;
})();
