# HealthBox Homebridge Plugin

A Homebridge plugin that adds homekit functionality to your HealthBox installation.

Requirements: a running HomeBridge server

**homebridge-healthbox-plugin**

Exposes services for boosting the fan speed temporarily. 
The Healthbox ventilation units can never be completely off. 
The on-off switches that are provided with this plugin are only 
intended for the temporary boost function.


## Installation


1. Install Homebridge using: `(sudo) npm install -g --unsafe-perm homebridge`
2. Install this plugin using: `(sudo) npm install -g homebridge-healthbox-plugin`
3. Update your Homebridge `config.json` using the sample below (append in the block 'platforms').

Example config.json:

    "platforms": [
        {
            "healthBoxUri": "http://192.168.1.3",
            "boostFanSpeed": 200,
            "boostDuration": 3600,
            "platform": "HealthBoxHomebridgePlugin"
        }
    ]

## Demo

![demo](https://raw.githubusercontent.com/superjoran/homebridge-healthbox/master/.github/images/IMG_1534.PNG)
