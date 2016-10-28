onmessage = function(e) {

	// Sanity check on data received
	if(!(e && e.data && e.data.id && e.data.request)) {
		return;
	}

	// Send request to remote handler
	var id = e.data.id;
	try {
		var request = new XMLHttpRequest();
		request.onload = function(e) {
			postMessage({ id: id, error: null, data: JSON.parse(this.responseText) });
		};
		request.onerror = function(e) {
			postMessage({ id: id, error: this.statusText, data: null });
		};
		request.open("POST", "/php/handle.php", true);
		request.setRequestHeader("Content-Type", "application/json");
		request.send(JSON.stringify(e.data.request));
	} catch(ex) {
		postMessage({ id: id, error: ex, data: null });
	}
};
