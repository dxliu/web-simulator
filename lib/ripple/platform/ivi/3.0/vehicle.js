/*
 *  Copyright 2013 Intel Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var utils = require('ripple/utils'),
    event = require('ripple/event'),
    t = require('ripple/platform/ivi/3.0/typecast'),
    errorcode = require('ripple/platform/ivi/3.0/errorcode'),
    WebAPIError = require('ripple/platform/ivi/3.0/WebAPIError'),
    WebAPIException = require('ripple/platform/ivi/3.0/WebAPIException'),
    VehiclePropertyType,
    VehicleSpeed,
    EngineSpeed,
    VehiclePowerMode,
    TripMeter,
    Acceleration,
    Transmission,
    CruiseControlStatus,
    WheelBrake,
    LightStatus,
    InteriorLightStatus,
    Horn,
    Fuel,
    EngineOil,
    Location,
    ExteriorBrightness,
    Temperature,
    RainSensor,
    WindshieldWiper,
    HVAC,
    WindowStatus,
    Sunroof,
    ConvertibleRoof,
    VehicleId,
    Size,
    FuelInfo,
    VehicleType,
    Doors,
    TransmissionGearType,
    WheelInformation,
    Odometer,
    Fluid,
    Battery,
    TirePressure,
    TireTemperature,
    SecurityAlert,
    ParkingBrake,
    ParkingLight,
    HazardLight,
    AntilockBrakingSystem,
    TractionControlSystem,
    VehicleTopSpeedLimit,
    AirbagStatus,
    DoorStatus,
    SeatBeltStatus,
    OccupantStatus,
    ObstacleDistance,
    NightMode,
    DrivingMode,
    TurnSignal,
    ButtonEvent,
    VehicleFactory,
    _vehicleCacheData = {
        supported: null,
        data: null
    },
    _vehicleEvent = {subscribe: {}},
    _security = {
        "http://tizen.org/privilege/vehicle": ["supported", "get", "getAsync",
                "set", "getHistory", "subscribe", "listZones"]
    },
    _self;

function _initialize () {
    event.on("vehicle-cache-refresh", function (supported, data) {
        _vehicleCacheData.supported = supported;
        _vehicleCacheData.data = data;
    });

    event.trigger("vehicle-cache-request", [_vehicleCacheData]);
}

_self = function () {
    var vehicle;

    function supported () {
        if (!_security.supported) {
            throw new WebAPIException(errorcode.PERMISSION_DENIED);
        }

        return _vehicleCacheData.supported;
    }

    function get (property, zone) {
        if (!_security.get) {
            throw new WebAPIException(errorcode.PERMISSION_DENIED);
        }

        t.Vehicle("get", arguments);

        if (_vehicleCacheData.supported.indexOf(property) === -1) {
            throw new WebAPIException(errorcode.PROPERTY_UNAVAILABLE);
        }

        return new VehicleFactory(property, _vehicleCacheData.data[property]);
    }

    function getAsync (property, successCallback, errorCallback, zone) {
        if (!_security.getAsync) {
            throw new WebAPIException(errorcode.PERMISSION_DENIED);
        }

        t.Vehicle("getAsync", arguments);

        if (_vehicleCacheData.supported.indexOf(property) === -1) {
            throw new WebAPIException(errorcode.PROPERTY_UNAVAILABLE);
        }

        window.setTimeout(function () {
            successCallback(new VehicleFactory(property,
                    _vehicleCacheData.data[property]));
        }, 1);
    }

    function subscribe (property, successCallback, zone, errorCallback) {
        if (!_security.subscribe) {
            throw new WebAPIException(errorcode.PERMISSION_DENIED);
        }

        t.Vehicle("subscribe", arguments);

        if (_vehicleCacheData.supported.indexOf(property) === -1) {
            throw new WebAPIException(errorcode.PROPERTY_UNAVAILABLE);
        }

        _vehicleEvent.subscribe[property] = {
            successCallback: successCallback,
            errorCallback: errorCallback
        };

        window.setTimeout(function () {
            if (! _vehicleEvent["vehicle-subscribe-response"]) {
                event.on("vehicle-subscribe-response", function (propertyObj) {
                    var propertySub = _vehicleEvent.subscribe[propertyObj.type],
                        success = propertySub.successCallback,
                        error = propertySub.errorCallback;

                    if (!propertyObj.supported) {
                        if (error) {
                            error(new WebAPIError(
                                    errorcode.PROPERTY_UNAVAILABLE));
                        }
                        return;
                    }

                    success(new VehicleFactory(propertyObj.type,
                            propertyObj.val));

                });
                _vehicleEvent["vehicle-subscribe-response"] = true;
            }
            event.trigger("vehicle-subscribe-request", [property, true, zone]);
        }, 1);
    }

    function set (property, value, errorCallback) {
        var val = utils.copy(value);

        if (!_security.set) {
            throw new WebAPIException(errorcode.PERMISSION_DENIED);
        }

        t.Vehicle("set", arguments);

        if (_vehicleCacheData.supported.indexOf(property) === -1) {
            throw new WebAPIException(errorcode.PROPERTY_UNAVAILABLE);
        }

        window.setTimeout(function () {
            event.once("vehicle-set-response", function (status) {
                if (!status) {
                    if (errorCallback) {
                        errorCallback(new WebAPIError(
                                errorcode.PROPERTY_UNAVAILABLE));
                    }
                }
            });
            event.trigger("vehicle-set-request", [property, val]);
        }, 1);
    }

    function getHistory (property, zone, startTime, endTime, successCallback,
            errorCallback) {
        var properties = [], i;

        if (!_security.getHistory) {
            throw new WebAPIException(errorcode.PERMISSION_DENIED);
        }

        t.Vehicle("getHistory", arguments);

        if (_vehicleCacheData.supported.indexOf(property) === -1) {
            throw new WebAPIException(errorcode.PROPERTY_UNAVAILABLE);
        }

        startTime = startTime.getTime();
        endTime = endTime.getTime();

        window.setTimeout(function () {
            event.once("vehicle-history-response", function (values, status) {
                if (!status) {
                    if (errorCallback) {
                        errorCallback(new WebAPIError(
                                errorcode.PROPERTY_UNAVAILABLE));
                    }
                    return;
                }

                for (i = 0; i < values.length; i++) {
                    properties.push(new VehicleFactory(property, values[i]));
                }
                successCallback(properties);
            });
            event.trigger("vehicle-history-request", [property, zone,
                    startTime, endTime]);
        }, 1);
    }

    function listZones (property) {
        if (!_security.listZones) {
            throw new WebAPIException(errorcode.PERMISSION_DENIED);
        }

        t.Vehicle("listZones", arguments);

        return [0];
    }

    function handleSubFeatures (subFeatures) {
        var i, subFeature;

        for (subFeature in subFeatures) {
            for (i in _security[subFeature]) {
                _security[_security[subFeature][i]] = true;
            }
        }
    }

    vehicle = {
        supported: supported,
        get: get,
        getAsync: getAsync,
        subscribe: subscribe,
        set: set,
        getHistory: getHistory,
        listZones: listZones,
        handleSubFeatures: handleSubFeatures
    };

    vehicle.__defineGetter__("ZONE_None", function () {
        return 0;
    });

    vehicle.__defineGetter__("ZONE_Front", function () {
        return 0x01;
    });

    vehicle.__defineGetter__("ZONE_Middle", function () {
        return 0x02;
    });

    vehicle.__defineGetter__("ZONE_Right", function () {
        return 0x04;
    });

    vehicle.__defineGetter__("ZONE_Left", function () {
        return 0x08;
    });

    vehicle.__defineGetter__("ZONE_Rear", function () {
        return 0x10;
    });

    vehicle.__defineGetter__("ZONE_Center", function () {
        return 0x20;
    });

    return vehicle;
};

VehicleFactory = function (vehicleType, value) {
    var instanceType;

    switch (vehicleType) {
    case "VehicleSpeed":
        instanceType = new VehicleSpeed(value);
        break;
    case "EngineSpeed":
        instanceType = new EngineSpeed(value);
        break;
    case "VehiclePowerMode":
        instanceType = new VehiclePowerMode(value);
        break;
    case "TripMeter":
        instanceType = new TripMeter(value);
        break;
    case "Acceleration":
        instanceType = new Acceleration(value);
        break;
    case "Transmission":
        instanceType = new Transmission(value);
        break;
    case "CruiseControlStatus":
        instanceType = new CruiseControlStatus(value);
        break;
    case "WheelBrake":
        instanceType = new WheelBrake(value);
        break;
    case "LightStatus":
        instanceType = new LightStatus(value);
        break;
    case "InteriorLightStatus":
        instanceType = new InteriorLightStatus(value);
        break;
    case "Horn":
        instanceType = new Horn(value);
        break;
    case "Fuel":
        instanceType = new Fuel(value);
        break;
    case "EngineOil":
        instanceType = new EngineOil(value);
        break;
    case "Location":
        instanceType = new Location(value);
        break;
    case "ExteriorBrightness":
        instanceType = new ExteriorBrightness(value);
        break;
    case "Temperature":
        instanceType = new Temperature(value);
        break;
    case "RainSensor":
        instanceType = new RainSensor(value);
        break;
    case "WindshieldWiper":
        instanceType = new WindshieldWiper(value);
        break;
    case "HVAC":
        instanceType = new HVAC(value);
        break;
    case "WindowStatus":
        instanceType = new WindowStatus(value);
        break;
    case "Sunroof":
        instanceType = new Sunroof(value);
        break;
    case "ConvertibleRoof":
        instanceType = new ConvertibleRoof(value);
        break;
    case "VehicleId":
        instanceType = new VehicleId(value);
        break;
    case "Size":
        instanceType = new Size(value);
        break;
    case "FuelInfo":
        instanceType = new FuelInfo(value);
        break;
    case "VehicleType":
        instanceType = new VehicleType(value);
        break;
    case "Doors":
        instanceType = new Doors(value);
        break;
    case "TransmissionGearType":
        instanceType = new TransmissionGearType(value);
        break;
    case "WheelInformation":
        instanceType = new WheelInformation(value);
        break;
    case "Odometer":
        instanceType = new Odometer(value);
        break;
    case "Fluid":
        instanceType = new Fluid(value);
        break;
    case "Battery":
        instanceType = new Battery(value);
        break;
    case "TirePressure":
        instanceType = new TirePressure(value);
        break;
    case "TireTemperature":
        instanceType = new TireTemperature(value);
        break;
    case "SecurityAlert":
        instanceType = new SecurityAlert(value);
        break;
    case "ParkingBrake":
        instanceType = new ParkingBrake(value);
        break;
    case "ParkingLight":
        instanceType = new ParkingLight(value);
        break;
    case "HazardLight":
        instanceType = new HazardLight(value);
        break;
    case "AntilockBrakingSystem":
        instanceType = new AntilockBrakingSystem(value);
        break;
    case "TractionControlSystem":
        instanceType = new TractionControlSystem(value);
        break;
    case "VehicleTopSpeedLimit":
        instanceType = new VehicleTopSpeedLimit(value);
        break;
    case "AirbagStatus":
        instanceType = new AirbagStatus(value);
        break;
    case "DoorStatus":
        instanceType = new DoorStatus(value);
        break;
    case "SeatBeltStatus":
        instanceType = new SeatBeltStatus(value);
        break;
    case "OccupantStatus":
        instanceType = new OccupantStatus(value);
        break;
    case "ObstacleDistance":
        instanceType = new ObstacleDistance(value);
        break;
    case "NightMode":
        instanceType = new NightMode(value);
        break;
    case "DrivingMode":
        instanceType = new DrivingMode(value);
        break;
    case "TurnSignal":
        instanceType = new TurnSignal(value);
        break;
    case "ButtonEvent":
        instanceType = new ButtonEvent(value);
        break;
    }

    function _construct () {
        var val;

        for (val in value) {
            instanceType[val] = value[val];
        }
        return instanceType;
    }

    return _construct();
};

VehiclePropertyType = function (propertyTypes) {
    var vehiclePropertyType = {};

    vehiclePropertyType.time = propertyTypes.time || undefined;
    vehiclePropertyType.zone = propertyTypes.zone || 0;
    vehiclePropertyType.source = propertyTypes.source || "";

    this.__defineGetter__("time", function () {
        return vehiclePropertyType.time;
    });

    this.__defineSetter__("time", function (val) {
        try {
            vehiclePropertyType.time = t.unsigned_long_long(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("zone", function () {
        return vehiclePropertyType.zone;
    });

    this.__defineSetter__("zone", function (val) {
        try {
            vehiclePropertyType.zone = t.short(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("source", function () {
        return vehiclePropertyType.source;
    });

    this.__defineSetter__("source", function (val) {
        try {
            vehiclePropertyType.source = t.DOMString(val);
        } catch (err) {
        }
    });
};

VehicleSpeed = function (propertyTypes) {
    var vehicleSpeed = {};

    VehiclePropertyType.call(this, propertyTypes);

    vehicleSpeed.vehicleSpeed = propertyTypes.vehicleSpeed || 0;

    this.__defineGetter__("vehicleSpeed", function () {
        return vehicleSpeed.vehicleSpeed;
    });

    this.__defineSetter__("vehicleSpeed", function (val) {
        try {
            vehicleSpeed.vehicleSpeed = t.unsigned_long(val);
        } catch (err) {
        }
    });
};

EngineSpeed = function (propertyTypes) {
    var engineSpeed = {};

    VehiclePropertyType.call(this, propertyTypes);

    engineSpeed.engineSpeed = propertyTypes.engineSpeed || 0;

    this.__defineGetter__("engineSpeed", function () {
        return engineSpeed.engineSpeed;
    });

    this.__defineSetter__("engineSpeed", function (val) {
        try {
            engineSpeed.engineSpeed = t.unsigned_long(val);
        } catch (err) {
        }
    });
};

VehiclePowerMode = function (propertyTypes) {
    var vehiclePowerMode = {};

    VehiclePropertyType.call(this, propertyTypes);

    vehiclePowerMode.vehiclePowerMode = propertyTypes.vehiclePowerMode || 0;

    this.__defineGetter__("VEHICLEPOWERMODE_OFF", function () {
        return 0;
    });

    this.__defineGetter__("VEHICLEPOWERMODE_ACCESSORY1", function () {
        return 1;
    });

    this.__defineGetter__("VEHICLEPOWERMODE_ACCESSORY2", function () {
        return 2;
    });

    this.__defineGetter__("VEHICLEPOWERMODE_RUN", function () {
        return 3;
    });

    this.__defineGetter__("vehiclePowerMode", function () {
        return vehiclePowerMode.vehiclePowerMode;
    });

    this.__defineSetter__("vehiclePowerMode", function (val) {
        try {
            val = t.octet(val);
            if (val < 0 || val > 3) {
                return;
            }
            vehiclePowerMode.vehiclePowerMode = val;
        } catch (err) {
        }
    });
};

TripMeter = function (propertyTypes) {
    var tripMeter = {};

    VehiclePropertyType.call(this, propertyTypes);

    tripMeter.tripMeters = propertyTypes.tripMeters || [];

    this.__defineGetter__("tripMeters", function () {
        return tripMeter.tripMeters;
    });

    this.__defineSetter__("tripMeters", function (val) {
        try {
        //Changing any items in the array will reset the item's value to '0';
            tripMeter.tripMeters = t.unsigned_long(val, "[]");
        }
        catch (err) {
        }
    });
};

Acceleration = function (propertyTypes) {
    var acceleration = {};

    VehiclePropertyType.call(this, propertyTypes);

    acceleration.x = propertyTypes.x || 0;
    acceleration.y = propertyTypes.y || 0;
    acceleration.z = propertyTypes.z || 0;

    this.__defineGetter__("x", function () {
        return acceleration.x;
    });

    this.__defineSetter__("x", function (val) {
        try {
            acceleration.x = t.unsigned_long(val);
        }
        catch (err) {
        }
    });

    this.__defineGetter__("y", function () {
        return acceleration.y;
    });

    this.__defineSetter__("y", function (val) {
        try {
            acceleration.y = t.unsigned_long(val);
        }
        catch (err) {
        }
    });

    this.__defineGetter__("z", function () {
        return acceleration.z;
    });

    this.__defineSetter__("z", function (val) {
        try {
            acceleration.z = t.unsigned_long(val);
        } catch (err) {
        }
    });
};

Transmission = function (propertyTypes) {
    var transmission = {};

    VehiclePropertyType.call(this, propertyTypes);

    transmission.gearPosition = propertyTypes.gearPosition || 0;
    transmission.mode = propertyTypes.mode || 0;

    this.__defineGetter__("TRANSMISSIONPOSITION_NEUTRAL", function () {
        return 0;
    });

    this.__defineGetter__("TRANSMISSIONPOSITION_FIRST", function () {
        return 1;
    });

    this.__defineGetter__("TRANSMISSIONPOSITION_SECOND", function () {
        return 2;
    });

    this.__defineGetter__("TRANSMISSIONPOSITION_THIRD", function () {
        return 3;
    });

    this.__defineGetter__("TRANSMISSIONPOSITION_FORTH", function () {
        return 4;
    });

    this.__defineGetter__("TRANSMISSIONPOSITION_FIFTH", function () {
        return 5;
    });

    this.__defineGetter__("TRANSMISSIONPOSITION_SIXTH", function () {
        return 6;
    });

    this.__defineGetter__("TRANSMISSIONPOSITION_SEVENTH", function () {
        return 7;
    });

    this.__defineGetter__("TRANSMISSIONPOSITION_EIGHTH", function () {
        return 8;
    });

    this.__defineGetter__("TRANSMISSIONPOSITION_NINTH", function () {
        return 9;
    });

    this.__defineGetter__("TRANSMISSIONPOSITION_TENTH", function () {
        return 10;
    });

    this.__defineGetter__("TRANSMISSIONPOSITION_CVT", function () {
        return 64;
    });

    this.__defineGetter__("TRANSMISSIONPOSITION_REVERSE", function () {
        return 128;
    });

    this.__defineGetter__("TRANSMISSIONPOSITION_PARK", function () {
        return 255;
    });

    this.__defineGetter__("TRANSMISSIONMODE_NORMAL", function () {
        return 0;
    });

    this.__defineGetter__("TRANSMISSIONMODE_SPORT", function () {
        return 1;
    });

    this.__defineGetter__("TRANSMISSIONMODE_ECONOMY", function () {
        return 2;
    });

    this.__defineGetter__("TRANSMISSIONMODE_OEMCUSTOM1", function () {
        return 3;
    });

    this.__defineGetter__("TRANSMISSIONMODE_OEMCUSTOM2", function () {
        return 4;
    });

    this.__defineGetter__("gearPosition", function () {
        return transmission.gearPosition;
    });

    this.__defineSetter__("gearPosition", function (val) {
        try {
            val = t.octet(val);
            if ((val >= 0 && val <= 10) || val === 64 || val === 128 ||
                val === 255) {
                transmission.gearPosition = val;
            }
        } catch (err) {
        }
    });

    this.__defineGetter__("mode", function () {
        return transmission.mode;
    });

    this.__defineSetter__("mode", function (val) {
        try {
            val = t.octet(val);
            if (val < 0 || val > 4) {
                return;
            }
            transmission.mode = val;
        } catch (err) {
        }
    });
};

CruiseControlStatus = function (propertyTypes) {
    var cruiseControlStatus = {};

    VehiclePropertyType.call(this, propertyTypes);

    cruiseControlStatus.activated = propertyTypes.activated || false;
    cruiseControlStatus.speed = propertyTypes.speed || 0;

    this.__defineGetter__("activated", function () {
        return cruiseControlStatus.activated;
    });

    this.__defineSetter__("activated", function (val) {
        try {
            cruiseControlStatus.activated = t.boolean(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("speed", function () {
        return cruiseControlStatus.speed;
    });

    this.__defineSetter__("speed", function (val) {
        try {
            cruiseControlStatus.speed = t.unsigned_short(val);
        } catch (err) {
        }
    });
};

WheelBrake = function (propertyTypes) {
    var wheelBrake = {};

    VehiclePropertyType.call(this, propertyTypes);

    wheelBrake.engaged = propertyTypes.engaged || false;

    this.__defineGetter__("engaged", function () {
        return wheelBrake.engaged;
    });

    this.__defineSetter__("engaged", function (val) {
        try {
            wheelBrake.engaged = t.boolean(val);
        } catch (err) {
        }
    });
};

LightStatus = function (propertyTypes) {
    var lightStatus = {};

    VehiclePropertyType.call(this, propertyTypes);

    lightStatus.head = propertyTypes.head || false;
    lightStatus.rightTurn = propertyTypes.rightTurn || false;
    lightStatus.leftTurn = propertyTypes.leftTurn || false;
    lightStatus.brake = propertyTypes.brake || false;
    lightStatus.fog = propertyTypes.fog || false;
    lightStatus.hazard = propertyTypes.hazard || false;
    lightStatus.parking = propertyTypes.parking || false;
    lightStatus.highBeam = propertyTypes.highBeam || false;

    this.__defineGetter__("head", function () {
        return lightStatus.head;
    });

    this.__defineSetter__("head", function (val) {
        try {
            lightStatus.head = t.boolean(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("rightTurn", function () {
        return lightStatus.rightTurn;
    });

    this.__defineSetter__("rightTurn", function (val) {
        try {
            lightStatus.rightTurn = t.boolean(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("leftTurn", function () {
        return lightStatus.leftTurn;
    });

    this.__defineSetter__("leftTurn", function (val) {
        try {
            lightStatus.leftTurn = t.boolean(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("brake", function () {
        return lightStatus.brake;
    });

    this.__defineSetter__("brake", function (val) {
        try {
            lightStatus.brake = t.boolean(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("fog", function () {
        return lightStatus.fog;
    });

    this.__defineSetter__("fog", function (val) {
        try {
            lightStatus.fog = t.boolean(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("hazard", function () {
        return lightStatus.hazard;
    });

    this.__defineSetter__("hazard", function (val) {
        try {
            lightStatus.hazard = t.boolean(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("parking", function () {
        return lightStatus.parking;
    });

    this.__defineSetter__("parking", function (val) {
        try {
            lightStatus.parking = t.boolean(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("highBeam", function () {
        return lightStatus.highBeam;
    });

    this.__defineSetter__("highBeam", function (val) {
        try {
            lightStatus.highBeam = t.boolean(val);
        } catch (err) {
        }
    });
};

InteriorLightStatus = function (propertyTypes) {
    var interiorLightStatus = {};

    VehiclePropertyType.call(this, propertyTypes);

    interiorLightStatus.passenger = propertyTypes.passenger || false;
    interiorLightStatus.driver = propertyTypes.driver || false;
    interiorLightStatus.center = propertyTypes.center || false;

    this.__defineGetter__("passenger", function () {
        return interiorLightStatus.passenger;
    });

    this.__defineSetter__("passenger", function (val) {
        try {
            interiorLightStatus.passenger = t.boolean(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("driver", function () {
        return interiorLightStatus.driver;
    });

    this.__defineSetter__("driver", function (val) {
        try {
            interiorLightStatus.driver = t.boolean(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("center", function () {
        return interiorLightStatus.center;
    });

    this.__defineSetter__("center", function (val) {
        try {
            interiorLightStatus.center = t.boolean(val);
        } catch (err) {
        }
    });
};

Horn = function (propertyTypes) {
    var horn = {};

    VehiclePropertyType.call(this, propertyTypes);

    horn.on = propertyTypes.on || false;

    this.__defineGetter__("on", function () {
        return horn.on;
    });

    this.__defineSetter__("on", function (val) {
        try {
            horn.on = t.boolean(val);
        } catch (err) {
        }
    });
};

Fuel = function (propertyTypes) {
    var fuel = {};

    VehiclePropertyType.call(this, propertyTypes);

    fuel.level = propertyTypes.level || 0;
    fuel.range = propertyTypes.range || 0;
    fuel.instantConsumption = propertyTypes.instantConsumption || 0;
    fuel.instantEconomy = propertyTypes.instantEconomy || 0;
    fuel.averageEconomy = propertyTypes.averageEconomy || 0;

    this.__defineGetter__("level", function () {
        return fuel.level;
    });

    this.__defineSetter__("level", function (val) {
        try {
            fuel.level = t.unsigned_short(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("range", function () {
        return fuel.range;
    });

    this.__defineSetter__("range", function (val) {
        try {
            fuel.range = t.unsigned_short(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("instantConsumption", function () {
        return fuel.instantConsumption;
    });

    this.__defineSetter__("instantConsumption", function (val) {
        try {
            fuel.instantConsumption = t.unsigned_short(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("instantEconomy", function () {
        return fuel.instantEconomy;
    });

    this.__defineSetter__("instantEconomy", function (val) {
        try {
            fuel.instantEconomy = t.unsigned_short(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("averageEconomy", function () {
        return fuel.averageEconomy;
    });

    this.__defineSetter__("averageEconomy", function (val) {
        try {
            //Setting this to any value should reset the counter to '0'
            fuel.averageEconomy = t.unsigned_short(val);
        } catch (err) {
        }
    });
};

EngineOil = function (propertyTypes) {
    var engineOil = {};

    VehiclePropertyType.call(this, propertyTypes);

    engineOil.remaining = propertyTypes.remaining || 0;
    engineOil.temperature = propertyTypes.temperature || 0;
    engineOil.pressure = propertyTypes.Pressure || 0;

    this.__defineGetter__("remaining", function () {
        return engineOil.remaining;
    });

    this.__defineSetter__("remaining", function (val) {
        try {
            engineOil.remaining = t.unsigned_short(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("temperature", function () {
        return engineOil.temperature;
    });

    this.__defineSetter__("temperature", function (val) {
        try {
            engineOil.temperature = t.long(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("pressure", function () {
        return engineOil.pressure;
    });

    this.__defineSetter__("pressure", function (val) {
        try {
            engineOil.pressure = t.unsigned_short(val);
        } catch (err) {
        }
    });
};

Location = function (propertyTypes) {
    var location = {};

    VehiclePropertyType.call(this, propertyTypes);

    location.latitude = propertyTypes.latitude || 0;
    location.longitude = propertyTypes.longitude || 0;
    location.altitude = propertyTypes.altitude || 0;
    location.direction = propertyTypes.direction || 0;

    this.__defineGetter__("latitude", function () {
        return location.latitude;
    });

    this.__defineSetter__("latitude", function (val) {
        try {
            val = t.double(val);
            if (val >= -180 && val <= 180) {
                location.latitude = val;
            }
        } catch (err) {
        }
    });

    this.__defineGetter__("longitude", function () {
        return location.longitude;
    });

    this.__defineSetter__("longitude", function (val) {
        try {
            val = t.double(val);
            if (val >= -90 && val <= 90) {
                location.longitude = val;
            }
        } catch (err) {
        }
    });

    this.__defineGetter__("altitude", function () {
        return location.altitude;
    });

    this.__defineSetter__("altitude", function (val) {
        try {
            val = t.double(val);
            if (val >= 0) {
                location.altitude = val;
            }
        } catch (err) {
        }
    });

    this.__defineGetter__("direction", function () {
        return location.direction;
    });

    this.__defineSetter__("direction", function (val) {
        try {
            val = t.unsigned_short(val);
            if (val >= 0 && val < 360) {
                location.direction = val;
            }
        } catch (err) {
        }
    });
};

ExteriorBrightness = function (propertyTypes) {
    var eb = {};

    VehiclePropertyType.call(this, propertyTypes);

    eb.exteriorBrightness = propertyTypes.exteriorBrightness || 0;

    this.__defineGetter__("exteriorBrightness", function () {
        return eb.exteriorBrightness;
    });

    this.__defineSetter__("exteriorBrightness", function (val) {
        try {
            eb.exteriorBrightness = t.unsigned_long(val);
        } catch (err) {
        }
    });
};

Temperature = function (propertyTypes) {
    var temperature = {};

    VehiclePropertyType.call(this, propertyTypes);

    temperature.interior = propertyTypes.interior || 0;
    temperature.exterior = propertyTypes.exterior || 0;

    this.__defineGetter__("interior", function () {
        return temperature.interior;
    });

    this.__defineSetter__("interior", function (val) {
        try {
            temperature.interior = t.short(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("exterior", function () {
        return temperature.exterior;
    });

    this.__defineSetter__("exterior", function (val) {
        try {
            temperature.exterior = t.short(val);
        } catch (err) {
        }
    });
};

RainSensor = function (propertyTypes) {
    var rainSensor = {};

    VehiclePropertyType.call(this, propertyTypes);

    rainSensor.rainSensor = propertyTypes.rainSensor || 0;

    this.__defineGetter__("rainSensor", function () {
        return rainSensor.rainSensor;
    });

    this.__defineSetter__("rainSensor", function (val) {
        try {
            val = t.unsigned_short(val);
            if (val >= 0 && val <= 10) {
                rainSensor.rainSensor = val;
            }
        } catch (err) {
        }
    });
};

WindshieldWiper = function (propertyTypes) {
    var windshieldWiper = {};

    VehiclePropertyType.call(this, propertyTypes);

    windshieldWiper.windshieldWiper = propertyTypes.windshieldWiper || 0;

    this.__defineGetter__("WIPERSPEED_OFF", function () {
        return 0;
    });

    this.__defineGetter__("WIPERSPEED_SLOWEST", function () {
        return 1;
    });

    this.__defineGetter__("WIPERSPEED_FASTEST", function () {
        return 5;
    });

    this.__defineGetter__("WIPERSPEED_AUTO", function () {
        return 10;
    });

    this.__defineGetter__("windshieldWiper", function () {
        return windshieldWiper.windshieldWiper;
    });

    this.__defineSetter__("windshieldWiper", function (val) {
        try {
            val = t.unsigned_short(val);
            if (val === 0 || val === 1 || val === 5 || val === 10) {
                windshieldWiper.windshieldWiper = val;
            }
        } catch (err) {
        }
    });
};

HVAC = function (propertyTypes) {
    var hvac = {};

    VehiclePropertyType.call(this, propertyTypes);

    hvac.airflowDirection = propertyTypes.airflowDirection || 0;
    hvac.fanSpeed = propertyTypes.fanSpeed || 0;
    hvac.targetTemperature = propertyTypes.targetTemperature || 0;
    hvac.airConditioning = propertyTypes.airConditioning || false;
    hvac.airRecirculation = propertyTypes.airRecirculation || false;
    hvac.heater = propertyTypes.heater || false;
    hvac.steeringWheelHeater = propertyTypes.steeringWheelHeater || false;
    hvac.seatHeater = propertyTypes.seatHeater || false;
    hvac.seatCooler = propertyTypes.seatCooler || false;

    this.__defineGetter__("AIRFLOWDIRECTION_FRONTPANEL", function () {
        return 0;
    });

    this.__defineGetter__("AIRFLOWDIRECTION_FLOORDUCT", function () {
        return 1;
    });

    this.__defineGetter__("AIRFLOWDIRECTION_FRONT", function () {
        return 0x02;
    });

    this.__defineGetter__("AIRFLOWDIRECTION_DEFROSTER", function () {
        return 0x04;
    });

    this.__defineGetter__("airflowDirection", function () {
        return hvac.airflowDirection;
    });

    this.__defineSetter__("airflowDirection", function (val) {
        try {
            val = t.unsigned_short(val);
            if (val === 0 || val === 1 || val === 0x02 || val === 0x04) {
                hvac.airflowDirection = val;
            }
        } catch (err) {
        }
    });

    this.__defineGetter__("fanSpeed", function () {
        return hvac.fanSpeed;
    });

    this.__defineSetter__("fanSpeed", function (val) {
        try {
            val = t.unsigned_short(val);
            if (val >= 0 && val <= 7) {
                hvac.fanSpeed = val;
            }
        } catch (err) {
        }
    });

    this.__defineGetter__("targetTemperature", function () {
        return hvac.targetTemperature;
    });

    this.__defineSetter__("targetTemperature", function (val) {
        try {
            hvac.targetTemperature = t.unsigned_short(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("airConditioning", function () {
        return hvac.airConditioning;
    });

    this.__defineSetter__("airConditioning", function (val) {
        try {
            hvac.airConditioning = t.boolean(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("airRecirculation", function () {
        return hvac.airRecirculation;
    });

    this.__defineSetter__("airRecirculation", function (val) {
        try {
            hvac.airRecirculation = t.boolean(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("heater", function () {
        return hvac.heater;
    });

    this.__defineSetter__("heater", function (val) {
        try {
            hvac.heater = t.boolean(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("steeringWheelHeater", function () {
        return hvac.steeringWheelHeater;
    });

    this.__defineSetter__("steeringWheelHeater", function (val) {
        try {
            hvac.steeringWheelHeater = t.boolean(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("seatHeater", function () {
        return hvac.seatHeater;
    });

    this.__defineSetter__("seatHeater", function (val) {
        try {
            hvac.seatHeater = t.boolean(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("seatCooler", function () {
        return hvac.seatCooler;
    });

    this.__defineSetter__("seatCooler", function (val) {
        try {
            hvac.seatCooler = t.boolean(val);
        } catch (err) {
        }
    });
};

WindowStatus = function (propertyTypes) {
    var windowStatus = {};

    VehiclePropertyType.call(this, propertyTypes);

    windowStatus.openness = propertyTypes.openness || 0;
    windowStatus.defrost = propertyTypes.defrost || false;

    this.__defineGetter__("WINDOWLOCATION_DRIVER", function () {
        return 0;
    });

    this.__defineGetter__("WINDOWLOCATION_PASSENGER", function () {
        return 1;
    });

    this.__defineGetter__("WINDOWLOCATION_LEFTREAR", function () {
        return 2;
    });

    this.__defineGetter__("WINDOWLOCATION_RIGHTREAR", function () {
        return 3;
    });

    this.__defineGetter__("WINDOWLOCATION_REAR", function () {
        return 4;
    });

    this.__defineGetter__("openness", function () {
        return windowStatus.openness;
    });

    this.__defineSetter__("openness", function (val) {
        try {
            val = t.unsigned_short(val);
            if (val >= 0 && val <= 100) {
                windowStatus.openness = val;
            }
        } catch (err) {
        }
    });

    this.__defineGetter__("defrost", function () {
        return windowStatus.defrost;
    });

    this.__defineSetter__("defrost", function (val) {
        try {
            windowStatus.defrost = t.boolean(val);
        } catch (err) {
        }
    });
};

Sunroof = function (propertyTypes) {
    var sunroof = {};

    VehiclePropertyType.call(this, propertyTypes);

    sunroof.openness = propertyTypes.openness || 0;
    sunroof.tilt = propertyTypes.tilt || 0;

    this.__defineGetter__("openness", function () {
        return sunroof.openness;
    });

    this.__defineSetter__("openness", function (val) {
        try {
            sunroof.openness = t.unsigned_short(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("tilt", function () {
        return sunroof.tilt;
    });

    this.__defineSetter__("tilt", function (val) {
        try {
            sunroof.tilt = t.unsigned_short(val);
        } catch (err) {
        }
    });
};

ConvertibleRoof = function (propertyTypes) {
    var convertibleRoof = {};

    VehiclePropertyType.call(this, propertyTypes);

    convertibleRoof.openness = propertyTypes.openness || 0;

    this.__defineGetter__("openness", function () {
        return convertibleRoof.openness;
    });

    this.__defineSetter__("openness", function (val) {
        try {
            convertibleRoof.openness = t.unsigned_short(val);
        } catch (err) {
        }
    });
};

VehicleId = function (propertyTypes) {
    var vehicleId = {};

    VehiclePropertyType.call(this, propertyTypes);

    vehicleId.WMI = propertyTypes.WMI || "";
    vehicleId.VIN = propertyTypes.VIN || "";

    this.__defineGetter__("WMI", function () {
        return vehicleId.WMI;
    });

    this.__defineSetter__("WMI", function (val) {
        try {
            //?
            vehicleId.WMI = t.DOMString(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("VIN", function () {
        return vehicleId.VIN;
    });

    this.__defineSetter__("VIN", function (val) {
        try {
            //?
            vehicleId.VIN = t.DOMString(val);
        } catch (err) {
        }
    });
};

Size = function (propertyTypes) {
    var size = {};

    VehiclePropertyType.call(this, propertyTypes);

    size.width = propertyTypes.width || 0;
    size.height = propertyTypes.height || 0;
    size.length = propertyTypes.length || 0;

    this.__defineGetter__("width", function () {
        return size.width;
    });

    this.__defineSetter__("width", function (val) {
        try {
            size.width = t.unsigned_long(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("height", function () {
        return size.height;
    });

    this.__defineSetter__("height", function (val) {
        try {
            size.height = t.unsigned_long(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("length", function () {
        return size.length;
    });

    this.__defineSetter__("length", function (val) {
        try {
            size.length = t.unsigned_long(val);
        } catch (err) {
        }
    });
};

FuelInfo = function (propertyTypes) {
    var fuelInfo = {};

    VehiclePropertyType.call(this, propertyTypes);

    fuelInfo.type = propertyTypes.type || 0;
    fuelInfo.refuelPosition = propertyTypes.refuelPosition || 0;

    this.__defineGetter__("FUELTYPE_GASOLINE", function () {
        return 0;
    });

    this.__defineGetter__("FUELTYPE_HIGH_OCTANE", function () {
        return 1;
    });

    this.__defineGetter__("FUELTYPE_DIESEL", function () {
        return 2;
    });

    this.__defineGetter__("FUELTYPE_ELECTRIC", function () {
        return 3;
    });

    this.__defineGetter__("FUELTYPE_HYDROGEN", function () {
        return 4;
    });

    this.__defineGetter__("REFUELPOSITION_LEFT", function () {
        return 0;
    });

    this.__defineGetter__("REFUELPOSITION_RIGHT", function () {
        return 1;
    });

    this.__defineGetter__("REFUELPOSITION_FRONT", function () {
        return 2;
    });

    this.__defineGetter__("REFUELPOSITION_REAR", function () {
        return 3;
    });

    this.__defineGetter__("type", function () {
        return fuelInfo.type;
    });

    this.__defineSetter__("type", function (val) {
        try {
            val = t.unsigned_short(val);
            if (val >= 0 && val <= 4) {
                fuelInfo.type = val;
            }
        } catch (err) {
        }
    });

    this.__defineGetter__("refuelPosition", function () {
        return fuelInfo.refuelPosition;
    });

    this.__defineSetter__("refuelPosition", function (val) {
        try {
            val = t.unsigned_short(val);
            if (val >= 0 && val <= 3) {
                fuelInfo.refuelPosition = val;
            }
        } catch (err) {
        }
    });
};

VehicleType = function (propertyTypes) {
    var vehicleType = {};

    VehiclePropertyType.call(this, propertyTypes);

    vehicleType.type = propertyTypes.type || 0;

    this.__defineGetter__("VEHICLETYPE_SEDAN", function () {
        return 0;
    });

    this.__defineGetter__("VEHICLETYPE_COUPE", function () {
        return 1;
    });

    this.__defineGetter__("VEHICLETYPE_CABRIOLE", function () {
        return 2;
    });

    this.__defineGetter__("VEHICLETYPE_ROADSTER", function () {
        return 3;
    });

    this.__defineGetter__("VEHICLETYPE_SUV", function () {
        return 4;
    });

    this.__defineGetter__("VEHICLETYPE_TRUCK", function () {
        return 5;
    });

    this.__defineGetter__("type", function () {
        return vehicleType.type;
    });

    this.__defineSetter__("type", function (val) {
        try {
            val = t.unsigned_short(val);
            if (val >= 0 && val <= 5) {
                vehicleType.type = val;
            }
        } catch (err) {
        }
    });
};

Doors = function (propertyTypes) {
    var doors = {};

    VehiclePropertyType.call(this, propertyTypes);

    doors.doorsPerRow = propertyTypes.doorsPerRow || [];

    this.__defineGetter__("doorsPerRow", function () {
        return doors.doorsPerRow;
    });

    this.__defineSetter__("doorsPerRow", function (val) {
        try {
            doors.doorsPerRow = t.unsigned_short(val, "[]");
        } catch (err) {
        }
    });
};

TransmissionGearType = function (propertyTypes) {
    var trans = {};

    VehiclePropertyType.call(this, propertyTypes);

    trans.transmissionGearType = propertyTypes.transmissionGearType || 0;

    this.__defineGetter__("TRANSMISSIONGEARTYPE_AUTO", function () {
        return 0;
    });

    this.__defineGetter__("TRANSMISSIONGEARTYPE_MANUAL", function () {
        return 1;
    });

    this.__defineGetter__("TRANSMISSIONGEARTYPE_CV", function () {
        return 2;
    });

    this.__defineGetter__("transmissionGearType", function () {
        return trans.transmissionGearType;
    });

    this.__defineSetter__("transmissionGearType", function (val) {
        try {
            val = t.unsigned_short(val);
            if (val >= 0 && val <= 2) {
                trans.transmissionGearType = val;
            }
        } catch (err) {
        }
    });
};

WheelInformation = function (propertyTypes) {
    var wheelInfo = {};

    VehiclePropertyType.call(this, propertyTypes);

    wheelInfo.frontWheelRadius = propertyTypes.frontWheelRadius || 0;
    wheelInfo.rearWheelRadius = propertyTypes.rearWheelRadius || 0;
    wheelInfo.wheelTrack = propertyTypes.wheelTrack || 0;
    wheelInfo.ABS = propertyTypes.ABS || false;

    this.__defineGetter__("frontWheelRadius", function () {
        return wheelInfo.frontWheelRadius;
    });

    this.__defineSetter__("frontWheelRadius", function (val) {
        try {
            wheelInfo.frontWheelRadius =t.unsigned_short(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("rearWheelRadius", function () {
        return wheelInfo.rearWheelRadius;
    });

    this.__defineSetter__("rearWheelRadius", function (val) {
        try {
            wheelInfo.rearWheelRadius =t.unsigned_short(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("wheelTrack", function () {
        return wheelInfo.wheelTrack;
    });

    this.__defineSetter__("wheelTrack", function (val) {
        try {
            wheelInfo.wheelTrack =t.unsigned_long(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("ABS", function () {
        return wheelInfo.ABS;
    });

    this.__defineSetter__("ABS", function (val) {
        try {
            wheelInfo.ABS =t.boolean(val);
        } catch (err) {
        }
    });
};

Odometer = function (propertyTypes) {
    var odm = {};

    VehiclePropertyType.call(this, propertyTypes);

    odm.odometer = propertyTypes.odometer || 0;

    this.__defineGetter__("odometer", function () {
        return odm.odometer;
    });

    this.__defineSetter__("odometer", function (val) {
        try {
            odm.odometer = t.unsigned_long(val);
        } catch (err) {
        }
    });
};

Fluid = function (propertyTypes) {
    var fluid = {};

    VehiclePropertyType.call(this, propertyTypes);

    fluid.transmission = propertyTypes.transmission || 0;
    fluid.brake = propertyTypes.brake || 0;
    fluid.washer = propertyTypes.washer || 0;

    this.__defineGetter__("transmission", function () {
        return fluid.transmission;
    });

    this.__defineSetter__("transmission", function (val) {
        try {
            val = t.unsigned_short(val);
            if (val >= 0 && val <= 100) {
                fluid.transmission = val;
            }
        } catch (err) {
        }
    });

    this.__defineGetter__("brake", function () {
        return fluid.brake;
    });

    this.__defineSetter__("brake", function (val) {
        try {
            val = t.unsigned_short(val);
            if (val >= 0 && val <= 100) {
                fluid.brake = val;
            }
        } catch (err) {
        }
    });

    this.__defineGetter__("washer", function () {
        return fluid.washer;
    });

    this.__defineSetter__("washer", function (val) {
        try {
            val = t.unsigned_short(val);
            if (val >= 0 && val <= 100) {
                fluid.washer = val;
            }
        } catch (err) {
        }
    });
};

Battery = function (propertyTypes) {
    var battery = {};

    VehiclePropertyType.call(this, propertyTypes);

    battery.voltage = propertyTypes.voltage || 0;
    battery.current = propertyTypes.current || 0;

    this.__defineGetter__("voltage", function () {
        return battery.voltage;
    });

    this.__defineSetter__("voltage", function (val) {
        try {
            battery.voltage = t.double(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("current", function () {
        return battery.current;
    });

    this.__defineSetter__("current", function (val) {
        try {
            battery.current = t.double(val);
        } catch (err) {
        }
    });
};

TirePressure = function (propertyTypes) {
    var tirePressure = {};

    VehiclePropertyType.call(this, propertyTypes);

    tirePressure.leftFront = propertyTypes.leftFront || 0;
    tirePressure.rightFront = propertyTypes.rightFront || 0;
    tirePressure.leftRear = propertyTypes.leftRear || 0;
    tirePressure.rightRear = propertyTypes.rightRear || 0;

    this.__defineGetter__("leftFront", function () {
        return tirePressure.leftFront;
    });

    this.__defineSetter__("leftFront", function (val) {
        try {
            tirePressure.leftFront = t.double(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("rightFront", function () {
        return tirePressure.rightFront;
    });

    this.__defineSetter__("rightFront", function (val) {
        try {
            tirePressure.rightFront = t.double(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("leftRear", function () {
        return tirePressure.leftRear;
    });

    this.__defineSetter__("leftRear", function (val) {
        try {
            tirePressure.leftRear = t.double(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("rightRear", function () {
        return tirePressure.rightRear;
    });

    this.__defineSetter__("rightRear", function (val) {
        try {
            tirePressure.rightRear = t.double(val);
        } catch (err) {
        }
    });
};

TireTemperature = function (propertyTypes) {
    var tireTemperature = {};

    VehiclePropertyType.call(this, propertyTypes);

    tireTemperature.leftFront = propertyTypes.leftFront || 0;
    tireTemperature.rightFront = propertyTypes.rightFront || 0;
    tireTemperature.leftRear = propertyTypes.leftRear || 0;
    tireTemperature.rightRear = propertyTypes.rightRear || 0;

    this.__defineGetter__("leftFront", function () {
        return tireTemperature.leftFront;
    });

    this.__defineSetter__("leftFront", function (val) {
        try {
            tireTemperature.leftFront = t.double(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("rightFront", function () {
        return tireTemperature.rightFront;
    });

    this.__defineSetter__("rightFront", function (val) {
        try {
            tireTemperature.rightFront = t.double(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("leftRear", function () {
        return tireTemperature.leftRear;
    });

    this.__defineSetter__("leftRear", function (val) {
        try {
            tireTemperature.leftRear = t.double(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("rightRear", function () {
        return tireTemperature.rightRear;
    });

    this.__defineSetter__("rightRear", function (val) {
        try {
            tireTemperature.rightRear = t.double(val);
        } catch (err) {
        }
    });
};

SecurityAlert = function (propertyTypes) {
    var securityAlert = {};

    VehiclePropertyType.call(this, propertyTypes);

    securityAlert.securityAlert = propertyTypes.securityAlert || false;

    this.__defineGetter__("securityAlert", function () {
        return securityAlert.securityAlert;
    });

    this.__defineSetter__("securityAlert", function (val) {
        try {
            securityAlert.securityAlert = t.boolean(val);
        } catch (err) {
        }
    });
};

ParkingBrake = function (propertyTypes) {
    var parkingBrake = {};

    VehiclePropertyType.call(this, propertyTypes);

    parkingBrake.parkingBrake = propertyTypes.parkingBrake || false;

    this.__defineGetter__("parkingBrake", function () {
        return parkingBrake.parkingBrake;
    });

    this.__defineSetter__("parkingBrake", function (val) {
        try {
            parkingBrake.parkingBrake = t.boolean(val);
        } catch (err) {
        }
    });
};

ParkingLight = function (propertyTypes) {
    var parkingLight = {};

    VehiclePropertyType.call(this, propertyTypes);

    parkingLight.parkingLight = propertyTypes.parkingLight || false;

    this.__defineGetter__("parkingLight", function () {
        return parkingLight.parkingLight;
    });

    this.__defineSetter__("parkingLight", function (val) {
        try {
            parkingLight.parkingLight = t.boolean(val);
        } catch (err) {
        }
    });
};

HazardLight = function (propertyTypes) {
    var hazardLight = {};

    VehiclePropertyType.call(this, propertyTypes);

    hazardLight.hazardLight = propertyTypes.hazardLight || false;

    this.__defineGetter__("hazardLight", function () {
        return hazardLight.hazardLight;
    });

    this.__defineSetter__("hazardLight", function (val) {
        try {
            hazardLight.hazardLight = t.boolean(val);
        } catch (err) {
        }
    });
};

AntilockBrakingSystem = function (propertyTypes) {
    var abs = {};

    VehiclePropertyType.call(this, propertyTypes);

    abs.antilockBrakingSystem = propertyTypes.antilockBrakingSystem || false;

    this.__defineGetter__("antilockBrakingSystem", function () {
        return abs.antilockBrakingSystem;
    });

    this.__defineSetter__("antilockBrakingSystem", function (val) {
        try {
            abs.antilockBrakingSystem = t.boolean(val);
        } catch (err) {
        }
    });
};

TractionControlSystem = function (propertyTypes) {
    var tcs = {};

    VehiclePropertyType.call(this, propertyTypes);

    tcs.tractionControlSystem = propertyTypes.tractionControlSystem || false;

    this.__defineGetter__("tractionControlSystem", function () {
        return tcs.tractionControlSystem;
    });

    this.__defineSetter__("tractionControlSystem", function (val) {
        try {
            tcs.tractionControlSystem = t.boolean(val);
        } catch (err) {
        }
    });
};

VehicleTopSpeedLimit = function (propertyTypes) {
    var vtl = {};

    VehiclePropertyType.call(this, propertyTypes);

    vtl.vehicleTopSpeedLimit = propertyTypes.vehicleTopSpeedLimit || false;

    this.__defineGetter__("vehicleTopSpeedLimit", function () {
        return vtl.vehicleTopSpeedLimit;
    });

    this.__defineSetter__("vehicleTopSpeedLimit", function (val) {
        try {
            vtl.vehicleTopSpeedLimit = t.unsigned_short(val);
        } catch (err) {
        }
    });
};

AirbagStatus = function (propertyTypes) {
    var airbagStatus = {};

    VehiclePropertyType.call(this, propertyTypes);

    airbagStatus.airbagStatus = propertyTypes.airbagStatus || 0;

    this.__defineGetter__("AIRBAGSTATUS_INACTIVE", function () {
        return 0;
    });

    this.__defineGetter__("AIRBAGSTATUS_ACTIVE", function () {
        return 1;
    });

    this.__defineGetter__("AIRBAGSTATUS_DEPLOYED", function () {
        return 2;
    });

    this.__defineGetter__("airbagStatus", function () {
        return airbagStatus.airbagStatus;
    });

    this.__defineSetter__("airbagStatus", function (val) {
        try {
            val = t.unsigned_short(val);
            if (val === 0 || val === 1 || val === 2) {
                airbagStatus.airbagStatus = val;
            }
        } catch (err) {
        }
    });
};

DoorStatus = function (propertyTypes) {
    var doorStatus = {};

    VehiclePropertyType.call(this, propertyTypes);

    doorStatus.doorStatus = propertyTypes.doorStatus || 0;
    doorStatus.doorLockStatus = propertyTypes.doorLockStatus || false;
    doorStatus.childLockStatus = propertyTypes.childLockStatus || false;

    this.__defineGetter__("DOORSTATUS_CLOSED", function () {
        return 0;
    });

    this.__defineGetter__("DOORSTATUS_OPEN", function () {
        return 1;
    });

    this.__defineGetter__("DOORSTATUS_AJAR", function () {
        return 2;
    });

    this.__defineGetter__("doorStatus", function () {
        return doorStatus.doorStatus;
    });

    this.__defineSetter__("doorStatus", function (val) {
        try {
            val = t.unsigned_short(val);
            if (val === 0 || val === 1 || val === 2) {
                doorStatus.doorStatus = val;
            }
        } catch (err) {
        }
    });

    this.__defineGetter__("doorLockStatus", function () {
        return doorStatus.doorLockStatus;
    });

    this.__defineSetter__("doorLockStatus", function (val) {
        try {
            doorStatus.doorLockStatus = t.boolean(val);
        } catch (err) {
        }
    });

    this.__defineGetter__("childLockStatus", function () {
        return doorStatus.childLockStatus;
    });

    this.__defineSetter__("childLockStatus", function (val) {
        try {
            doorStatus.childLockStatus = t.boolean(val);
        } catch (err) {
        }
    });
};

SeatBeltStatus = function (propertyTypes) {
    var seatBeltStatus = {};

    VehiclePropertyType.call(this, propertyTypes);

    seatBeltStatus.seatBeltStatus = propertyTypes.seatBeltStatus || false;

    this.__defineGetter__("seatBeltStatus", function () {
        return seatBeltStatus.seatBeltStatus;
    });

    this.__defineSetter__("seatBeltStatus", function (val) {
        try {
            seatBeltStatus.seatBeltStatus = t.boolean(val);
        } catch (err) {
        }
    });
};

OccupantStatus = function (propertyTypes) {
    var occupantStatus = {};

    VehiclePropertyType.call(this, propertyTypes);

    occupantStatus.occupantStatus = propertyTypes.occupantStatus || 0;

    this.__defineGetter__("OCCUPANTSTATUS_VACANT", function () {
        return 0;
    });

    this.__defineGetter__("OCCUPANTSTATUS_CHILD", function () {
        return 1;
    });

    this.__defineGetter__("OCCUPANTSTATUS_ADULT", function () {
        return 2;
    });

    this.__defineGetter__("occupantStatus", function () {
        return occupantStatus.occupantStatus;
    });

    this.__defineSetter__("occupantStatus", function (val) {
        try {
            val = t.unsigned_short(val);
            if (val === 0 || val === 1 || val === 2) {
                occupantStatus.occupantStatus = val;
            }
        } catch (err) {
        }
    });
};

ObstacleDistance = function (propertyTypes) {
    var obstacleDistance = {};

    VehiclePropertyType.call(this, propertyTypes);

    obstacleDistance.obstacleDistance = propertyTypes.obstacleDistance || 0;

    this.__defineGetter__("DISTANCESENSORLOCATION_LEFTFRONT", function () {
        return 0;
    });

    this.__defineGetter__("DISTANCESENSORLOCATION_RIGHTFRONT", function () {
        return 1;
    });

    this.__defineGetter__("DISTANCESENSORLOCATION_LEFTREAR", function () {
        return 2;
    });

    this.__defineGetter__("DISTANCESENSORLOCATION_RIGHTREAR", function () {
        return 3;
    });

    this.__defineGetter__("DISTANCESENSORLOCATION_LEFTBLINDSPOT",
            function () {
        return 4;
    });

    this.__defineGetter__("DISTANCESENSORLOCATION_RIGHTBLINDSPOT",
            function () {
        return 5;
    });

    this.__defineGetter__("obstacleDistance", function () {
        return obstacleDistance.obstacleDistance;
    });

    this.__defineSetter__("obstacleDistance", function (val) {
        try {
            obstacleDistance.obstacleDistance = t.double(val);
        } catch (err) {
        }
    });
};

NightMode = function (propertyTypes) {
    var nightMode = {};

    VehiclePropertyType.call(this, propertyTypes);

    nightMode.nightMode = propertyTypes.nightMode || false;

    this.__defineGetter__("nightMode", function () {
        return nightMode.nightMode;
    });

    this.__defineSetter__("nightMode", function (val) {
        try {
            nightMode.nightMode = t.boolean(val);
        } catch (err) {
        }
    });
};

DrivingMode = function (propertyTypes) {
    var drivingMode = {};

    VehiclePropertyType.call(this, propertyTypes);

    drivingMode.drivingMode = propertyTypes.drivingMode || 0;

    this.__defineGetter__("drivingMode", function () {
        return drivingMode.drivingMode;
    });

    this.__defineSetter__("drivingMode", function (val) {
        try {
            val = t.unsigned_short(val);
            if (val === 0 || val === 1) {
                drivingMode.drivingMode = val;
            }
        } catch (err) {
        }
    });
};

TurnSignal = function (propertyTypes) {
    var turnSignal = {};

    VehiclePropertyType.call(this, propertyTypes);

    turnSignal.turnSignal = propertyTypes.turnSignal || 0;

    this.__defineGetter__("turnSignal", function () {
        return turnSignal.turnSignal;
    });

    this.__defineSetter__("turnSignal", function (val) {
        try {
            turnSignal.turnSignal = t.unsigned_short(val);
        } catch (err) {
        }
    });
};

ButtonEvent = function (propertyTypes) {
    var buttonEvent = {};

    VehiclePropertyType.call(this, propertyTypes);

    buttonEvent.buttonEvent = propertyTypes.buttonEvent || 0;

    this.__defineGetter__("buttonEvent", function () {
        return buttonEvent.buttonEvent;
    });

    this.__defineSetter__("buttonEvent", function (val) {
        try {
            buttonEvent.buttonEvent = t.unsigned_short(val);
        } catch (err) {
        }
    });
};

_initialize();

module.exports = _self;
