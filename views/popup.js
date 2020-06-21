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
		page_css.href = "popup_dark.css";
	} else {
		page_css.href = "popup.css";
	}
}

getSettings(function() {
	updateStyle();
});

window.onload = function() {
	let powered_on_toggle = document.getElementById('powered_on_toggle');
	let reload_page_btn = document.getElementById('reload_page');
	let current_tab_host_span = document.getElementById('current_tab_host');
	let blocked_count_span = document.getElementById('blocked_count');
	let bc_container = document.getElementById('bc_container');
	let blockr_title = document.getElementById('blockr_title');

	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		let tab = tabs[0];
		let tabURL = new URL(tab["url"]);

		current_tab_host_span.innerHTML = tabURL.host;

		function logNewRequest(request, blockedState) {
			// [TODO]  Initialize blocked list related HTML elements
			// [NOTES] IMPORTANT ! This will initialize only if it's 
			//         equal to 1. A function is needed to detect if
			//         the elements are already present, and if they
			//         are - or if it they were just created -, add
			//         its content.

			// [TODO]  Log new requests in the HTML
			// [NOTES] Use custom HTML tags (such as "bc_id")
			//         to differenciate blocked elements in 
			//         the scripts used to manage them.

			if (bc_container.innerHTML == "") {
				bc_container.innerHTML = `<hr class="be_s"><div id="blocked_list"></div>`;
			}

			let blocked_list = document.getElementById('blocked_list');
			let request_url = new URL(request.url);

			blocked = blocked_list.innerHTML + `<div class="blocked_element"><span title="` + request_url.href + `" `;
			if (blockedState == true) {
				blocked = blocked + ` class="blocked_req"`;
			}
			blocked = blocked + `><b>` + request_url.host + `</b></span></div>`;

			blocked_list.innerHTML = blocked;
		}

		function clearContent() {
			blocked_count_span.innerHTML = "0 elements blocked";
		}

		function setBlockedCount(count) {
			if (count == 1) {
				// [TODO - IMPORTANT] Needs to catch lastError
				blocked_count_span.innerHTML = count.toString() + " element blocked";
			} else if (count == 0) { 
				blocked_count_span.innerHTML = count.toString() + " elements blocked";
				bc_container.innerHTML = ``;
			} else {
				blocked_count_span.innerHTML = count.toString() + " elements blocked";
			}
		}

		chrome.runtime.sendMessage({type: "getPageDisableState", content: tabURL.host}, function(response) {
			if (response.content == true) {
				powered_on_toggle.checked = false;
			} else {
				powered_on_toggle.checked = true;
			}
		});

		chrome.runtime.sendMessage({type: "getBlockedCount", content: tab.id}, function(response) {
			setBlockedCount(response.content);
		});

		powered_on_toggle.addEventListener('click', function() {
			if (powered_on_toggle.checked == false) {
				chrome.runtime.sendMessage({type: "tempDisable", content: tabURL.host, tabID: tab.id}, function(response) {
					console.log("Disabled")
				});
			} else {
				chrome.runtime.sendMessage({type: "undoTempDisable", content: tabURL.host, tabID: tab.id}, function(response) {
					console.log("Enabled")
				});
			}
			reload_page_btn.style.display = "block";
		});

		reload_page_btn.addEventListener('click', function() {
			chrome.tabs.reload(tab.id);
			reload_page_btn.style.display = "none";
		});

		// When the title text is clicked
		blockr_title.addEventListener('click', function() {
			chrome.runtime.openOptionsPage();
		});

		chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		    switch (request.type) {
				case "newBlockedRequest": {
					setBlockedCount(request.content);
					return true;
					break;
				}

				case "newRequest": {
					// INPUT PARAMETERS
					// content : details      -> The request itself
					// blocked : blockedState -> true or false, whether the request has been blocked or not
					logNewRequest(request.content, request.blocked);
					return true;
					break;
				}

				case "tabRefreshed": {
					clearContent();
					return true;
					break;
				}

				default: {
					return true;
					break;
				}
			}
		});
	});
};