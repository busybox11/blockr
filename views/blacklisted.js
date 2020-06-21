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
	let un_blacklist_btn = document.getElementById('un_blacklist_btn');

	/* EVENTS */
	/* ------ */
	// When "Go back" button is clicked 
	go_back.addEventListener('click', function() {
		history.go(-1);
	});

	// When "Access anyway" button is clicked
	un_blacklist_btn.addEventListener('click', function() {
		// Create a new URL object with the decoded URL in the page parameters
		let siteURL = new URL(decodeURIComponent(getUrlVars()["page"]));
		// console.log(siteURL.host)

		chrome.runtime.sendMessage({type: "unBlacklist", content: siteURL.host}, function(response) {
			chrome.tabs.getCurrent(function (tab) {
				chrome.tabs.update(tab.id, {url: decodeURIComponent(getUrlVars()["page"])});
			});
		});
	});
});