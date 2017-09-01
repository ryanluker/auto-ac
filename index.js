#!/usr/bin/env node

//npm modules
var program     = require('commander');
var request     = require('request');

//connected devices
try {
  var Gpio        = require('onoff').Gpio;
  var powerTail   = new Gpio(408, 'out', null, {activeLow: true});
} catch (error) {
  console.log(error);
}

//misc variables
var lastUniqueMessage = '';
var SLACK_API = '';
var INCREMENT   = 900000; //15min
var TEMPERATURE = 24; //24C
var WEATHERAPI  = 'https://api.wunderground.com/api/cb7e117cdc8aa81d/conditions/q/CA/Kelowna/CYLW.json';

program
  .version('1.0.0')

program
  .command('on')
  .description('turns device on via gpio pin')
  .action(function() {
    powerTail.writeSync(1);
    console.log('PowerTail State: ' + powerTail.readSync());
  });

program
  .command('off')
  .description('turns device off via gpio pin')
  .action(function() {
    powerTail.writeSync(0);
    console.log('PowerTail State: ' + powerTail.readSync());
  });

program
  .command('status')
  .description('return the status of the device')
  .action(function() {
    console.log('PowerTail State: ' + powerTail.readSync());
  });

program
  .command('auto')
  .option("-i, --inc [seconds]", "Sets auto to check api every x seconds")
  .option("-t, --temp [temperature]", "Sets auto to run if temp (C) is reached")
  .description('starts the auto with default timer and temperature if none provided')
  .action(function(options) {
    var increment = options.inc || INCREMENT;
    var temperature = options.temp || TEMPERATURE;
    console.log('State: { INC: ' + increment + ' Temp: ' + temperature + ' }');
    sendNotification(`State: { INC: ${increment} Temp: ${temperature} }`);
    auto(increment, temperature);
  });

/**
 * auto function that begins an infinite loop around whether to turn on or off
 * @param {integer} inc - wait time in seconds between loops
 * @param {integer} temp - temperature in C for the activation point
 */
function auto(inc, temp) {
  request(WEATHERAPI, function(err, res, body) {
    //continue auto operation even if http request fails
    if(err) {
      console.log(new Date() + ': Error');
      sendNotification(`${new Date()}: Error: ${JSON.stringify(err)}`);
    } else {
      checkState(
        powerTail,
        temp,
        JSON.parse(body).current_observation.temp_c
      );
    }

    //set timeout for next check in
    setTimeout(function(){
      auto(inc, temp);
    }, inc);
  });
};

/**
 * sends a slack message to a predefined end point
 * @param {string} message - message to send to slack
 */
function sendNotification(message) {
  if(!SLACK_API) return ;
  if(lastUniqueMessage === message) return ;

  lastUniqueMessage = message;
  const data = {
    text: `@ryanluker ${message}`,
    link_names: 1
  }

  request.post(SLACK_API, {body: JSON.stringify(data)});
}

/**
 * checkState takes the temp and target, then makes decisions on state
 * @param {Gpio} device - applicable Gpio device
 * @param {integer} target - target temperature
 * @param {integer} temp - temperature returned from the api
 */
function checkState(device, target, temp) {
  console.log(new Date() + ': Current Temp (' + temp + ')');
  if(target < temp) {
    console.log(new Date() + ': Switching on');
    sendNotification(`Switching on`);
    device.writeSync(1);
  } else {
    console.log(new Date() + ': Switching off');
    sendNotification(`Switching off`);
    device.writeSync(0);
  }
}

program.parse(process.argv);

//remove and shutdown resources
process.on('SIGINT', function () {
  console.log(new Date() + ': Switching off');
  powerTail.writeSync(0);
  console.log(new Date() + ': Shutting down!');
  sendNotification(`${new Date()}: Shutting down!`);
  powerTail.unexport();
  process.exit(0);
});

//exports
module.exports.checkState = checkState;
module.exports.sendNotification = sendNotification;