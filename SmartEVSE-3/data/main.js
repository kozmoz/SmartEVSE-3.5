const MODE_SMART = 1;
const MODE_SOLAR = 2;

const LCD_LOCK_BUTTONS_DISABLED = 1;

// Automatic debug URL.
const endpoint = !document.location.href.includes('localhost')
    ? `${document.location.href}`
    : 'http://192.168.1.132/';

let initiated = false;
let mqttEditMode = false;
let ocppEditMode = false;

/**
 * @typedef {Object} SmartEVSEData
 * @property {string} version - Timestamp version.
 * @property {number} serialnr - Serial number of the device.
 * @property {'N/A'|'OFF'|'PAUSE'|'NORMAL'|'SOLAR'|'SMART'} mode - Current operation mode
 * @property {-1|0|1|2|3|4} mode_id - -1=N/A, 0=Off, 1=Normal, 2=Solar, 3=Smart, 4=Pause
 * @property {boolean} car_connected - Whether a car is currently connected.
 *
 * @property {Object} wifi
 * @property {string} wifi.status
 * @property {string} wifi.ssid
 * @property {number} wifi.rssi
 * @property {string} wifi.bssid
 *
 * @property {Object} evse
 * @property {number} evse.temp
 * @property {number} evse.temp_max
 * @property {boolean} evse.connected
 * @property {number} evse.access
 * @property {number} evse.mode
 * @property {0|1|2|3|4|5|6|7|8|9} evse.loadbl - 0=disabled, 1=master, 2=node1...9=node7
 * @property {number} evse.pwm
 * @property {boolean} evse.custombutton
 * @property {number} evse.solar_stop_timer
 * @property {string} evse.state
 * @property {0|1|2|3|4|5|6|7|8|9|10} evse.state_id
 * @property {string} evse.error
 * @property {number} evse.error_id
 * @property {string} evse.rfidreader
 * @property {string} evse.rfid
 *
 * @property {Object} settings
 * @property {number} settings.charge_current
 * @property {number} settings.override_current
 * @property {number} settings.current_min
 * @property {number} settings.current_max
 * @property {number} settings.current_main
 * @property {number} settings.current_max_circuit
 * @property {number} settings.current_max_sum_mains
 * @property {number} settings.max_sum_mains_time
 * @property {number} settings.solar_max_import
 * @property {number} settings.solar_start_current
 * @property {number} settings.solar_stop_time
 * @property {'NOT_PRESENT'|'ALWAYS_OFF'|'SOLAR_OFF'|'ALWAYS_ON'|'AUTO'} settings.enable_C2
 * @property {string} settings.mains_meter
 * @property {number} settings.starttime
 * @property {number} settings.stoptime
 * @property {0|1} settings.repeat - 0=no repeat, 1=daily repeat
 * @property {0|1} settings.lcdlock - 0=LCD buttons operational, 1=LCD buttons disabled
 * @property {0|1|2} settings.lock - 0=Disable, 1=Solenoid, 2=Motor
 * @property {0|1} settings.cablelock - 0=Cable Lock disabled, 1=Cable Lock enabled
 * @property {string} settings.required_evccid
 * @property {string} settings.modem
 *
 * @property {Object} mqtt
 * @property {string} mqtt.host
 * @property {number} mqtt.port
 * @property {string} mqtt.topic_prefix
 * @property {string} mqtt.username
 * @property {boolean} mqtt.password_set
 * @property {'Connected'|'Disconnected'} mqtt.status
 *
 * @property {Object} ocpp
 * @property {'Disabled'|'Enabled'} ocpp.mode
 * @property {string} ocpp.backend_url
 * @property {string} ocpp.cb_id
 * @property {string} ocpp.auth_key
 * @property {'Disabled'|'Enabled'} ocpp.auto_auth
 * @property {string} ocpp.auto_auth_idtag
 * @property {string} ocpp.status
 *
 * @property {Object} home_battery
 * @property {number} home_battery.current
 * @property {number} home_battery.last_update
 *
 * @property {Object} ev_meter
 * @property {string} ev_meter.description
 * @property {number} ev_meter.address
 * @property {number} ev_meter.import_active_power
 * @property {number} ev_meter.total_kwh
 * @property {number} ev_meter.charged_kwh
 * @property {Object} ev_meter.currents
 * @property {number} ev_meter.currents.TOTAL
 * @property {number} ev_meter.currents.L1
 * @property {number} ev_meter.currents.L2
 * @property {number} ev_meter.currents.L3
 * @property {number} ev_meter.import_active_energy
 * @property {number} ev_meter.export_active_energy
 *
 * @property {Object} mains_meter
 * @property {number} mains_meter.import_active_energy
 * @property {number} mains_meter.export_active_energy
 *
 * @property {Object} phase_currents
 * @property {number} phase_currents.TOTAL
 * @property {number} phase_currents.L1
 * @property {number} phase_currents.L2
 * @property {number} phase_currents.L3
 * @property {number} phase_currents.last_data_update
 * @property {Object} phase_currents.original_data
 * @property {number} phase_currents.original_data.TOTAL
 * @property {number} phase_currents.original_data.L1
 * @property {number} phase_currents.original_data.L2
 * @property {number} phase_currents.original_data.L3
 *
 * @property {Object} backlight
 * @property {number} backlight.timer
 * @property {string} backlight.status
 *
 * @property {Object} color
 * @property {Object} color.off
 * @property {number} color.off.R
 * @property {number} color.off.G
 * @property {number} color.off.B
 * @property {Object} color.normal
 * @property {number} color.normal.R
 * @property {number} color.normal.G
 * @property {number} color.normal.B
 * @property {Object} color.smart
 * @property {number} color.smart.R
 * @property {number} color.smart.G
 * @property {number} color.smart.B
 * @property {Object} color.solar
 * @property {number} color.solar.R
 * @property {number} color.solar.G
 * @property {number} color.solar.B
 * @property {Object} color.custom
 * @property {number} color.custom.R
 * @property {number} color.custom.G
 * @property {number} color.custom.B
 *
 * @property {Object} ev_state
 * @property {number} ev_state.initial_soc
 * @property {number} ev_state.remaining_soc
 * @property {number} ev_state.full_soc
 * @property {number} ev_state.energy_capacity
 * @property {number} ev_state.energy_request
 * @property {number} ev_state.computed_soc
 * @property {number} ev_state.time_until_full
 * @property {string} ev_state.evccid
 */

