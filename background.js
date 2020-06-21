if (typeof localStorage["settings"] === 'undefined') {
	let theme;
	if (window.matchMedia('(prefers-color-scheme: dark)').matches) { theme = true } else { theme = false }
	localStorage["settings"] = JSON.stringify({global: {enabled: true, dark: theme, verbose: false}, blocked:{js: true, iframe: true, webpages: true, content: true, websocket: true}, whitelist:[], blacklist:[]});
}

if (typeof localStorage["globalSwitch"] === 'undefined') {
	localStorage["globalSwitch"] = "true";
}

if (typeof localStorage["totalBlocked"] === 'undefined') {
	localStorage["totalBlocked"] = 0;
}

if (localStorage["globalSwitch"] == "false") {
	chrome.browserAction.setIcon({path: 'icon-disabled.png'});
} else {
	chrome.browserAction.setIcon({path: 'icon.png'});
}

function consoleLog(type, message, displayType = true) {
	if (JSON.parse(localStorage["settings"])["global"].verbose) {
		let style;
		if (displayType) {
			console.log(`[${type}] ${message}`);
		} else {
			console.log(message);
		}
	}
}

let adaway_list;

// Fetch adaway.org blocking list then parses and format it into an array
fetch('https://raw.githubusercontent.com/hectorm/hmirror/master/data/adaway.org/list.txt')
	.then(response => response.text())
	.then((data) => {
		consoleLog('general', 'Successfully fetched adaway list');

		// Parsing and formatting mechanism
		adaway_list = data.toString().split("\n").slice(0,-1);

		// Initialize badge background color
		chrome.browserAction.setBadgeBackgroundColor({color: "black"});

		// After list retrieved
		let tab, oldTab, tabURL, detailsURL;
		let blockCount = {};
		let tempUnblock = [];
		let tempDisable = [];
		sessionStorage['tempUnblock'] = JSON.stringify(tempUnblock);
		sessionStorage['tempDisable'] = JSON.stringify(tempDisable);
		if (typeof localStorage["permUnblock"] === 'undefined') {
			let permUnblock = [];
			localStorage["permUnblock"] = JSON.stringify(permUnblock); 
		}

		/* ========================== */
		/* WHEN REQUEST BLOCKED EVENT */
		/* ========================== */
		// TODO - Whitelist and blacklist not working because of the onBeforeRequest trigger only on adaway list
		// ----
		// DONE - Selective blocking based on content type and user settings
		chrome.webRequest.onBeforeRequest.addListener (
			function(details) {
				let output;
				chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
					try {
						oldTab = tab;
						tab = tabs[0];
						tabURL = new URL(tab["url"]);
					} catch(err) {
						tab = oldTab;
					}

					detailsURL = new URL(details.url);

					// Blocked requests count
					function newBlockedRequest() {
						consoleLog('misc', 'yes');
						logNewRequest(true);

						if (typeof blockCount[details.tabId] !== 'undefined') {
							blockCount[details.tabId]++;
						} else {
							blockCount[details.tabId] = 1;
						}

						localStorage["totalBlocked"]++;

						if (chrome.extension.getViews({ type: "popup" }).length != 0) {
							try {
								chrome.runtime.sendMessage({type: "newBlockedRequest", content: blockCount[details.tabId]}, function(response) {});
							} catch(err) {}
						}
					}

					// Send new request function
					function logNewRequest(blockedState) {
						try {
							if (chrome.extension.getViews({ type: "popup" }).length != 0) {
								chrome.runtime.sendMessage({type: "newRequest", content: details, blocked: blockedState}, function(response) {});
							}
						} catch(err) {}
						let message;
						if (blockedState) { message = "Blocked new request"; } else { message = "Allowed new request"; }
						consoleLog('blocking', message);
						consoleLog('blocking', details, false);
					}

					function setDisabled() {
						chrome.browserAction.setIcon({path: 'icon-disabled.png'});
						allowRequest();
					}

					function allowRequest() {
						logNewRequest(false);
						output = {cancel: false};
					}

					function setEnabled() {
						chrome.browserAction.setIcon({path: 'icon.png'});
					}

					function blockRequest() {
						newBlockedRequest();
						// BADGE
						chrome.browserAction.setBadgeText({
							text: blockCount[details.tabId].toString(),
							tabId: details.tabId
						});

						output = {cancel: true};
					}

					function redirectRequest(tabId, url) {
						chrome.tabs.update(tabId, {url: url});
						return { redirectUrl: url };
					}

					if (typeof tabURL.host === undefined) {
						allowRequest();
					} else {
						if (JSON.parse(sessionStorage['tempUnblock']).includes(detailsURL.host)) {
							allowRequest();
						} else {
							if (!JSON.parse(localStorage["settings"])["global"].enabled) {
								setDisabled();
							} else if (JSON.parse(sessionStorage['tempDisable']).concat(JSON.parse(localStorage['settings'])["whitelist"]).includes(tabURL.host)) {
								setDisabled();
								allowRequest();
							} else if (adaway_list.includes(detailsURL.host) || JSON.parse(localStorage['settings'])["blacklist"].includes(detailsURL.host)) { // If the request is not temporarly allowed or blacklisted
								setEnabled();

								if (JSON.parse(sessionStorage['tempUnblock']).includes(tabURL.host)) {
									allowRequest();
								}

								if (details.type == "script") {
									if (JSON.parse(localStorage["settings"])["blocked"].js) { // If scripts should be blocked
										blockRequest();
									} else {
										allowRequest();
									}
								}

								else if (details.type == "main_frame") {
									if (JSON.parse(localStorage["settings"])["blocked"].webpages) { // If webpages should be blocked
										chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
											if (JSON.parse(localStorage['settings'])["blacklist"].includes(detailsURL.host)) {
												redirectRequest(tabs[0].id, chrome.runtime.getURL('views/blacklisted.html') + '?page=' + encodeURIComponent(details.url));
												consoleLog('blocking', "Blocked webpage (custom blacklist)");
												consoleLog('blocking', details, false);
											} else if (adaway_list.includes(detailsURL.host)) {
												redirectRequest(tabs[0].id, chrome.runtime.getURL('views/blocked.html') + '?page=' + encodeURIComponent(details.url));
												consoleLog('blocking', "Blocked webpage (adaway list)");
												consoleLog('blocking', details, false);
											}
										});
									} else {
										allowRequest();
									}
								}

								else if (details.type == "sub_frame") {
									if (JSON.parse(localStorage["settings"])["blocked"].iframe) { // If iframes should be blocked
										blockRequest();
									} else {
										allowRequest();
									}
								}

								else if (details.type == "stylesheet" || details.type == "image" || details.type == "font" || details.type == "media") {
									if (JSON.parse(localStorage["settings"])["blocked"].content) { // If page contents should be blocked
										blockRequest();
									} else {
										allowRequest();
									}
								}

								else if (details.type == "websocket") {
									if (JSON.parse(localStorage["settings"])["blocked"].websocket) { // If websockets should be blocked
										blockRequest();
									} else {
										allowRequest();
									}
								}

								else {
									blockRequest(); // Block all other requests
								}

							} else {
								allowRequest();
							}
						}
					}
				});
				return output;
			},
			{urls: ["<all_urls>"]},
			["blocking"]
		);

		/* ===================== */
		/* WHEN TAB CLOSED EVENT */
		/* ===================== */
		chrome.tabs.onRemoved.addListener(function(tabId, info) {
			delete blockCount[tabId]; // Free up some memory by removing the deleted tab from the badges variable
		});

		/* ====================== */
		/* WHEN TAB UPDATED EVENT */
		/* ====================== */
		chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
			if (!changeInfo.url != undefined) {
				if (changeInfo.status == 'loading') {
					delete blockCount[tabId]; // Delete blocked elements count when page loaded. This prevents this count from not being reset
					chrome.runtime.sendMessage({type: "tabRefreshed"}, function(response) {});
				}
			}
		});

		/* ================== */
		/* WHEN MESSAGE EVENT */
		/* ================== */
		chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
			switch (request.type) {
				case "getBlockedCount": {
					let bc;
					if (blockCount[request.content] == undefined) {
						bc = 0;
					} else {
						bc = blockCount[request.content];
					}
					sendResponse({type: "response", content: bc});

					return true;
					break;
				}

				case "getPageDisableState": {
					let state;
					if (JSON.parse(sessionStorage['tempDisable']).includes(request.content)) {
						state = true;
					} else {
						state = false;
					}
					sendResponse({type: "response", content: state});

					return true;
					break;
				}

				case "tempDisable": {
					if (JSON.parse(sessionStorage['tempDisable']).includes(request.content)) { sendResponse({type: "response", content: "Already blocked"}); } else {
						tempDisable = JSON.parse(sessionStorage['tempDisable']);
						tempDisable.push(request.content);
						sessionStorage['tempDisable'] = JSON.stringify(tempDisable);

						chrome.browserAction.setIcon({path: 'icon-disabled.png', tabId: request.tabID});

						sendResponse({type: "response", content: "Success"});
						consoleLog('tempDisable', `Added element to temporarly allowed domains : ${request.content}`);
					}

					return true;
					break;
				}

				case "undoTempDisable": {
					if (!JSON.parse(sessionStorage['tempDisable']).includes(request.content)) { sendResponse({type: "response", content: "Already unblocked"}); } else {
						tempDisable = JSON.parse(sessionStorage['tempDisable']);
						tempDisable.splice(tempDisable.indexOf(request.content), 1);
						sessionStorage['tempDisable'] = JSON.stringify(tempDisable);

						chrome.browserAction.setIcon({path: 'icon.png', tabId: request.tabID});

						sendResponse({type: "response", content: "Success"});
						consoleLog('tempDisable', `Removed element from temporarly allowed domains : ${request.content}`);
					}

					return true;
					break;
				}

				case "tempUnblock": {
					tempUnblock = JSON.parse(sessionStorage['tempUnblock']);
					tempUnblock.push(request.content);
					sessionStorage['tempUnblock'] = JSON.stringify(tempUnblock);

					sendResponse({type: "response", content: "Success"});
					consoleLog('tempUnblock', `Added element to temporarly allowed pages : ${request.content}`);

					return true;
					break;
				}

				case "undoTempUnblock": {
					tempUnblock = JSON.parse(sessionStorage['tempUnblock']);
					tempUnblock.splice(tempUnblock.indexOf(request.content), 1);
					sessionStorage['tempUnblock'] = JSON.stringify(tempUnblock);

					sendResponse({type: "response", content: "Success"});
					consoleLog('tempUnblock', `Removed element from temporarly allowed pages : ${request.content}`);

					return true;
					break;
				}

				case "blacklist": {
					blacklist = JSON.parse(localStorage["settings"]).blacklist;
					blacklist.push(request.content);
					localStorage["settings"].blacklist = JSON.stringify(blacklist);

					sendResponse({type: "response", content: "Success"});
					consoleLog('blacklist', `Added element to blacklisted domains : ${request.content}`);

					return true;
					break;
				}

				case "unBlacklist": {
					blacklist = JSON.parse(localStorage["settings"]).blacklist;
					blacklist.splice(blacklist.indexOf(request.content), 1);
					localStorage["settings"].blacklist = JSON.stringify(blacklist);

					sendResponse({type: "response", content: "Success"});
					consoleLog('blacklist', `Removed element from blacklisted domains : ${request.content}`);

					return true;
					break;
				}

				case "whitelist": {
					whitelist = JSON.parse(localStorage["settings"]).whitelist;
					whitelist.push(request.content);					localStorage["settings"].whitelist = JSON.stringify(whitelist);

					sendResponse({type: "response", content: "Success"});
					consoleLog('whitelist', `Added element to whitelisted domains : ${request.content}`);

					return true;
					break;
				}

				case "unWhitelist": {
					whitelist = JSON.parse(localStorage["settings"]).whitelist;
					whitelist.splice(whitelist.indexOf(request.content), 1);
					localStorage["settings"].whitelist = JSON.stringify(whitelist);

					sendResponse({type: "response", content: "Success"});
					consoleLog('whitelist', `Removed element from whitelisted domains : ${request.content}`);

					return true;
					break;
				}
				
				case "updateSettings": {
					localStorage["settings"] = JSON.stringify(request.content);
					sendResponse({type: "response", content: "Success"});
					consoleLog('settings', 'Updated settings');
					consoleLog('settings', request.content, false);

					return true;
					break;
				}

				case "getBlockCount": {
					// request.content (the content of the request) should be an int containing the desired tab ID blocked elements count
					sendResponse({type: "response", content: blockCount[request.content]});

					return true;
					break;
				}

				case "getTotalBlocked": {
					sendResponse({type: "response", content: localStorage["totalBlocked"]});

					return true;
					break;
				}

				case "getSettings": {
					sendResponse({type: "response", content: JSON.parse(localStorage["settings"])});

					return true;
					break;
				}
			}
		});
	}
)