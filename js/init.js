var oldLocation = window.location;
if(oldLocation && oldLocation.protocol !== "https:") {
	window.location.href = "https://" + oldLocation.host + oldLocation.pathname + oldLocation.search;
}