function initializeDisplayData(data) {
    // Executed once.
    if (initiated) {
        return;
    }
    initiated = true;
    $qs('#version').textContent = data.version;
    $qs('#version').setAttribute('data-version', data.version);
    $qs('#serialnr').append('' + data.serialnr);
    sessionStorage.setItem("version", JSON.stringify(data.version));
    sessionStorage.setItem("serialnr", JSON.stringify(data.serialnr));

    const minCurrent = Math.floor(data.settings.current_min);
    const maxCurrent = Math.floor(data.settings.current_max);

    // value 0 = no override
    if (data.evse.loadbl < 2) {
        const selectElement = $qs('#mode_override_current');
        selectElement.value = '0';
        const noOverrideOption = document.createElement('option');
        noOverrideOption.value = '0';
        noOverrideOption.text = 'no override';
        selectElement.appendChild(noOverrideOption);

        for (let x = minCurrent; x <= maxCurrent; x++) {
            const option = document.createElement('option');
            option.value = '' + x;
            option.text = x + 'A';
            selectElement.appendChild(option);
        }
    }
    $qs('#required_evccid').value = data.settings.required_evccid || "";
}

const LOAD_BALANCE_MASTER = 1;

/**
 * @param {SmartEVSEData} data
 */
function loadData(data) {

    initializeDisplayData(data);

    // Show the active mode-button (in green).
    $qs('#mode').textContent = data.mode;
    for (let x = 0; x <= 4; x++) {
        $qs('#mode_' + x).classList.toggle('btn-success', (x === data.mode_id));
    }

    $qs('#dutycycle').textContent = (data.evse.pwm * 100 / 1024).toFixed(0) + ' %';
    $qs('.with_solar').classList.toggle('hidden', (data.mode_id !== MODE_SOLAR));
    $qs('#override_current_box').classList.toggle('hidden', (data.mode_id === MODE_SOLAR));
    $qs('#override_current_box2').classList.toggle('hidden', (data.mode_id === MODE_SOLAR));

    if (data.ev_state) {

        const full_soc = data.ev_state.full_soc;
        const initial_soc = data.ev_state.initial_soc;
        const computed_soc = data.ev_state.computed_soc;
        const time_until_full = data.ev_state.time_until_full;
        const energy_capacity = data.ev_state.energy_capacity;
        const evccid = data.ev_state.evccid;

        $qs('#computed_soc').textContent = computed_soc >= 0 ? `${computed_soc} %` : "N/A";
        $qs('#full_soc').textContent = full_soc >= 0 ? `${full_soc} %` : "N/A";
        $qs('#initial_soc').textContent = initial_soc >= 0 ? `${initial_soc} %` : "N/A";
        $qs('#energy_capacity').textContent = energy_capacity >= 0 ? `${energy_capacity.toFixed(1)} kWh` : "N/A";
        $qs('#evccid').textContent = evccid || "N/A";

        $qs('#full_at').textContent = time_until_full > 0 ? new Date(+Date.now() + (time_until_full * 1000))
            .toLocaleString(undefined, {timeStyle: 'short', dateStyle: "short"}) : 'N/A';
        $qs('#full_at').title = time_until_full > 0 ? `${Math.round(time_until_full / 60)} min to go` : 'N/A';
    }

    if (data.mqtt) {
        $qs('#mqtt').textContent = (data.mqtt.status) || 'N/A';
        $qs('#mqtt').classList.toggle('hidden', false);
        $qs('#mqtt_config').classList.toggle('hidden', false);
    } else {
        $qs('#mqtt').textContent = '';
        $qs('#mqtt').classList.toggle('hidden', true);
        $qs('.config').classList.toggle('hidden', true);
        $qs('#mqtt_config').classList.toggle('hidden', true);
    }

    if (data.evse.loadbl > 1) {
        // We're a slave.
        $qs('#loadbl').classList.toggle('hidden', false);
        $qs('#loadbl_node').textContent = "Slave Node " + (data.evse.loadbl - 1);
        $qs('#contactor2').classList.toggle('hidden', true);
        $qs('#mode_2').classList.toggle('hidden', false);
        $qs('#mode_3').classList.toggle('hidden', false);
        $qs('.with_solar').classList.toggle('hidden', true);
        $qs('#override_current_box').classList.toggle('hidden', true);
        $qs('#override_current_box2').classList.toggle('hidden', true);
        $qsa('#form_pwm input').forEach(input => input.disabled = true);
    } else if (data.evse.loadbl === LOAD_BALANCE_MASTER) {
        // We're the master.
        $qs('#loadbl').classList.toggle('hidden', false);
        $qs('#loadbl_node').textContent = "Master";
        $qs('#contactor2').classList.toggle('hidden', true);
        $qs('#mode_2').classList.toggle('hidden', false);
        $qs('#mode_3').classList.toggle('hidden', false);
        $qs('.with_solar').classList.toggle('hidden', true);
        $qsa('#form_pwm input').forEach(input => input.disabled = false);
    } else {
        $qs('#loadbl').classList.toggle('hidden', true);
        $qs('#loadbl_text').classList.toggle('hidden', true);
        $qs('#contactor2').classList.toggle('hidden', false);
        $qs('#mode_2').classList.toggle('hidden', false);
        $qs('#mode_3').classList.toggle('hidden', false);
        $qsa('#form_pwm input').forEach(input => input.disabled = false);
    }

    $qs('#car_connected').textContent = data.car_connected ? "Yes" : "No";
    $qs('#state').textContent = data.evse.state;
    $qs('#temp').textContent = `${data.evse.temp} °C / ${data.evse.temp_max} °C`;

    const hasError = (data.evse.error !== "None");
    $qs('#error').textContent = hasError ? data.evse.error : '';
    $qs('#with_errors').classList.toggle('hidden', !hasError);

    if (data.evse.rfid !== "Not Installed") {
        $qs('#rfid').textContent = data.evse.rfid;
    } else {
        $qs('#show_rfid').classList.toggle('hidden', true);
    }

    if (data.evse.solar_stop_timer > 0) {
        $qs('#state').textContent += ` (Stopping in ${data.evse.solar_stop_timer}s)`;
    }

    $qs('#current_min').textContent = `${data.settings.current_min.toFixed(1)} A`;
    $qs('#current_max').textContent = `${data.settings.current_max.toFixed(1)} A`;
    $qs('#override_current').textContent = `${(data.settings.override_current / 10).toFixed(1)} A`;
    $qs('#enable_C2').textContent = data.settings.enable_C2;

    if (data.settings.starttime) {
        $qs('#starttime_date_time').textContent = `${new Date(data.settings.starttime * 1000).toLocaleDateString()} ${new Date(data.settings.starttime * 1000).toLocaleTimeString()}`;
    } else {
        $qs('#starttime_date_time').textContent = "none";
    }
    if (data.settings.stoptime) {
        $qs('#stoptime_date_time').textContent = `${new Date(data.settings.stoptime * 1000).toLocaleDateString()} ${new Date(data.settings.stoptime * 1000).toLocaleTimeString()}`;
    } else {
        $qs('#stoptime_date_time').textContent = "none";
    }

    $qs('#repeat').textContent = data.settings.repeat === 1 ? "Daily" : "none";

    $qs('#battery_current').textContent = (data.home_battery.current / 10).toFixed(1) + " A";
    $qs('#phase_total').textContent = (data.phase_currents.TOTAL / 10).toFixed(1) + " A";
    $qs('#phase_1').textContent = (data.phase_currents.L1 / 10).toFixed(1) + " A";
    $qs('#phase_2').textContent = (data.phase_currents.L2 / 10).toFixed(1) + " A";
    $qs('#phase_3').textContent = (data.phase_currents.L3 / 10).toFixed(1) + " A";
    $qs('#evmeter_currents_total').textContent = (data.ev_meter.currents.TOTAL / 10).toFixed(1) + " A";
    $qs('#evmeter_currents_1').textContent = (data.ev_meter.currents.L1 / 10).toFixed(1) + " A";
    $qs('#evmeter_currents_2').textContent = (data.ev_meter.currents.L2 / 10).toFixed(1) + " A";
    $qs('#evmeter_currents_3').textContent = (data.ev_meter.currents.L3 / 10).toFixed(1) + " A";
    $qs('#charge_current').textContent = (data.settings.charge_current / 10).toFixed(1) + " A";

    $qs('#phase_original_total').textContent = (data.phase_currents.original_data.TOTAL / 10).toFixed(1) + " A";
    $qs('#phase_original_1').textContent = (data.phase_currents.original_data.L1 / 10).toFixed(1) + " A";
    $qs('#phase_original_2').textContent = (data.phase_currents.original_data.L2 / 10).toFixed(1) + " A";
    $qs('#phase_original_3').textContent = (data.phase_currents.original_data.L3 / 10).toFixed(1) + " A";

    if (data.phase_currents.last_data_update > 0) {
        $qs('#p1_data_time').textContent = new Date(data.phase_currents.last_data_update * 1000).toLocaleTimeString();
        $qs('#p1_data_date').textContent = new Date(data.phase_currents.last_data_update * 1000).toLocaleDateString();
        $qs('#with_p1_api_data_date').classList.toggle('hidden', false);
        $qs('#with_p1_api_data_time').classList.toggle('hidden', false);
    } else {
        $qs('#with_p1_api_data_date').classList.toggle('hidden', true);
        $qs('#with_p1_api_data_time').classList.toggle('hidden', true);
    }

    $qs('#with_phase_details').classList.toggle('hidden', !data.home_battery.last_update);
    $qs('#with_homebattery').classList.toggle('hidden', !data.home_battery.last_update);

    if (!data.home_battery.current) {
        $qs('#battery_status').textContent = "Idle";
    } else {
        $qs('#battery_status').textContent = data.home_battery.current < 0 ? "Discharging" : "Charging";
    }

    const hasMainsMeter = data.settings.mains_meter !== "Disabled";
    $qs('#with_mainsmeter').classList.toggle('hidden', !hasMainsMeter);
    $qs('#with_mainsmeter_buttons').classList.toggle('hidden', !hasMainsMeter);

    const hasEVMeter = data.ev_meter.description !== "Disabled";
    $qs('#with_evmeter').classList.toggle('hidden', !hasEVMeter);
    $qs('#with_evmeter_currents').classList.toggle('hidden', !hasEVMeter);
    if (hasEVMeter) {
        $qs('#evmeter_description').textContent = data.ev_meter.description;
        $qs('#evmeter_power').textContent = `${data.ev_meter.import_active_power.toFixed(1)} kW`;
        $qs('#evmeter_total_kwh').textContent = `${data.ev_meter.total_kwh.toFixed(1)} kWh`;
        $qs('#evmeter_charged_kwh').textContent = `${data.ev_meter.charged_kwh.toFixed(1)} kWh`;
    }

    $qs('#solar_start_current').value = data.settings.solar_start_current;
    $qs('#solar_max_import_current').value = data.settings.solar_max_import;
    $qs('#solar_stop_time').value = data.settings.solar_stop_time;

    const hasModem = data.settings.modem === "Experiment" || data.settings.modem === "QCA7000";
    $qsa('.with_modem').forEach(el => el.classList.toggle('hidden', !hasModem));

    if (data.mqtt && !mqttEditMode) {
        $qs('#mqtt_host').value = data.mqtt.host;
        $qs('#mqtt_port').value = data.mqtt.port;
        $qs('#mqtt_username').value = data.mqtt.username;
        $qs('#mqtt_password').value = data.mqtt.password;
        $qs('#mqtt_topic_prefix').value = data.mqtt.topic_prefix;
    }

    const lcdlock = $qs("#lcdlock");
    const lcdlockLabel = $qs("#lcdlock_label");
    if (data.settings.lcdlock === LCD_LOCK_BUTTONS_DISABLED) {
        lcdlock.checked = true;
        lcdlockLabel.classList.remove("ui-checkbox-off");
        lcdlockLabel.classList.add("ui-checkbox-on");
    } else {
        lcdlock.checked = false;
        lcdlockLabel.classList.remove("ui-checkbox-on");
        lcdlockLabel.classList.add("ui-checkbox-off");
    }

    if (data.settings.lock !== 0) {
        if (data.settings.cablelock === 1) {
            $qs("#cablelock").checked = true;
            $qs("#cablelock_label").classList.remove("ui-checkbox-off")
            $qs("#cablelock_label").classList.add("ui-checkbox-on")
        } else {
            $qs("#cablelock").checked = false;
            $qs("#cablelock_label").classList.remove("ui-checkbox-on")
            $qs("#cablelock_label").classList.add("ui-checkbox-off")
        }
    } else {
        $qs('#cablelock').classList.toggle('hidden', true);
        $qs('#cablelock_label').classList.toggle('hidden', true);
    }

    if (data.ocpp) {
        if (data.ocpp.mode === "Enabled") {
            $qs('#ocpp_settings').classList.toggle('hidden', false);
            $qs("#enable_ocpp").checked = true;
            $qs("#enable_ocpp_label").classList.remove("ui-checkbox-off");
            $qs("#enable_ocpp_label").classList.add("ui-checkbox-on");
        } else {
            $qs('#ocpp_settings').classList.toggle('hidden', true);
            $qs("#enable_ocpp").checked = false;
            $qs("#enable_ocpp_label").classList.remove("ui-checkbox-on");
            $qs("#enable_ocpp_label").classList.add("ui-checkbox-off");
        }
        if (data.ocpp.auto_auth === "Enabled") {
            $qs('#ocpp_auto_auth_idtag_wrapper').classList.toggle('hidden', false);
            $qs("#ocpp_auto_auth").checked = true;
            $qs("#ocpp_auto_auth_label").classList.remove("ui-checkbox-off");
            $qs("#ocpp_auto_auth_label").classList.add("ui-checkbox-on");
        } else {
            $qs('#ocpp_auto_auth_idtag_wrapper').classList.toggle('hidden', true);
            $qs("#ocpp_auto_auth").checked = false;
            $qs("#ocpp_auto_auth_label").classList.remove("ui-checkbox-on");
            $qs("#ocpp_auto_auth_label").classList.add("ui-checkbox-off");
        }

        if (!ocppEditMode) {
            $qs('#ocpp_backend_url').value = data.ocpp.backend_url;
            $qs('#ocpp_cb_id').value = data.ocpp.cb_id;
            $qs('#ocpp_auth_key').value = data.ocpp.auth_key;
            $qs('#ocpp_auto_auth_idtag').value = data.ocpp.auto_auth_idtag;
        }
        $qs('#ocpp_ws_status').textContent = data.ocpp.status;

    } else {
        $qs('#ocpp_config_outer').classList.toggle('hidden', true);
    }
}

