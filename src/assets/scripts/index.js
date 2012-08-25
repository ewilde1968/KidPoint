$(document).bind('mobileinit', function() {
	var localURL = 'http://localhost:8082/';
	var remoteURL = 'http://kidspointsbeta.appspot.com/';
	var rootURL = localURL;
	var loginURL = rootURL + 'login';
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

		// set all page widgets to reflect new selected kid
		if( $.mobile.activePage[0] == 'homepage')
			setHomePageWidgets();
		else if( $.mobile.activePage[0] == 'detailspage' )
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
	
	var defaultThumbnail = 'stylesheets/images/camera.png';
	//var defaultPortrait = 'stylesheets/images/johnny_automatic_girl_and_boy.gif';
	var defaultPortrait = '';
	var getImageURL = function( kid, width, height, thumbnail) {
		var url;
		if( kid && kid.blobKey) {
			url = imagestoreURL + '?blobKey=' + kid.blobKey + '&height=' + height + '&width=' + width;
		} else {
			if( thumbnail)
				return defaultThumbnail;
			
			return defaultPortrait;
		}

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

		if( !kid.newPoints)
			kid.newPoints = 0;
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
					'key':k.key
				};
				
			// all events are considered new events with new points
			if( k.newPoints)
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
								if( k.oldName || k.newPoints) {
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
	 * Login page is showing.
	 * 
	 * If login information cached, then load it and attempt to login. Also
	 * set the window height so that the background fills the screen.
	 * 
	 */
	$('#loginpage').live('pageshow', function() {
		// load the cached credentials
		var userID = localStorage.getItem( 'userID');
		var password = localStorage.getItem( 'pwd');

		$('#login_addr').val( userID ? userID : '');
		$('#login_pwd').val( password ? password : '');
		$('#login_errtext').css('visibility','hidden');
		
		// make sure height takes up full screen for background drawing
		var winHeight = $(window).height();
		var headerHeight = $('#loginheader').height();
		var contentHeight = $('#logincontent').height();
		if( contentHeight < (winHeight - headerHeight))
			$('#logincontent').height( winHeight - headerHeight);

		if( userID && password)
			SubmitLoginForm( true)
	});
	
	/*
	 * Attempt to login using the form's userID and password. If the login fails,
	 * then either set error messages or return silently, depending on the silent
	 * argument. This is used for automatic login using persistent credentials as
	 * well as normal login using user supplied credentials.
	 * 
	 */
	var SubmitLoginForm = function(silent) {
		var options = {
			clearForm: true,
			dataType: 'json',
			url: loginURL,
			success: function(response, status, xhr, fe) {
				if( "errorMsg" in response) {
					// login failed, clear the credentials
					localStorage.removeItem('userID');
					localStorage.removeItem('pwd');
					
					if( !silent) {
						$('#login_errtext').text(response.errorMsg);
						$('#login_errtext').css('visibility','visible');
					}
				} else {
					// login succeeded, store the credentials
					localStorage.setItem('userID', response.address);
					localStorage.setItem('pwd', response.password);
					
					setAccountData( response);
					$.mobile.changePage( $('#homepage'));
				}
			},
			error: function(response, status, xhr, fe) {
				if( !silent) {
					$('#login_errtext').text('server error');
					$('#login_errtext').css('visibility','visible');
				}
			}
		};
		$('#loginform').ajaxSubmit(options);
	}

	$('#login_loginB').live('vclick', function( event, ui) {
		SubmitLoginForm(false);
	});


	var ValidateCreateAccountForm = function() {
		// check email field
		var addr = $('#create_addr').val();
		var atpos = addr.indexOf('@');
		var dotpos = addr.lastIndexOf('.');
		if( !addr || addr.length > 1024 || addr.length < 5 || atpos < 1 || dotpos < atpos+2 || dotpos+2 >= addr.length)
			return 'Invalid email address';

		// check password field
		var pwd = $('#create_password').val();
		if( !pwd || pwd.length > 1024 || pwd.indexOf('/') != -1 || pwd.indexOf('?') != -1)
			return 'Invalid password. Password cannot contain "/" or "?".';

		// check password confirmation field
		var confirm = $('#create_confirm').val();
		if( pwd != confirm)
			return 'Invalid password confirmation';

		// check Terms of Use checkbox
		var tou = $('#create_checkbox').is(':checked');
		if( !tou)
			return 'You must accept the Terms of Use';

		return 'success';
	}

	$('#create_loginB').live('vclick', function( event, ui) {
		var valid = ValidateCreateAccountForm();

		if( valid == 'success') {
			var options = {
				clearForm: true,
				dataType: 'json',
				url: loginURL,
				success: function(response, status, xhr, fe) {
					// clear the TOU checkbox to be certain of recent acceptance
					$('#create_checkbox').prop({'checked':false}).checkboxradio('refresh');

					if( "errorMsg" in response) {
						// login failed, clear the credentials
						localStorage.removeItem('userID');
						localStorage.removeItem('pwd');

						$('#err_servermainmsg').text('the account you tried to create is invalid. please try again.');
						$('#err_servermsg').text(response.errorMsg);
						$.mobile.changePage( $('#errdialog'));
					} else {
						// login succeeded, store the credentials
						localStorage.setItem('userID', response.address);
						localStorage.setItem('pwd', response.password);

						setAccountData( response);
						$.mobile.changePage( $('#homepage'));
					}
				},
				error: function(response, status, xhr, fe) {
					// clear the TOU checkbox to be certain of recent acceptance
					$('#create_checkbox').prop({'checked':false}).checkboxradio('refresh');

					$('#err_servermainmsg').text('the account you tried to create is invalid. please try again.');
					$('#err_servermsg').text('server error');
					$.mobile.changePage( $('#errdialog'));
				}
			};
			$('#createaccountform').ajaxSubmit(options);
		} else {
			$('#err_servermainmsg').text('the account you tried to create is invalid. please try again.');
			$('#err_servermsg').text(valid);
			$.mobile.changePage( $('#errdialog'));
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
			
		// make sure height takes up full screen for background drawing
		var winHeight = $(window).height();
		var contentHeight = $('#homecontent').height();
		if( contentHeight < winHeight)
			$('#homecontent').height( winHeight);

		setHomePageWidgets();
	});
	
	$('#homepage').live('pagehide', function(event,ui) {
		if( ui.nextPage[0].id != 'detailspage') {
			/*
			 * Logging out or closing down the application
			 * 
			 * POST the data now.
			 * 
			 */
			postAccountNow( function() {
				setAccountData( null);
				setKidData( null);
			});
		}
		
		if( ui.nextPage[0].id == 'loginpage') {
			/*
			 * Logging out
			 * 
			 * remove the stored credentials and clear out data widgets
			 * 
			 */
			localStorage.removeItem('userID');
			localStorage.removeItem('pwd');
			
			setKidData(null);
		}
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

		var url = getImageURL(kid, $('#homecontent').width(), $('#homecontent').height(), false);
		$('#home_portraitImg').prop('src', url);

		if( kid) {
			console.log('setHomePageWidgets, kid==' + kid.kidName)

			$('#home_childDDL').val( kid.kidName).selectmenu('refresh');
			$('#home_totalL').html( getKidTotal(kid));
		} else {
			// clear widgets as we're clearing the kid data
			console.log( 'clearing kid data');
			
			$('#home_childDDL').val( 'new').selectmenu('refresh');
			$('#home_totalL').html( 0);
		}
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

		var newName = $('#details_name').val().trim();
		console.log( 'new name = ' + newName);
		
		// either load another kid already extant or change this kid's kidName
		if( newName != kid.kidName) {
			var goHome = false;
			$.each( acctData.kids, function(i, item) {
				if( item.kidName == newName) {
					console.log( 'matched kid: ' + item.kidName);
					setKidData( item);
					goHome = true;
					return false;
				}
			});
			if( goHome) return;

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
		
		var url = getImageURL(kid, 80, 120, true);
		if( kid) {
			$('#details_name').val( kid.kidName);
			$('#details_totalL').html( getKidTotal(kid));
		
			if( kid.blobKey)
				$('#details_portraitImg').prop('src', url);
		} else {
			// clear the data
			$('#details_name').val( 'new');
			$('#details_totalL').html( 0);
			$('#details_portraitImg').prop('src', url);
		}
	}
	
	
	/*
	 * BROWSEDIALOG initialization and widget events
	 * 
	 */
	$('#browse_submit').live( 'click', function(e) {
		var options = {
			clearForm: true,
			success: function(response, status, xhr, fe) {
				var currentAcct = getAccountData();
				$.each( currentAcct.kids, function(i,k) {
					if( response.key == k.key)
						k.blobKey = response.blobKey;	// update the kid in the account record
				});

				$.mobile.changePage( $('#detailspage'));
			}
		};
		$('#browse_upload').ajaxSubmit(options);

		e.preventDefault();
	});
});
