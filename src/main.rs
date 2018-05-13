#[macro_use]
extern crate serde_derive;

extern crate reqwest;
extern crate sysfs_gpio;

use std::env;
use std::collections::HashMap;
use std::thread::sleep;
use std::time::Duration;
use sysfs_gpio::{Direction, Pin};

#[derive(Deserialize)]
struct Weather {
    current_observation: Observation,
}

#[derive(Deserialize)]
struct Observation {
    temp_c: i32,
}

fn notify_slack(message_hook: &str, message: &str, last_message: &str) {
    // if the last message is the same as the current, do not send
    if message == last_message {
        return;
    }

    let mut map = HashMap::new();
    map.insert("text", format!("@ryanluker {}", message));
    map.insert("link_names", format!("1"));

    let client = reqwest::Client::new();
    client.post(message_hook)
        .json(&map)
        .send().ok();
}

fn fetch_weather(weather_hook: &str) -> Result<i32, reqwest::Error> {
    let weather: Weather = reqwest::get(weather_hook)?.json()?;
    return Ok(weather.current_observation.temp_c);
}

fn turn_on(pt: Pin) -> Result<(), sysfs_gpio::Error> {
    pt.set_value(1)?;
    return Ok(());
}

fn turn_off(pt: Pin) -> Result<(), sysfs_gpio::Error> {
    pt.set_value(0)?;
    return Ok(());
}

fn setup_ac(pt: Pin) -> Result<(), sysfs_gpio::Error> {
    pt.set_active_low(true)?;
    pt.set_direction(Direction::Out)?;
    pt.set_value(0)?;
    return Ok(());
}

fn auto_run(pt: Pin, temp: i32, intvl: u64, slack_api: &str, weather_api: &str) -> Result<(), sysfs_gpio::Error> {
    // cache last message for slack messaging logic
    let last_message = "";

    // setup ac and set to off
    match setup_ac(pt) {
        Ok(_) => {
            notify_slack(slack_api, "Setting up!", last_message);
        },
        Err(err) => {
            return Err(err);
        },
    };

    loop {
        // wait 15min to check weather again
        sleep(Duration::from_millis(intvl));

        // check weather api
        let current_temp = match fetch_weather(weather_api) {
            Ok(temp) => temp,
            Err(err) => {
                notify_slack(slack_api, &err.to_string(), last_message);
                continue;
            },
        };

        // logic conditional
        if current_temp > temp {
            match turn_on(pt) {
                Ok(_) => {
                    notify_slack(slack_api, "Turning on!", last_message);
                },
                Err(err) => {
                    notify_slack(slack_api, &err.to_string(), last_message);
                    continue;
                },
            };
        } else {
            match turn_off(pt) {
                Ok(_) => {
                    notify_slack(slack_api, "Turning off!", last_message);
                },
                Err(err) => {
                    notify_slack(slack_api, &err.to_string(), last_message);
                    continue;
                },
            };
        }
    }
}

fn main() {
    // operation variables
    let powertail = Pin::new(408); // chip xio - p0
    let interval = 900000; // 15min in ms

    // environment variables
    let slack_api = match env::var("SLACK_API") {
        Ok(val) => val,
        Err(_) => panic!("SLACK_API environment variable not found!"),
    };

    let weather_api = match env::var("WEATHER_API") {
        Ok(val) => val,
        Err(_) => panic!("WEATHER_API environment variable not found!"),
    };

    let temperature: i32 = match env::var("AUTO_TEMP") {
        Ok(val) => val.parse().unwrap(),
        Err(_) => 26, // celsius
    };

    // export powertail pin and start auto ac
    powertail.with_exported(|| {
        return auto_run(powertail, temperature, interval, &slack_api, &weather_api);
    }).unwrap();
}