function initDisplay() {
    const ONE_SECOND_MS = 1000;
    const LCD = $qs('#lcd');
    const LCD_SCREEN = $qs('#lcd .lcd-screen');
    const LCD_BUTTONS = $qs('#lcd .lcd-buttons');
    let LCD_ACTIVATE = $qs('#lcd .lcd-activate');
    const PASSWORD_FIELD = $qs('#lcd-password');
    const PASSWORD_SUBMIT = $qs('#lcd-password-submit');
    const PASSWORD_FORM = $qs('#lcd-password-form');
    let passwordVerified = sessionStorage.getItem('passwordVerified') === 'true';

    if (passwordVerified) {
        PASSWORD_FORM.classList.add('invisible');
    }

    function updateLcdImage() {
        let signal;
        if (typeof AbortController !== 'undefined') {
            if (updateLcdImage.controller) {
                updateLcdImage.controller.abort('timeout');
            }
            updateLcdImage.controller = new AbortController();
            signal = updateLcdImage.controller.signal;
        }

        fetch(`${endpoint}lcd`, {signal})
            .then(response => {
                if (!response.ok) return;
                response.blob()
                    .then(blob => LCD_SCREEN.src = URL.createObjectURL(blob));
            });
    }

    function createImageUpdater(updateFunc, minDelay) {
        let lastExecuted = 0;
        let timer;

        return function (immediate = false) {
            const now = Date.now();
            clearTimeout(timer);

            if (immediate || now - lastExecuted >= minDelay) {
                updateFunc();
                lastExecuted = now;
                timer = setTimeout(() => {
                    lastExecuted = Date.now();
                    updateFunc();
                }, minDelay);
                return;
            }
            timer = setTimeout(() => {
                lastExecuted = Date.now();
                updateFunc();
            }, minDelay - (now - lastExecuted));
        };
    }

    const updateLCD = createImageUpdater(updateLcdImage, ONE_SECOND_MS);

    function sendButtonState(btnName, stateDown) {
        if (!passwordVerified) {
            alert("Please enter PIN code first");
            setTimeout(() => {
                PASSWORD_FIELD.focus();
            });
            return;
        }
        fetch(`${endpoint}lcd?button=${btnName}&state=${stateDown ? '1' : '0'}`, {method: 'POST'})
            .then(() => {
                // Immediate LCD screen refresh on button-up.
                !stateDown && updateLCD(true);
            });
    }

    function activateLCD() {
        if (!LCD_ACTIVATE) {
            return;
        }
        LCD_ACTIVATE.remove();
        setInterval(updateLCD, ONE_SECOND_MS);
        LCD_ACTIVATE = null;
    }

    function verifyPassword(event) {
        if (event?.preventDefault) {
            event.preventDefault();
        }
        const enteredPassword = PASSWORD_FIELD.value;
        fetch(`${endpoint}lcd-verify-password`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({password: enteredPassword})
        })
            .then(response => response.json())
            .then(data => {
                if (data?.success) {
                    passwordVerified = true;
                    // Keep verified during the complete browser session.
                    sessionStorage.setItem('passwordVerified', 'true');
                    alert("PIN verified. You can now use the buttons.");
                    PASSWORD_FORM.classList.add('invisible');
                    return;
                }
                throw new Error("Incorrect PIN");
            })
            .catch(() => {
                passwordVerified = false;
                sessionStorage.removeItem('passwordVerified');
                alert("Incorrect PIN. Please try again.");
                console.log("=== FIELD: ", PASSWORD_FIELD);
                setTimeout(() => {
                    PASSWORD_FIELD.focus();
                });
            })
    }

    PASSWORD_SUBMIT.addEventListener('click', verifyPassword);
    PASSWORD_FORM.addEventListener('submit', verifyPassword);

    ['mousedown', 'mouseup'].forEach(eventName => {
        LCD_BUTTONS.addEventListener(eventName, event => {
            activateLCD();
            const btnName = event.target.dataset.name;
            const stateDown = event.type === 'mousedown';
            btnName && sendButtonState(btnName, stateDown);
        });
    });

    LCD.addEventListener('mousedown', activateLCD, {once: true});
    updateLcdImage();
}


