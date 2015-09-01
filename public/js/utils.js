/**
 * Common utility values and functions for jsPASAT
 */

// Reuseable stimuli
// ------------------------

// NOTE: Prompt sound used in this file is courtesy SoundBible.com - http://soundbible.com/1252-Bleep.html
var beep = new Howl({
  urls: ['../audio/bleep.mp3', '../audio/bleep.ogg'],
  volume: 0.7
});
var play_beep = "<script>beep.play()</script>";

// HTML for text plugin
var continue_html = "<p>Press the <code>enter</code> key to continue.</p>";

// fixation stimulus
var fixation_cross = "<h1>+</h1>";
var fixation_trial = {
  type: 'single-stim',
  stimuli: [fixation_cross + play_beep],
  is_html: true,
  timing_response: 1000,
  timing_post_trial: 3000,
  choices: 'none'
}


// Functions
// ------------------------

// add results data to the last trial
function addTrialResults() {
  var expected,
      response,
      correct,
      current_trial = jsPsych.data.getLastTrialData(),
      current_index = current_trial.trial_index;

  // nothing expected on first trial
  if (current_index != 0) {
    var previous_index = current_index - 1,
        current_value = current_trial.block_stimuli[current_index],
        previous_value = current_trial.block_stimuli[previous_index];

    // expected (correct) response for the last trial
    expected = current_value + previous_value;

    // response given in the last trial
    var key_presses = eval(current_trial.key_press);
    var digit_presses = [];
    for (var i = 0; i < key_presses.length; i++) {
      var key_press = key_presses[i];
      if (key_press !== -1) {
        // normalize keycode from numpad to numrow
        if (key_press >= 96 && key_press <= 105) {
          key_press = key_press - 48;
        }

        var digit = String.fromCharCode(key_press);
        digit_presses.push(digit);
      }
    }
    response = parseInt(digit_presses.join(''));

    // was the response given as expected (correct)?
    correct = (expected === response) ? true : false;
  }

  var trial_results = {
    expected: expected,
    response: response,
    correct: correct
  }
  return trial_results;
}


// display trial feedback, based on response judgement
function displayTrialFeedback(trial_data) {
  if (typeof trial_data.correct !== "undefined") {
    var feedback_text = trial_data.correct ? "Correct!" : "Incorrect";
    var feedback_class = trial_data.correct ? "correct" : "incorrect";
    var feedback_html = '<h3 class="'+feedback_class+'">'+feedback_text+'</h3>';

    // show feedback
    $('#jspsych-feedback').html(feedback_html);
    // hide feedback
    window.setTimeout(function() {
      $('#jspsych-feedback').empty();
    }, 800);
  }
}


// create a block of trials
function createPasatBlock(stimuli, give_feedback) {
  var digit_keycodes = (_.range(48, 58)).concat(_.range(96, 106));
  var give_feedback = (typeof give_feedback === "undefined") ? false : give_feedback;

  var block = {
    type: "multi-stim-multi-response",

    stimuli: formatBlockStimuli(stimuli),
    is_html: true,
    choices: [digit_keycodes, digit_keycodes],

    timing_stim: [1000],
    timing_response: 4000,
    response_ends_trial: false,

    data: {block_stimuli: stimuli},
    on_finish: function() {
      jsPsych.data.addDataToLastTrial(addTrialResults())
      if (give_feedback) {
        var trial_data = jsPsych.data.getLastTrialData();
        displayTrialFeedback(trial_data);
      }
    }
  }
  if (give_feedback) {
    // add post-trial time for feedback display
    block['timing_post_trial'] = 1000;
  }

  return block;
}


// create a formatted list of trial stimuli for a block
function formatBlockStimuli(trials) {
  var stimuli = [];
  for (var i = 0; i < trials.length; i++) {
    var trial_stimuli = [];
    trial_html = "<h1>" + trials[i] + "</h1>" + play_beep;
    trial_stimuli.push(trial_html);
    stimuli.push(trial_stimuli);
  }
  return stimuli;
}


// generate random condition
function generateCondition() {
  return _.random(1, 4)
}


// generate a set of randomized blocks
// return list of block difficulty and block stimuli
function generateRandomBlocks(condition) {
  // calculate number of middle medium blocks
  // note: condition ranges 1--4, number of blocks ranges 6--9, minus 2 'medium'
  // blocks at beginning and end of the list, minus 1 'easy' and 1 'hard' block
  var num_middle_medium_blocks = condition + 5 - 2 - 2;

  // add unshuffled middle 'medium', 'easy' and 'hard' blocks
  var unshuffled_middle_blocks = Array.apply(
    null, Array(num_middle_medium_blocks)).map(function() {return 'medium'});
  unshuffled_middle_blocks.push('easy', 'hard');

  // randomize blocks
  random_middle_blocks = _.shuffle(unshuffled_middle_blocks);

  // complete block generation
  var blocks = ['medium'].concat(random_middle_blocks).concat(['medium']);

  // get random stimuli for each block
  var stimuli = _.map(blocks, function(difficulty) {
    return generateStimuli(difficulty);
  });

  return {blocks: blocks, stimuli: stimuli}
}


// generate random stimuli for PASAT blocks
// return list of trial values
function generateStimuli(difficulty, num_trials) {
  var difficulty = (typeof difficulty === "undefined") ? 'medium' : difficulty;
  var num_trials = (typeof num_trials === "undefined") ? 15 : num_trials;

  var stimuli;
  var i = 1;
  switch (difficulty) {
    case 'easy':
      // Note: Easy Block defined by 2 digits summing to <= 9
      var digit_max = 7;
      stimuli = [_.random(1, digit_max)]  // add first random number
      while (i < num_trials) {
        var trial_value = _.random(1, digit_max);
        var digit_sum = trial_value + _.last(stimuli);
        if (digit_sum <= 9) {
          stimuli.push(trial_value);
          i++;
        }
      }
      break;
    case 'medium':
      // Note: Medium Block defined by 2 digits summing to >= 9
      var digit_max = 9;
      stimuli = [_.random(1, digit_max)]  // add first random number
      while (i < num_trials) {
        var trial_value = _.random(1, digit_max);
        var digit_sum = trial_value + _.last(stimuli);
        if (digit_sum >= 9) {
          stimuli.push(trial_value);
          i++;
        }
      }
      break;
    case 'hard':
      // Note: Hard Block defined as each trial has one double digit stimuli
      var digit_max = 19;
      stimuli = [_.random(1, digit_max)]  // add first random number
      while (i < num_trials) {
        var trial_value = _.random(1, digit_max);
        var index_is_even = (i % 2 == 0);
        if (index_is_even && trial_value >= 10) {
          stimuli.push(trial_value);
          i++;
        } else if (!index_is_even && trial_value < 10) {
          stimuli.push(trial_value);
          i++;
        }
      }
      break;
  }
  return stimuli
}
