Account = function(jsonAccount) {
	// only to be called at login and create account
	this.address = jsonAccount.address;
	this.password = jsonAccount.password;
	this.key = jsonAccount.key;
	this.currentKid = jsonAccount.currentKid ? jsonAccount.currentKid : null;
	this.oldAddress = null;
	this.oldPassword = null;
	this.oldCurrentKid = null;
	this.postTimeout = 0;

	if( jsonAccount.kids) {
		// since we're only called at login and create account, no need to merge existing kids
		var kidArray = [];
		$.each(jsonAccount.kids, function(i,k) {
			kidArray.push( new Kid(k));
		});
		this.kids = kidArray;
	} else {
		this.kids = [new Kid({"kidName":unnamedKidName})];
		this.currentKid = unnamedKidName;
	}
}

Configuration();
var accountURL = rootURL + 'account';


Account.prototype.changeAddress = function( newAddress) {
	if( newAddress && newAddress != this.address) {
		this.oldAddress = this.address;
		this.address = newAddress;
		this.queuePost();
	}
}

Account.prototype.changePassword = function( newPwd) {
	if( newPwd && newPwd != this.password) {
		this.oldPassword = this.password;
		this.password = newPwd;
		this.queuePost();
	}
}

Account.prototype.changeCurrentKid = function( newKid) {
	if( newKid && this.currentKid != newKid) {
		this.oldCurrentKid = this.currentKid;
		this.currentKid = newKid;
		this.queuePost();
	}
}

Account.prototype.getCurrentKid = function() {
	var result = null;
	
	var ck = this.currentKid;
	$.each(this.kids, function(i,k) {
		if( k.kidName == ck) {
			result = k;
			return false;
		}
		
		return true;
	});
	
	return result;
}

Account.prototype.replaceKids = function(jsonKidArray) {
	var acct = this;
	$.each( this.kids, function(i,k) {
		$.each( jsonKidArray, function (j,fk) {
			if( k.isMatch(fk)) {
				// fk is the matching fetched kid for k
				k.merge(fk);
				
				if( acct.currentKid == k.kidName)
					refreshPages();

				return false;	// stop inner loop, we're done
			}

			return true;	// keep going
		});

		return true;	// keep going for every kid
	});
}

Account.prototype.queuePost = function() {
	if( this.postTimeout != 0)
		// a timeout already exists.
		window.clearTimeout( this.postTimeout);
			
	// set the timeout
	var acct = this;
	this.postTimeout = window.setTimeout( function() {
			acct.postNow(null);
		}, queueInterval);
}

Account.prototype.postNow = function(callback) {
	if( this.postTimeout != 0)
		// a timeout already exists.
		window.clearTimeout( this.postTimeout);
	this.postTimeout = 0;

	var outData = { 'kids':[] };
	if( this.oldAddress) outData.address = this.address;
	if( this.oldPassword) outData.password = this.password;
	if( this.oldCurrentKid) outData.currentKid = this.currentKid;

	$.each(this.kids, function(i,k) {
		if( !k.key) {
			// only add unsaved kids as all saved kids are updated through a Kid type POST
			kid = { 'kidName':k.kidName };

			// all events are considered new events with new points
			if( k.newPoints)
				kid.events = {'points':k.newPoints};

			outData.kids.push( kid);

			// clear out the semaphores indicating kid changes
			k.newPoints = 0;
			k.oldName = null;
		}
	});

	var pURL = accountURL + '/' + this.key;
	var acct = this;
	$.post( pURL, JSON.stringify(outData),
		function(responseData,status,xhr) {
			if( "errorMsg" in responseData) {
				$('#err_servermainmsg').text(responseData.errorCategory);
				$('#err_servermsg').text(responseData.errorMsg);
				$.mobile.changePage( $('#errdialog'));
			} else {
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
				acct.changeAddress( responseData.address);
				acct.changePassword( responseData.password);
				// don't change current kid as the local device is always right for this call
				acct.replaceKids( responseData.kids)
			}

			if( callback)
				callback();
	});
}