function SolStartCurr() {
    const val = $qs('#solar_start_current').value;
    // noinspection JSIgnoredPromiseFromCall
    fetch(`${endpoint}settings?solar_start_current=${val}`, {method: 'POST'});
}

function SolImportCurr() {
    const val = $qs('#solar_max_import_current').value;
    // noinspection JSIgnoredPromiseFromCall
    fetch(`${endpoint}settings?solar_max_import=${val}`, {method: 'POST'});
}

function SolStopTime() {
    const val = $qs('#solar_stop_time').value;
    // noinspection JSIgnoredPromiseFromCall
    fetch(`${endpoint}settings?stop_timer=${val}`, {method: 'POST'});
}

/**
 * Activates a mode by sending configuration data to the server.
 *
 * @param {0|1|2|3|4} mode - The operating mode to activate
 */
function activate(mode) {
    const startTime = $qs('input[name="starttime"]').value;
    const stopTime = $qs('input[name="stoptime"]').value;
    const repeat2 = +$qs('#daily_repeat').checked;
    if (mode === MODE_SMART || mode === MODE_SOLAR || mode === MODE_SMART) {
        const override_current = $qs('#mode_override_current').value;
        // noinspection JSIgnoredPromiseFromCall
        fetch(`${endpoint}settings?mode=${mode}&override_current=${override_current * 10}&starttime=${startTime}&stoptime=${stopTime}&repeat=${repeat2}`, {
            method: 'POST'
        });
        return;
    }
    // noinspection JSIgnoredPromiseFromCall
    fetch(`${endpoint}settings?mode=${mode}&starttime=${startTime}&stoptime=${stopTime}&repeat=${repeat2}`, {
        method: 'POST'
    });
}

