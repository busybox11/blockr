let page_css = document.getElementById('page_css');
let settings;

function getSettings(_callback) {
	chrome.runtime.sendMessage({type: "getSettings"}, function(response) {
		settings = response.content;
		_callback();
	});
}

function updateStyle() {
	if (settings["global"].dark) {
		page_css.href = "blocked_dark.css";
	} else {
		page_css.href = "blocked.css";
	}
}

getSettings(function() {
	updateStyle();
});

function getUrlVars() {
	var vars = {};
	var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
		vars[key] = value;
	});
	return vars;
}

document.getElementById("url_blocked").textContent = decodeURIComponent(getUrlVars()["page"]);

document.addEventListener('DOMContentLoaded', function() {
	/* DECLARATIONS */
	let go_back = document.getElementById('go_back_btn');
	let access_anyway = document.getElementById('access_anyway_btn');
	let unblock = document.getElementById('unblock_btn');

	/* EVENTS */
	/* ------ */
	// When "Go back" button is clicked 
	go_back.addEventListener('click', function() {
		history.go(-1);
	});

	// When "Access anyway" button is clicked
	access_anyway.addEventListener('click', function() {
		// Create a new URL object with the decoded URL in the page parameters
		let siteURL = new URL(decodeURIComponent(getUrlVars()["page"]));
		// console.log(siteURL.host)

		chrome.runtime.sendMessage({type: "tempUnblock", content: siteURL.host}, function(response) {
			chrome.tabs.getCurrent(function (tab) {
				chrome.tabs.update(tab.id, {url: decodeURIComponent(getUrlVars()["page"])});
			});
		});
	});

	// When "Unblock" button is clicked
	unblock.addEventListener('click', function() {
		// Create a new URL object with the decoded URL in the page parameters
		let siteURL = new URL(decodeURIComponent(getUrlVars()["page"]));
		// console.log(siteURL.host)

		chrome.runtime.sendMessage({type: "whitelist", content: siteURL.host}, function(response) {
			console.log(response);
			chrome.tabs.getCurrent(function (tab) {
				chrome.tabs.update(tab.id, {url: decodeURIComponent(getUrlVars()["page"])});
			});
		});
	});
});