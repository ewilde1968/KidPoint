Kid = function( jsonKid) {
	this.kidName = jsonKid.kidName;
	this.events = jsonKid.events ? jsonKid.events : null;
	this.blobKey = jsonKid.blobKey ? jsonKid.blobKey : null;
	this.key = jsonKid.key ? jsonKid.key : null;
	this.newPoints = 0;
	this.oldName = null;
	this.postTimeout = 0;

	return this;
}

Kid.prototype.changePoints = function( points) {
	if( points != 0) {
		this.newPoints += points;
		this.queuePost();
	}
}

Kid.prototype.changeName = function( newName) {
	if( newName && newName != this.kidName) {
		this.oldName = this.kidName;
		this.kidName = newName;
		this.queuePost();
	}
}

Kid.prototype.changeBlobKey = function( newImageBlob) {
	if( newImageBlob && this.blobKey != newImageBlob) {
		// no need to post as act of selecting image does a post
		this.blobKey = newImageBlob;
	}
}

Kid.prototype.totalPoints = function() {
	var result = 0;
	if( this.events) {
		$.each(this.events, function(i,e) {
			result += e.points;
		});
	}

	result += this.newPoints;

	return result;
}

Kid.prototype.queuePost = function() {
	if( this.postTimeout != 0)
		// a timeout already exists.
		window.clearTimeout( this.postTimeout);
			
	// set the timeout
	var k = this;
	this.postTimeout = window.setTimeout( function() {k.postNow(null);}, queueInterval);
}

Kid.prototype.postNow = function(callback) {
	if( this.postTimeout != 0)
		// a timeout already exists.
		window.clearTimeout( this.postTimeout);
	this.postTimeout = 0;

	// if kid has no key it hasn't yet been put into the online database.
	// New kids are only postable as an account post, which should be handled
	// by the postAccount's client code, not here
	if( this.key) {
		var outData = { 'key':this.key };

		if( this.oldName) outData.kidName = this.kidName;
		// all events are considered new events with new points
		if( this.newPoints) outData.events = {'points':this.newPoints};
		// do not store imageBlob, which is handled at portrait choice

		// clear out the semaphores indicating kid changes
		this.newPoints = 0;
		this.oldName = null;

		var pURL = kidURL + '/' + this.key;
		$.post( pURL, JSON.stringify(outData),
			function(responseData,status,xhr) {
				if( "errorMsg" in responseData) {
					$('#err_servermainmsg').text(responseData.errorCategory);
					$('#err_servermsg').text(responseData.errorMsg);
					$.mobile.changePage( $('#errdialog'));
				} else 
					/*
					 * Reload the data
					 * 
					 * A kids data could have changed since the POST was initiated.
					 * The data will have changed if the corresponding kid object has
					 * an oldName or a nonzero newPoints member.
					 * 
					 * Go through each legacy kid object. If that legacy kid object has
					 * changed, reflect those same changes in the fetched kid object. Then
					 * use the fetched (possibly updated) kid objects as the current kids.
					 * 
					 */
					getAccountData().replaceKids([responseData])

				if( callback)
					callback();
		});
	} else
		getAccountData().postNow(); // the kid is not yet saved, which can only be done through an account POST
}

Kid.prototype.isMatch = function( jsonKid) {
	if(	jsonKid.key == this.key					// this.key could be null, jsonKid.key cannot be null
		|| ( this.key == null &&
			( this.oldName == jsonKid.kidName)	// this.oldName could be null, jsonKid.kidName cannot
			|| (this.kidName == jsonKid.kidName)))	// neither can be null
		return true;
	
	return false;
}

Kid.prototype.merge = function(jsonKid) {
	// a kid's name may have changed, local copy of portrait and newPoints is always right
	if( !this.oldName)
		this.changeName( jsonKid.kidName);

	this.changeBlobKey( jsonKid.blobKey);	// if another user changed the blobKey
	this.events = jsonKid.events;	// server copy of events is always right
	this.key = jsonKid.key;			// server copy of key is always right
}