function toggleMqttEdit() {
    mqttEditMode = !mqttEditMode;
    if (mqttEditMode) {
        $qs('#edit_mqtt_button').textContent = "Close Settings";
        $qs('.mqtt_settings').classList.toggle('hidden', false);
        return;
    }
    $qs('#edit_mqtt_button').textContent = "Edit Settings";
    $qs('.mqtt_settings').classList.toggle('hidden', true);
}

function configureMqtt() {
    const mqtt_host = $qs('#mqtt_host').value;
    const mqtt_port = $qs('#mqtt_port').value;
    const mqtt_username = $qs('#mqtt_username').value;
    const mqtt_password = $qs('#mqtt_password').value;
    const mqtt_topic_prefix = $qs('#mqtt_topic_prefix').value;

    // noinspection JSCheckFunctionSignatures
    const params = new URLSearchParams({
        mqtt_update: 1,
        mqtt_host,
        mqtt_port,
        mqtt_username,
        mqtt_password,
        mqtt_topic_prefix
    });

    // noinspection JSIgnoredPromiseFromCall
    fetch(`${endpoint}settings?${params.toString()}`, {method: 'POST'});

    alert('Settings applied');
    toggleMqttEdit();
}

// noinspection JSUnresolvedReference
function toggleLCDlock() {
    const LCDlockCheckbox = $qs("#lcdlock");
    // noinspection JSIgnoredPromiseFromCall
    fetch(`${endpoint}settings?lcdlock=${LCDlockCheckbox.checked ? 1 : 0}`, {method: 'POST'});
}

