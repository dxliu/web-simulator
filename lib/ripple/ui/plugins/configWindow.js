/*
 *  Copyright 2011 Research In Motion Limited.
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
    db = require('ripple/db'),
    tooltip = require('ripple/ui/plugins/tooltip'),
    platform = require('ripple/platform'),
    items = [{name: "DEVICE", id: "device-conf-panel"},
             {name: "SYSTEM SETTINGS", id: "system-settings-conf-panel"},
             {name: "NETWORK", id: "network-conf-panel"}
            ],
    _KEY = "tizen-configuration-window-setting",
    _PERSISTENCE_KEY = "devicesettings",
    _DEVICESETTING_SAVE_KEY = "tizen-configuration-window-device-setting",
    _DB_APPLICATION_KEY = "tizen1-db-application",
    _DB_APPLICATION_SAVE_KEY = "tizen-configuration-window-application-key";

function reload() {
    window.tinyHipposReload = true;
    location.reload();
}

function _hideConfigWindow() {
    $("#configure-window-popup").hide("slide", {direction: "up"}, "slow");
    $("#overlayBackground").hide("fade", "slow");
}

function _cancelConfig() {
    $("#platform-select").val(platform.current().id);
    $("#platform-select").trigger("change");

    _hideConfigWindow();
}

function checkResolutionValue(val) {
    var ret = false;
    if (val >= 200 && val <= 2000) {
        ret = true;
    }
    return ret;
}

function _showConfigWindow() {
    var position_x;
    $("#item_container").empty();
    items.forEach(function (item) {
        $("#item_container").append('<div class="configuration-window-item">' + item.name + '</div>');
        $("#" + item.id).hide();
    });

    $("#content_container").show();
    $("#" + items[0].id).show("fast");

    $(".configuration-window-item:eq(0)").css("background-color", "#003399");
    $(".configuration-window-item:eq(0)").css("color", "#ffffff");

    $(".configuration-window-item").unbind('click');
    $(".configuration-window-item").bind("click", function () {
        $(".configuration-window-item").css("background-color", "#eeeeee");
        $(".configuration-window-item").css("color", "#333333");

        $(this).css("background-color", "#003399");
        $(this).css("color", "#ffffff");

        items.forEach(function (item) {
            $("#" + item.id).hide();
        });
        $("#" + items[$(this).index()].id).show("fast");
    });

    if ($("#configure-window-popup").is(":visible")) {
        $("#configure-window-popup").hide("slide", {direction: "up"}, "slow");
        $("#overlayBackground").hide("fade", "slow");
        return;
    }

    position_x = (($(window).width() - 800) / 2)  < 0 ? 0 : ($(window).width() - 800) / 2;
    $("#configure-window-popup").css("top", 80);
    $("#configure-window-popup").css("left", position_x);

    position_x = (($(window).width() - 400) / 2)  < 0 ? 0 : ($(window).width() - 400) / 2;
    $("#configure-window-done-popup").css("top", 80);
    $("#configure-window-done-popup").css("left", position_x);

    $("#overlayBackground").css("width", $(window).width());
    $("#overlayBackground").css("height", $(window).height());
    $("#overlayBackground").show("fade", "slow");
    $("#configure-window-popup").show("slide", {direction: "up"}, "slow");

    $("#configuration-window-done-btn").unbind('click');
    $("#configuration-window-done-btn").bind("click", function () {
        var platformId, version, device, type, width, height, url;

        // device & resolution setting
        platformId = jQuery("#platform-select").val();
        version = jQuery("#version-select").val();
        device = jQuery("#device-select").val();
        width = jQuery("#resolution-custom-width").val();
        height = jQuery("#resolution-custom-height").val();
        type = jQuery('input:radio[name="resolution-type"]:checked').val();

        if (type === "custom") {
            device = "custom";
            if (!checkResolutionValue(width) || !checkResolutionValue(height)) {
                return;
            }
        }

        if (platformId === "mobile" || platformId === "tizen") {
            platformId = "tizen";
            version = "2.0";
        }
        else {
            platformId = "ivi";
            version = "3.0";
        }

        platform.changeEnvironment({
            "name": platformId,
            "version": version
        }, device, function () {
            _hideConfigWindow();
            window.tinyHipposReload = true;
            url = location.href.replace(/&platform=(.+?)-(.+?)$/, "&platform=" + platformId + "-" + version);
            location.href = url;
            //reload();
        });
    });

    $("#configuration-window-close-btn").unbind('click');
    $("#configuration-window-close-btn").bind("click", function () {
        if ($("#configure-window-popup").is(":visible")) {
            _cancelConfig();
            return;
        }
    });
    tooltip.create("#configuration-window-save-btn", "Save Configuration");
    $("#configuration-window-save-btn").unbind('click');
    $("#configuration-window-save-btn").bind("click", function () {
        var _type, _device, _custom_width = 0, _custom_height = 0, programs, deviceInfo, _settings;

        deviceInfo = db.retrieveObject(_PERSISTENCE_KEY);
        db.saveObject(_DEVICESETTING_SAVE_KEY, deviceInfo);

        _device = jQuery("#device-select").val();
        _type = jQuery('input:radio[name="resolution-type"]:checked').val();
        if (_type === "custom") {
            _device = "custom";
            _custom_width = jQuery("#resolution-custom-width").val();
            _custom_height = jQuery("#resolution-custom-height").val();
        }
        _settings = {
            platformId : jQuery("#platform-select").val(),
            version : jQuery("#version-select").val(),
            device : _device,
            type : _type,
            custom_width : _custom_width,
            custom_height : _custom_height
        };
        db.saveObject(_KEY, _settings);
        programs = db.retrieveObject(_DB_APPLICATION_KEY);
        db.saveObject(_DB_APPLICATION_SAVE_KEY, programs);
    });
    tooltip.create("#configuration-window-load-btn", "Load Configuration");
    $("#configuration-window-load-btn").unbind('click');
    $("#configuration-window-load-btn").bind("click", function () {
        var platformList,
            deviceInfo,
            _settings,
            versionSelect = document.getElementById("version-select");
        if (db.retrieveObject(_DEVICESETTING_SAVE_KEY) === undefined) {
            //Never saving data exist
            return;
        }
        //reload system & network setting
        deviceInfo = db.retrieveObject(_DEVICESETTING_SAVE_KEY);
        db.saveObject("devicesettings", deviceInfo);
        jQuery("#devicesettings-content-container").empty();
        jQuery("#networksettings-content-container").empty();
        require('ripple/deviceSettings').initialize();
        require('ripple/ui/plugins/deviceSettings').terminate();
        require('ripple/ui/plugins/deviceSettings').initialize();

        //reload device setting
        jQuery(versionSelect).empty();
        _settings = db.retrieveObject(_KEY);
        jQuery("#platform-select").val(_settings.platformId);
        jQuery("#device-select").val(_settings.device);
        if (_settings.type === "custom") {
            $('input:radio[name="resolution-type"][value="custom"]').click();
            jQuery("#resolution-custom-width").val(parseInt(_settings.custom_width, 10));
            jQuery("#resolution-custom-height").val(parseInt(_settings.custom_height, 10));
        } else {
            $('input:radio[name="resolution-type"][value="predefined"]').click();
        }

        platformList = platform.getList();
        utils.forEach(platformList, function (platform) {
            utils.forEach(platform, function (version, versionNumber) {
                if (_settings.platformId === version.id) {
                    versionSelect.appendChild(utils.createElement("option", {
                        "innerText": versionNumber,
                        "value":  versionNumber
                    }));
                }
            });
        });
        jQuery("#version-select").val(_settings.version);
    });

    $(window).bind('resize', function () {
        var position_x = 0;
        $("#configure-window-popup").css("top", 80);
        position_x = (($(window).width() - 800) / 2)  < 0 ? 0 : ($(window).width() - 800) / 2;
        $("#configure-window-popup").css("left", position_x);

        $("#configure-window-done-popup").css("top", 180);
        position_x = (($(window).width() - 400) / 2)  < 0 ? 0 : ($(window).width() - 400) / 2;
        $("#configure-window-done-popup").css("left", position_x);

        $("#overlayBackground").css("width", $(window).width());
        $("#overlayBackground").css("height", $(window).height());
    });

    if (jQuery("#platform-select").val() === "ivi") {
        jQuery("#configuration-window-save-btn").hide();
        jQuery("#configuration-window-load-btn").hide();

        jQuery("#item_container :nth-child(2)").hide();
        jQuery("#item_container :nth-child(3)").hide();

        //jQuery("#hwkeys-panel").hide();
    }
    else {
        jQuery("#configuration-window-save-btn").show();
        jQuery("#configuration-window-load-btn").show();

        jQuery("#item_container :nth-child(2)").show();
        jQuery("#item_container :nth-child(3)").show();

        //jQuery("#hwkeys-panel").show();
    }
}

module.exports = {
    initialize: function () {
        if (platform.current().id === "cordova") {
            items.splice(1, 1);
        }
        $("#options-button-config-window").bind("click", function ()  {
            _showConfigWindow();
        });
    }
};
