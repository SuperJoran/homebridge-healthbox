# Healthbox Plugin

Example config.json:

    "platforms": [
        {
            "healthBoxUri": "http://192.168.178.26",
            "boostFanSpeed": 200,
            "boostDuration": 3600,
            "platform": "HealthBoxHomebridgePlugin"
        }
    ]

Exposes services for boosting the fan speed temporarily. 
The Healthbox ventilation units can never be completely off. 
The on-off switches that are provided with this plugin are only 
intended for the temporary boost function.