function toggleCableLock() {
    const CableLockCheckbox = $qs("#cablelock");
    // noinspection JSIgnoredPromiseFromCall
    fetch(`${endpoint}settings?cablelock=${CableLockCheckbox.checked ? 1 : 0}`, {method: 'POST'});
}

function toggleEnableOcpp() {
    const enableOcppCheckbox = $qs("#enable_ocpp");
    // noinspection JSIgnoredPromiseFromCall
    fetch(`${endpoint}settings?ocpp_update=1&ocpp_mode=${enableOcppCheckbox.checked ? 1 : 0}`, {method: 'POST'});
}

function toggleEnableOcppAutoAuth() {
    const autoAuthCheckbox = $qs("#ocpp_auto_auth");
    // noinspection JSIgnoredPromiseFromCall
    fetch(`${endpoint}settings?ocpp_update=1&ocpp_auto_auth=${autoAuthCheckbox.checked ? 1 : 0}`, {method: 'POST'});
    // Show idTag box immediately if the "Auto" auth checkbox is checked.
    if (autoAuthCheckbox.checked) {
        triggerRefresh();
    }
}

function toggleOcppEdit() {
    ocppEditMode = !ocppEditMode;
    if (ocppEditMode) {
        $qs('#ocpp_save_btn').textContent = "Save";
        $qs('#ocpp_backend_url').disabled = false;
        $qs('#ocpp_cb_id').disabled = false;
        $qs('#ocpp_auth_key').disabled = false;
        $qs('#ocpp_auto_auth').disabled = false;
        $qs('#ocpp_auto_auth_label').disabled = false;
        $qs('#ocpp_auto_auth_idtag').disabled = false;
        $qs("#ocpp_backend_url").classList.remove("ui-state-disabled");
        $qs("#ocpp_cb_id").classList.remove("ui-state-disabled");
        $qs("#ocpp_auth_key").classList.remove("ui-state-disabled");
        $qs("#ocpp_auto_auth").classList.remove("ui-state-disabled");
        $qs("#ocpp_auto_auth_label").classList.remove("ui-state-disabled");
        $qs("#ocpp_auto_auth_idtag").classList.remove("ui-state-disabled");
        return;
    }
    configureOcpp();
    $qs('#ocpp_save_btn').textContent = "Edit Settings";
    $qs('#ocpp_backend_url').disabled = true;
    $qs('#ocpp_cb_id').disabled = true;
    $qs('#ocpp_auth_key').disabled = true;
    $qs('#ocpp_auto_auth').disabled = true;
    $qs('#ocpp_auto_auth_label').disabled = true;
    $qs('#ocpp_auto_auth_idtag').disabled = true;
    $qs("#ocpp_backend_url").classList.add("ui-state-disabled");
    $qs("#ocpp_cb_id").classList.add("ui-state-disabled");
    $qs("#ocpp_auth_key").classList.add("ui-state-disabled");
    $qs("#ocpp_auto_auth").classList.add("ui-state-disabled");
    $qs("#ocpp_auto_auth_label").classList.add("ui-state-disabled");
    $qs("#ocpp_auto_auth_idtag").classList.add("ui-state-disabled");
}

