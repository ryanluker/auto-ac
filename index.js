#!/usr/bin/env node

//npm modules
var program     = require('commander');
var request     = require('request');
var Gpio        = require('onoff').Gpio;

//connected devices
var powerTail   = new Gpio(408, 'out');

//misc variables
var INCREMENT   = 900000; //15min
var TEMPERATURE = 99; //24C
var WEATHERAPI  = 'http://api.openweathermap.org/data/2.5/weather?q=Resolute,ca&appid=794fc23dd8ce7ba66cd0361f58355010&units=metric';

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
  .description('starts the auto with default timer if none provided')
  .action(function(options) {
    STATE = 'AUTO';
    INCREMENT = options.inc || INCREMENT;
    TEMPERATURE = options.temp || TEMPERATURE;
    console.log('State: ' + STATE + ' INC: ' + INCREMENT + ' Temp: ' + TEMPERATURE);
    auto(INCREMENT, TEMPERATURE);
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
    } else {
      //decide whether to turn on or off
      console.log(new Date() + ': Current Temp (' + JSON.parse(body).main.temp + ')');
      if(temp < JSON.parse(body).main.temp) {
        console.log(new Date() + ': Switching on');
        powerTail.writeSync(0);
      } else {
        console.log(new Date() + ': Switching off');
        powerTail.writeSync(1);
      } 
    }

    //set timeout for next check in
    setTimeout(function(){
      auto(inc, temp);
    }, inc);
  });
};

program.parse(process.argv);

//remove resources
process.on('SIGINT', function () {
  console.log(new Date() + ': Shutting down!');
  powerTail.unexport();
  process.exit(0);
});
