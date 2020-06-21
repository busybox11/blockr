let page_css = document.getElementById('page_css');
let settings;

function getSettings(_callback) {
	chrome.runtime.sendMessage({type: "getSettings"}, function(response) {
		settings = response.content;
		_callback();
	});
}

function updateSettings() {
	chrome.runtime.sendMessage({type: "updateSettings", content: settings}, function(response) {});
}

function updateStyle() {
	if (settings["global"].dark) {
		page_css.href = "style_dark.css";
	} else {
		page_css.href = "style.css";
	}
}

getSettings(function() {
	updateStyle();
})

window.onload = function() {
	let blocked_count = document.getElementById('bc_bt');

	chrome.runtime.sendMessage({type: "getTotalBlocked"}, function(response) {
		blocked_count.innerHTML = response.content.toString();
	});

	/* ================== */
	/* SET SETTINGS IN UI */
	/* ================== */
	// DECLARATIONS
	// General declarations
	let global_toggle = document.getElementById('powered_on_toggle');
	let dark_theme_toggle = document.getElementById('dark_theme_toggle');
	let verbose_mode_toggle = document.getElementById('verbose_mode_toggle');

	// Blocked content declarations
	let block_js_toggle = document.getElementById('block_js_toggle');
	let block_iframes_toggle = document.getElementById('block_iframes_toggle');
	let block_webpages_toggle = document.getElementById('block_webpages_toggle');
	let block_content_toggle = document.getElementById('block_content_toggle');
	let block_websocket_toggle = document.getElementById('block_websocket_toggle');

	/*
	// Whitelist declaration
	let whitelist_textarea = document.getElementById('whitelist_textarea');
	let cancel_whitelist = document.getElementById('cancel_whitelist');
	let save_whitelist = document.getElementById('save_whitelist');

	// Blacklist declaration
	let blacklist_textarea = document.getElementById('blacklist_textarea');
	let cancel_blacklist = document.getElementById('cancel_blacklist');
	let save_blacklist = document.getElementById('save_blacklist');
	*/

	// RETRIEVE SETTINGS DATA
	// Save settings
	getSettings(function() {
		// SET ELEMENTS POSITIONS AND CONTENT
		// General
		global_toggle.checked = settings["global"].enabled;
		dark_theme_toggle.checked = settings["global"].dark;
		verbose_mode_toggle.checked = settings["global"].verbose;

		// Blocked content
		block_js_toggle.checked = settings["blocked"].js;
		block_iframes_toggle.checked = settings["blocked"].iframe;
		block_webpages_toggle.checked = settings["blocked"].webpages;
		block_content_toggle.checked = settings["blocked"].content;
		block_websocket_toggle.checked = settings["blocked"].websocket;

		/*
		// Whitelist
		whitelist_textarea.value = settings["whitelist"].toString().split("\n");

		// Blacklist
		blacklist_textarea.value = settings["blacklist"].toString().split("\n");
		*/
	});

	/* ==================== */
	/* ON CLICK DEFINITIONS */
	/* ==================== */
	global_toggle.addEventListener('click', function() {
		settings["global"].enabled = global_toggle.checked;
		updateSettings();
	});

	dark_theme_toggle.addEventListener('click', function() {
		settings["global"].dark = dark_theme_toggle.checked;
		updateStyle();
		updateSettings();
	});

	verbose_mode_toggle.addEventListener('click', function() {
		settings["global"].verbose = verbose_mode_toggle.checked;
		updateSettings();
	});


	block_js_toggle.addEventListener('click', function() {
		settings["blocked"].js = block_js_toggle.checked;
		updateSettings();
	});

	block_webpages_toggle.addEventListener('click', function() {
		settings["blocked"].webpages = block_webpages_toggle.checked;
		updateSettings();
	});

	block_iframes_toggle.addEventListener('click', function() {
		settings["blocked"].iframe = block_iframes_toggle.checked;
		updateSettings();
	});

	block_content_toggle.addEventListener('click', function() {
		settings["blocked"].content = block_content_toggle.checked;
		updateSettings();
	});

	block_websocket_toggle.addEventListener('click', function() {
		settings["blocked"].websocket = block_websocket_toggle.checked;
		updateSettings();
	});


	/*
	cancel_whitelist.addEventListener('click', function() {
		getSettings(function() {
			whitelist_textarea.value = settings["whitelist"].toString().split("\n");
		});
	});

	cancel_blacklist.addEventListener('click', function() {
		getSettings(function() {
			blacklist_textarea.value = settings["blacklist"].toString().split("\n");
		});
	});

	save_whitelist.addEventListener('click', function() {
		settings["whitelist"] = whitelist_textarea.value.split("\n");
		updateSettings();
	});

	save_blacklist.addEventListener('click', function() {
		settings["blacklist"] = blacklist_textarea.value.split("\n");
		updateSettings();
	});
	*/
};