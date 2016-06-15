#!/usr/bin/env node

//npm modules
var program     = require('commander');
var request     = require('request');
var Gpio        = require('onoff').Gpio;

//connected devices
var powerTail   = new Gpio(408, 'out');

//misc variables
var INCREMENT   = 900; //15min
var TEMPERATURE = 24; //24C
var WEATHERAPI  = 'http://api.openweathermap.org/data/2.5/weather?q=Kelowna,ca&appid=794fc23dd8ce7ba66cd0361f58355010&units=metric';

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
    request(WEATHERAPI, function(err, res, body) {
      if(err) //run shutdown
      console.log('Current Temp: ' + JSON.parse(body).main.temp);
      if(TEMPERATURE < JSON.parse(body).main.temp) {
        //switch on
      } else {
        //switch off
      }
    });
  });

program.parse(process.argv);

//remove resources
process.on('SIGINT', function () {
  powerTail.unexport();
});