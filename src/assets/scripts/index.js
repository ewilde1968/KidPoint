$(document).bind('mobileinit', function() {
	var localURL = 'http://localhost:8082/';
	var remoteURL = 'http://kidspointsbeta.appspot.com/';
	var rootURL = remoteURL;
	var accountURL = rootURL + 'account';
	var imagestoreURL = rootURL + 'imagestore';
	var blobstoreURL = rootURL + 'blobstore';
	
	var isPhone = function() {
		return navigator && navigator.camera;
	}
	
	// setup for Phone Gap access cross domain
	if( $.support)
		$.support.cors = true;
	if( $.mobile) {
		$.mobile.allowCrossDomainPages = true;
		$.mobile.pushState = false;
	}

	var accountData = null;
	var setAccountData = function( acctData) {
		accountData = acctData;
	}
	
	var getAccountData = function() {
		return accountData;
	}

	var currentKid = null;
	var setKidData = function( kid) {
		currentKid = kid;
		console.log('setKidData, kid==' + kid.kidName);

		// set all page widgets to reflect new selected kid		
		setHomePageWidgets();
		setDetailsWidgets();
	}
	
	var getKidData = function() {
		return currentKid;
	}
	
	var setKidName = function(kid,newName) {
		kid.oldName = kid.kidName;	// oldName's existence is a semaphore for if a change has occurred
		kid.kidName = newName;
	}
	
	var addKidPoints = function(kid,val) {
		if( !kid.newPoints)
			kid.newPoints = 0;
			
		kid.newPoints += val;	// a nonzero newPoint's is a semaphore for if a change has occurred
	}
	
	var unnamedKidName = "new";
	var createKidList = function() {
		var acctData = getAccountData();
		
		if( acctData) {
			// populate the dropdown list
			if( acctData.kids == null)
				acctData.kids = [];

			var items = [];
			var foundUnnamed = false;
			$.each(acctData.kids, function(i,k) {
				if( k.kidName == unnamedKidName) {
					foundUnnamed = true;
					items.unshift( '<option value="' + k.kidName + '">' + k.kidName + '</option>');
				} else
					items.push( '<option value="' + k.kidName + '">' + k.kidName + '</option>');
			});
			
			// add an "unnamed" new kid if one doesn't already exist
			if( !foundUnnamed) {
				items.unshift( '<option value="' + unnamedKidName + '">' + unnamedKidName + '</option>');
				acctData.kids.unshift( {
										"kidName":unnamedKidName,
										"newPoints":0
									});
			}

			// join and add the list to the select widget
			itemData = items.join(' ');
			$('#home_childDDL').html( itemData);
		}
	}

	var setDefaultKidData = function() {
		// set default kid data
		acctData = getAccountData();
		
		if( acctData.kids) {
			var matchKidName = unnamedKidName;
			if( acctData.currentKid)
				matchKidName = acctData.currentKid;

			$.each(acctData.kids, function(i,k) {
				if( matchKidName == k.kidName)
					setKidData( k);
			});
		}
	}
	
	var getImageURL = function( kid, thumbnail) {
		var url = imagestoreURL + '?account="' + getAccountData().key + '"&kid=';
			
		if( kid.key)
			url += kid.key;
		else
			url += '"' + kid.kidName + '"';

		if( thumbnail)
			url += '&height=120&width=80';
		else
			url += '&height=' + $(window).height() + '&width=' + $(window).width();
			
		return url;
	}
	
	/*
	 * Get the total points
	 * 
	 * Input: kid object
	 */
	var getKidTotal = function( kid) {
		var result = 0;
		if( kid != null && kid.events != null) {
			$.each(kid.events, function(i,e) {
				result += e.points;
			});
		}

		if( kid.newPoints > 0)
			result += kid.newPoints;
					
		return result;
	}
	
	var postAccount = function( callback) {
		// POST the account data now
		var acctData = getAccountData();
		var outData = { 'address':acctData.address,
						'password':acctData.password,
						'key':acctData.key,
						'currentKid':currentKid.kidName,
						'kids':[]
					  }
			
		$.each(acctData.kids, function(i,k) {
			kid = { 'kidName':k.kidName,
					'imageBlobKey':k.imageBlobKey,
					'key':k.key
				};
				
			// all events are considered new events with new points
			if( k.newPoints > 0)
				kid.events = [{'points':k.newPoints}];

			outData.kids.push( kid);
			
			// clear out the semaphores indicating kid changes
			k.newPoints = 0;
			delete k.oldName;
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

					// add any changed kid data
					currentAcct = getAccountData();
					var ck = getKidData();
					$.each( currentAcct.kids, function(i,k) {
						$.each( responseData.kids, function (j,fk) {
							if(	k.key == fk.key					// k.key could be null, fk.key cannot be null
								|| (k.oldName == fk.kidName)	// k.oldName could be null, fk.kidName cannot
								|| (k.kidName == fk.kidName))	// neither can be null
							{
								// fk is the matching fetched kid for k
								if( k.oldName || k.newPoints > 0) {
									// the legacy kid object has changed, edit the newly fetched kid
									if( k.oldName) setKidName( fk, k.kidName);
									fk.newPoints = k.newPoints;

									queuePost();
								}

								// make sure to set the currently selected kid to the (possibly updated) fetched kid
								if( ck == k) setKidData(fk);
								
								return false;	// stop inner loop, we're done
							}
							
							return true;	// keep going
						});
						
						return true;	// keep going for every kid
					});

					// reset account data
					setAccountData( responseData);
				}
				
				if( callback)
					callback();
		});
	}
	
	var postTimeout = 0;
	var postAccountNow = function( callback) {
		if( postTimeout != 0)
			window.clearTimeout( postTimeout);
		postTimeout = 0;

		postAccount( callback);
	}
	
	var postAccountTriggered = function() {
		postTimeout = 0;
		postAccount( null);
	}
	
	/*
	 * Queue a POST of the account to the server.
	 * 
	 * Try to accumulate posts to the point where there is no more activity.
	 * A good default to start with is 5 seconds of inactivity pushes a post.
	 * 
	 */
	var queuePost = function() {
		var queueInterval = 5000;	// wait 5 seconds between last activity and post
		console.log( 'queuePost');

		if( postTimeout != 0)
			// a timeout already exists.
			window.clearTimeout( postTimeout);
			
		// set the timeout
		postTimeout = window.setTimeout(postAccountTriggered, queueInterval);
	}


	/*
	 * 
	 * Clear login information when loading the login or create account pages
	 */
	$('#loginpage').live('pagebeforeshow', function() {
		$('#login_addr').val( '');
		$('#login_pwd').val( '');
		$('#login_errtext').addClass('login_hidden');
	});


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
	
	
	$('#createaccountpage').live('pagebeforeshow', function() {
		$('#create_addr').val( '');
		$('#create_password').val( '');
		$('#create_confirm').val( '');
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
	 * HOMEPAGE page change handling
	 * 
	 */
	$('#homepage').live('pagebeforeshow', function() {
		createKidList();
		if( getKidData() == null)
			setDefaultKidData();
			
		setHomePageWidgets();
	});
	
	/*
	 * Set the widget values of the home page to show the correct
	 * Kid information.
	 *
	 * Get the kid setting of the homepage select element and fetch the
	 * corresponding kid data from it. Then set the total points and
	 * background image appropriately.
	 */
	var setHomePageWidgets = function() {
		kid = getKidData();
		
		console.log('setHomePageWidgets, kid==' + kid.kidName)
		
		if( kid.hasImage)
			$('#home_portraitImg').prop('src', getImageURL(kid, false));
		else
			$('#home_portraitImg').prop('src', 'stylesheets/images/johnny_automatic_girl_and_boy.gif');
		

		$('#home_childDDL').val( kid.kidName);
		$('#home_childDDL').selectmenu('refresh');
		$('#home_totalL').html( getKidTotal(kid));
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
		addKidPoints( kid, valChange);
		
		$('#home_totalL').html( getKidTotal(kid));
		
		queuePost();
	}
	
	$('#home_childDDL').live('change', function( event, ui) {
		var acctData = getAccountData();
		if( acctData && acctData.kids) {
			kidName = $('#home_childDDL').val();

			$.each(acctData.kids, function(i,k) {
				if( k.kidName == kidName) {
					setKidData( k);
					return false;	// stop, we're done
				}
				
				return true;	// keep going
			});
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
		console.log( 'details_name.change');

		var newName = $('#details_name').val();
		console.log( 'new name = ' + newName);
		
		// either load another kid already extant or change this kid's kidName
		if( newName != kid.kidName) {
			$.each( acctData.kids, function(i, item) {
				if( item.kidName == newName) {
					console.log( 'matched kid: ' + item.kidName);
					setKidData( item);
					return;
				}
			});

			if( kid.kidName == unnamedKidName) {
				/*
				 * Changed name from "new" kid to something else
				 * 
				 * Create a new kid object and append it to the account's
				 * array of kids. The current kid becomes this new kid
				 * object.
				 * 
				 * The "new" kid object needs to be reset, too.
				 * 
				 */
				console.log( 'matched new name');
				newKid = {
							'kidName': newName,
							'events': kid.events,
							'newPoints': kid.newPoints,
							'key': kid.key
						};

				acctData.kids.push( newKid);
				setKidData( newKid);

				kid.newPoints = 0;	// reset the "new" kid to be a fresh kid
				delete kid.key;
			} else {
				setKidName( kid, newName);
				setKidData( kid);	// refresh the kid data and page widgets
			}

			console.log( 'queueing post');
			queuePost();
		}
	});
	
	var GetPicture = function() {
		/* Store image data in the blobstore as many images come from a smartphone
		 * camera, whose default images are often well over a megabyte and so break
		 * the GAE blob limit. The GAE image service can still be used to resize
		 * the image upon load.
		 * 
		 * Steps to use the Blobstore for posting:
		 *   Get the URL for posting the blob when the avatar is tapped
		 *   Get selection from the phone's gallery or harddrive on a webapp
		 *   Upload the image to the blobstore, saving the key under the Kid object
		 * 
		 */
		$.getJSON( blobstoreURL, function(data) {
			// data is a JSON object with the upload URL as uploadURL
			if( isPhone()) {
				navigator.camera.getPicture( function(imageURI) {
					var kid = getKidData();
					if( kid && imageURI) {
						var options = new FileUploadOptions();
						options.params = {
							'account': getAccountData().address,
							'kid': kid.key ? kid.key : kid.kidName
						};

						var ft = new FileTransfer();
						ft.upload( imageURI, data.uploadURL,
							function(r) {},
							function(error) {
								alert('unable to upload: ' + error.source + ' error code: ' + error.code);
							},
							options);
					}

				    if( navigator.camera.cleanup)
				    	navigator.camera.cleanup( function() {}, function() {});
				},  function(message) {
 		   			alert('Failed because: ' + message);
				}, { sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
					 destinationType: Camera.DestinationType.FILE_URI
				});	// close getPicture
			} else {
				// in webapp so browse for file to upload, first set URL
				$('#browse_kid').val( getKidData().key);
				$('#browse_account').val( getAccountData().key);
				$('#browse_upload').prop( 'action', data.uploadURL)
				$.mobile.changePage( $('#browsedialog'));
			}
		});
	}
	
	$('#details_portraitImg').live('vclick', function( event, ui) {
		// make sure the kid is saved
		if( !getKidData().key)
			postAccountNow( function() {GetPicture();});
		else
			GetPicture();
	});
	
	var setDetailsWidgets = function() {
		var kid = getKidData();
		
		$('#details_name').val( kid.kidName);
		$('#details_totalL').html( getKidTotal(kid));
		
		if( kid.hasImage)
			$('#details_portraitImg').prop('src', getImageURL(kid, true));
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

				$.mobile.changePage( $('#detailspage'));
			}
		};
		$('#browse_upload').ajaxSubmit(options);

		e.preventDefault();
	});
});