function configureOcpp() {
    const ocpp_backend_url = $qs('#ocpp_backend_url').value;
    const ocpp_cb_id = $qs('#ocpp_cb_id').value;
    const ocpp_auth_key = $qs('#ocpp_auth_key').value;
    const ocpp_auto_auth_idtag = $qs('#ocpp_auto_auth_idtag').value;

    // noinspection JSCheckFunctionSignatures
    const params = new URLSearchParams({
        ocpp_update: 1,
        ocpp_backend_url,
        ocpp_cb_id,
        ocpp_auth_key,
        ocpp_auto_auth_idtag
    });
    // noinspection JSIgnoredPromiseFromCall
    fetch(`${endpoint}settings?${params.toString()}`, {method: 'POST'});
}

function reboot() {
    window.location.href = "/reboot";
}

function update() {
    window.location.href = "/update";
}

function rawData() {
    window.location.href = "/settings";
}

function gotoDoc() {
    const version = $qs('#version').dataset.version;
    if (version?.startsWith('v')) {
        window.location.href = `https://github.com/dingo35/SmartEVSE-3.5/tree/${version}#documentation`;
        return;
    }
    window.location.href = 'https://github.com/dingo35/SmartEVSE-3.5/tree/master?tab=readme-ov-file#documentation';
}

