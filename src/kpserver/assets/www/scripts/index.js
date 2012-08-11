$(document).bind('mobileinit', function() {
	var accountData = null;
	var chosenKidData = null;
	var ajaxQueue = $({});
	var localURL = 'http://localhost:8082/';
	var remoteURL = 'http://kidspointsbeta.appspot.com/';
	var rootURL = localURL;
	var accountURL = rootURL + 'account';
	var imagestoreURL = rootURL + 'imagestore';
	
	var setAccountData = function( acctData) {
		accountData = acctData;
	}
	
	var getAccountData = function() {
		return accountData;
	}

	var setKidData = function( kid) {
		chosenKidData = kid;
		acct = getAccountData();
		
		// fetch the portrait data for background and icons
		if( kid.hasImage)
			setImageWidgets( kid);
	}
	
	var getKidData = function() {
		return chosenKidData;
	}

	var setDefaultKidData = function() {
		// set default kid data
		acctData = getAccountData();
		
		if( acctData.kids) {
			if( acctData.kids.length > 1)
				setKidData( acctData.kids[1]);
			else
				setKidData( acctData.kids[0]);
		}
	}

	var postAccount = function(next) {
		// may have already had an item in the delay interval when last queued
		// only implement when this is the very last
		// total delay no greater than 2x
		if( ajaxQueue.queue().length == 1) {
			// POST the account data
			var acctData = getAccountData();
			var outData = { 'address':acctData.address,
							'password':acctData.password,
							'key':acctData.key,
							'kids':[]
						  }
			
			$.each(acctData.kids, function(i,k) {
				kid = { 'kidName':k.kidName,
						'imageBlobKey':k.imageBlobKey,
						'key':k.key
					};
				if( 'newPoints' in k && k.newPoints > 0)
					kid.events = [{'points':k.newPoints}];

				outData.kids.push( kid);
				k.newPoints = 0;
			});
			
			$.post( accountURL, JSON.stringify(outData),
				function(responseData,status,xhr) {
					/*
					 * All responses in JSON. Possible response objects include:
					 * 
					 * error object:
					 * 		errorMsg: string to show
					 * 
					 * account object:
					 * 		address: email address for account
					 * 		password: password for account
					 * 		kids: array of Kid objects
					 */
					if( "errorMsg" in responseData) {
						$('#err_servermainmsg').text(responseData.errorCategory);
						$('#err_servermsg').text(responseData.errorMsg);
						$.mobile.changePage( $('#errdialog'));
					} else {
						// no-op
					}
			});
		}

		// clear the item off the queue
		if( next)
			next();
	}
	
	/*
	 * Queue a POST of the account to the server.
	 * 
	 * Try to accumulate posts to the point where there is no more activity.
	 * A good default to start with is 5 seconds of inactivity pushes a post.
	 * 
	 * TODO: gather data analytics on beta tests to determine time interval
	 * 		 between activity and a post.
	 */
	var queuePost = function() {
		var queueInterval = 5000;	// wait 5 seconds between last activity and post

		if( ajaxQueue.queue().length < 3) {
			// queue up the post if there are no more than two in the queue already
			// this gives a maximum wait of 2x
			ajaxQueue.delay( queueInterval);
			ajaxQueue.queue( postAccount);
		}
	}

	/*
	 * When clicking login button verify and load the account information
	 * 
	 * Input available:	account email address
	 * 
	 * Output set:	array of kids
	 * 				each kid has an array of entire pointevent history
	 * 
	 */
	$('#login_loginB').live('vclick', function( event, ui) {
		var acctAddr = $('#login_addr').val();
		var pwd= $('#login_pwd').val();
		
		dataOut = {
				"address": acctAddr,
				"password": pwd
		}
		$.getJSON( accountURL, dataOut,
			function( responseData, status, xfr) {
				/*
				 * All responses in JSON. Possible response objects include:
				 * 
				 * error object:
				 * 		errorMsg: string to show
				 * 
				 * account object:
				 * 		address: email address for account
				 * 		password: password for account
				 * 		kids: array of Kid objects
				 */
				if( "errorMsg" in responseData) {
					$('#login_errtext').text(responseData.errorMsg);
					$('#login_errtext').removeClass('login_hidden');
				} else {
					setAccountData( responseData);
					$.mobile.changePage( $('#homepage'));
				}
			});
	});
	
	/*
	 * When clicking create account button verify the account information
	 * and then send the post event to the service.
	 * 
	 * Input available:	account email address
	 * 
	 * Output set:	array of kids
	 * 				each kid has an array of entire pointevent history
	 * 
	 * Errors: Can raise a validation error or an "account already exists" error
	 */
	$('#create_loginB').live('vclick', function( event, ui) {
		var acctAddr = $('#create_addr').val();
		var pwd = $('#create_password').val();
		var confirm = $('#create_confirm').val();
		var tou = $('#create_checkbox').is(':checked');

		// TODO: better data validation
		
		if( tou && acctAddr != null && pwd != null && pwd == confirm) {
			// valid data, post account
			dataOut = JSON.stringify( {
					"address": acctAddr,
					"password": pwd,
					"create": true
			});
			$.post( accountURL, dataOut,
				function(responseData,status,xhr) {
					/*
					 * All responses in JSON. Possible response objects include:
					 * 
					 * error object:
					 * 		errorMsg: string to show
					 * 
					 * account object:
					 * 		address: email address for account
					 * 		password: password for account
					 * 		kids: array of Kid objects
					 */
					if( "errorMsg" in responseData) {
						$('#err_servermainmsg').text('the account you tried to create is invalid. please try again.');
						$('#err_servermsg').text(responseData.errorMsg);
						$.mobile.changePage( $('#errdialog'));
					} else {
						setAccountData( responseData);
						$.mobile.changePage( $('#homepage'));
					}
				});
		}
	});
	
	
	/*
	 * 
	 * Clear login information when loading the login or create account pages
	 */
	$('#loginpage').live('pagebeforeshow', function() {
		$('#login_addr').val( '');
		$('#login_pwd').val( '');
		$('#login_errtext').addClass('login_hidden');
	});
	$('#createaccountpage').live('pagebeforeshow', function() {
		$('#create_addr').val( '');
		$('#create_password').val( '');
		$('#create_confirm').val( '');
	});
	
	
	/*
	 *
	 * HOMEPAGE page change handling
	 * 
	 */
	$('#homepage').live('pagebeforeshow', function() {
		createKidList();
		if( getKidData() == null)
			setDefaultKidData();
			
		setHomePageWidgets();
	});
	
	var createKidList = function() {
		var acctData = getAccountData();
		
		if( acctData) {
			// populate the dropdown list
			if( acctData.kids == null || acctData.kids.length < 1) {
				acctData.kids = [];
				// kid didn't exist in data, create kid
				acctData.kids.push( { 'kidName':"new", 'newPoints':0});
			}
				
			var items = [];
			$.each(acctData.kids, function(i,k) {
				items.push( '<option value="' + k.kidName + '">' + k.kidName + '</option>');
			});
			itemData = items.join(' ');
			$('#home_childDDL').html( itemData);
		}
	}
	
	/*
	 * Set the widget values of the home page to show the correct
	 * Kid information.
	 *
	 * Get the kid setting of the homepage select element and fetch the
	 * corresponding kid data from it. Then set the total points and
	 * background image appropriately.
	 *  
	 * Input: account object
	 */
	var setHomePageWidgets = function( inData) {
		kid = getKidData();
		
		$('#home_childDDL').val( kid.kidName);
		$('#home_childDDL').selectmenu('refresh');
		$('#home_totalL').html( getKidTotal(kid));
	}
	
	var getImageURL = function( kid, thumbnail) {
		var url = imagestoreURL + '?account="' + acct.address + '"&kid=';
			
		if( kid.key)
			url += kid.key;
		else
			url += '"' + kid.kidName + '"';

		if( thumbnail)
			url += '&thumb="true"';
		else
			url += '&thumb="false"';
			
		return url;
	}
	
	var setImageWidgets = function( kid) {
		$('#home_portraitImg').prop('src', getImageURL(kid, false));
		$('#details_portraitImg').prop('src', getImageURL(kid, true));
	}
	
	/*
	 * Get the total points
	 * 
	 * Input: kid object
	 */
	var getKidTotal = function( kid) {
		var result = 0;
		if( kid != null && kid.events != null) {
			kid.events.forEach( function( elem, index, arr) {
				valChange = elem.points;
				result += valChange;
			});
		}

		if( kid.newPoints != null)
			result += kid.newPoints;
		else
			kid.newPoints = 0;
					
		return result;
	}

	/*
	 * 
	 * HOMEPAGE widget handling
	 * 
	 */
	$('#home_minusB').live('vclick', function( event, ui) {bonusBOnVclick( -1);});
	$('#home_plusB').live('vclick', function( event, ui) {bonusBOnVclick( 1);});

	var bonusBOnVclick = function( valChange) {
		var kid = getKidData();
		
		kid.newPoints += valChange;
		
		$('#home_totalL').html( getKidTotal(kid));
		
		queuePost();
	}
	
	$('#home_childDDL').live('change', function( event, ui) {
		var acctData = getAccountData();
		
		if( acctData) {
			kidName = $('#home_childDDL').val();

			var kid = null;
			if( acctData && acctData.kids)
				acctData.kids.forEach( function(e,i,a) {if( e.kidName == kidName) kid = e});
			setKidData( kid);
			
			setHomePageWidgets()
		}
	});

	
	/*
	 * DETAILSPAGE initialization and widget events
	 * 
	 */
	$('#detailspage').live('pagebeforeshow', function() {
		setDetailsWidgets();
	})
	
	$('#details_name').live('change', function( event, ui) {
		var kid = getKidData();
		var acctData = getAccountData();

		// either load another kid already extant or change this kid's kidName
		var newName = $('#details_name').val();		
		if( newName != kid.kidName) {
			var newKid = null;
			$.each( acctData.kids, function(i, item) {
				if( item.kidName == newName)
					newKid = item;
			});
			if( newKid == null) {
				if( kid.kidName == "new") {
					// Overwrote the "new" kid
					// create a new Kid object and append it to the array
					// set the current kid to this new object and refresh the
					// 0th element "new" kid object
					newKid = {  'kidName':newName,
								'newPoints': kid.newPoints };
					kid.newPoints = 0;	// reset the "new" kid to be a fresh kid
					acctData.kids.push( newKid);
					setKidData( newKid);
				} else
					kid.kidName = newName;

				queuePost();
			} else {
				setKidData( newKid);
				setDetailsWidgets();
			}
		}
	});
	
	var GetPicture = function() {
		if( navigator && navigator.camera) {
			navigator.camera.getPicture( function(imageURI) {
				if( kid && kid.imageBlobKey != imageURI) {
					$('#details_portraitImg').prop('src', imageURI)
			    	kid.imageBlobKey = imageURI;
				    
				    // TODO - store image someplace where it can be shared on devices
				    
				    queuePost();
				}				
    
				/* TODO - Uncomment this when supporting iOS
			    if( navigator.camera.cleanup)
			    	navigator.camera.cleanup( function() {}, function() {});*/
			},  function(message) {
 		   		alert('Failed because: ' + message);
			}, { sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
				 destinationType: Camera.DestinationType.FILE_URI
			});	// close getPicture
			
			// now upload the data - TODO
		} else {
			// in webapp so browse for file to upload, first get URL
			if( getKidData().key)
				$('#browse_kid').val( getKidData().key);
			else
				$('#browse_kid').val( getKidData().kidName);
				
			$('#browse_account').val( getAccountData().key);
			
			$.mobile.changePage( $('#browsedialog'));
		}
	}
	
	$('#details_portraitImg').live('vclick', function( event, ui) {
		GetPicture();
	});
	
	var setDetailsWidgets = function() {
		var kid = getKidData();
		
		$('#details_name').val( kid.kidName);
		$('#details_totalL').html( getKidTotal(kid));
		
		// kid portrait image is set in setImageWidgets
	}
	
	/*
	 * BROWSEDIALOG initialization and widget events
	 * 
	 */
	$('#browse_submit').live( 'click', function(e) {
		var options = {
			clearForm: true,
			success: function(response, status, xhr, fe) {
				var kid = getKidData();
				if( response.kidName == kid.kidName)
					setKidData( response)

				// clean up
				if( navigator && navigator.camera) {
				
				} else {
					$.mobile.changePage( $('#detailspage'));
				}
			}
		};
		$('#browse_upload').ajaxSubmit(options);
		e.preventDefault();
	});
});