function postPWM(value) {
    // noinspection JSIgnoredPromiseFromCall
    fetch(`${endpoint}settings?override_pwm=${value}`, {method: 'POST'});
}

function postRequiredEVCCID() {
    const required_evccid = $qs('#required_evccid').value;
    // noinspection JSIgnoredPromiseFromCall
    fetch(`${endpoint}settings?required_evccid=${required_evccid}`, {method: 'POST'});
}

/**
 * Shortcut to the `document.querySelector` method.
 */
const $qs = (selector) => {
    const result = document.querySelector(selector);
    // If no element found, return an object to have the same behavior as jQuery.
    if (!result) {
        return {
            style: {display: ''},
            textContent: '',
            value: '',
            classList: {toggle: () => {}}
        };
    }
    return result;
};
const $qsa = (selector) => document.querySelectorAll(selector);

// Get the current date and time
const now = new Date();
$qs('#stoptime_group').classList.toggle('hidden', true);
$qs('#daily_repeat_group').classList.toggle('hidden', true);

// Format the date and time as a string that can be used as the value of the input field
const pad = (num) => String(num).padStart(2, '0');
const dateString = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const timeString = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
const dateTimeString = `${dateString}T${timeString}`;

// Set the value of the input field to the current date and time
$qs('#starttime').value = dateTimeString;
$qs('#stoptime').value = dateTimeString;
$qs('#starttime').onchange = function () {
    $qs('#stoptime_group').classList.toggle('hidden', false);
}
$qs('#stoptime').onchange = function () {
    $qs('#daily_repeat_group').classList.toggle('hidden', false);
}
$qs('#daily_repeat').checked = false;

function triggerRefresh() {
    fetch(`${endpoint}settings`)
        .then(response => response.json())
        .then(data => loadData(data));
}

triggerRefresh();
// Update every 5 seconds.
setTimeout(() => triggerRefresh(), 5000);

initDisplay();