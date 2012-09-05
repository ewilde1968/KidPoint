$(document).bind('mobileinit', function() {
/*************************************************************************************
 *
 * Two document variables that are critical are the current account and
 * current kid. These are accessed from the Kid and Account class as well
 * as the various js functions applied to the DOM directly (index.js).
 * 
 *************************************************************************************/

	var setAccountData = function( acctData) {
		$('body').data('account', acctData);
	}
	
	getAccountData = function() {
		return $('body').data('account');
	}

	var setKidData = function( kid) {
		$('body').data('currentKid',kid);
		
		// update the account so that the currently selected kid is stored
		if( kid) {
			getAccountData().changeCurrentKid(kid.kidName);
			refreshPages();
		}
	}
	
	var getKidData = function() {
		return $('body').data('currentKid');
	}


/*************************************************************************************
 *
 * Common functions used on multiple mobile pages.
 * 
 *************************************************************************************/
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

	refreshPages = function() {
		// set all page widgets to reflect new selected kid
		if( $.mobile.activePage.attr('id') == 'homepage')
			setHomePageWidgets();
		else if( $.mobile.activePage.attr('id') == 'detailspage' )
			setDetailsWidgets();
	}

	$(window).bind('orientationchange resize', function() {
		if( !isPhone())
			return;

		if( $.mobile.activePage.attr('id') == 'homepage') {
			setHomePortrait( getKidData());
		}
	});

	$(window).bind('onbeforeunload', function() {
		/*
		 * Closing down the application. POST the data now.
		 */
		getAccountData().postNow();
	});
	
	/*
	 * JQuery Ghost Tap
	 * 
	 * Check to see if this event is a ghost tap, a common problem with JQuery that has
	 * no satisfying fix. See http://forum.jquery.com/topic/tap-fires-twice-with-live-tap
	 * 
	 */
	var lastclickpoint, curclickpoint;
	var isJQMGhostTap = function(event){
		if( !isPhone())
			return false;

		curclickpoint = event.clientX+'x'+event.clientY;
		if (lastclickpoint === curclickpoint) {
			lastclickpoint = '';
			return true;
		} else {
			//alert(lastclickpoint);
			lastclickpoint = curclickpoint;
			return false;
		}
	}

/*************************************************************************************
 *
 * LOGIN page
 * 
 * GET operation to see if credentials are proper. May auto-login by checking to see if
 * credentials are stored in the localStorage of the browser.
 * 
 *************************************************************************************/

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
					
					setAccountData( new Account(response));
					
					$.mobile.changePage( $('#homepage'), {transition:'slide'});
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


/*************************************************************************************
 *
 * CREATEACCOUNT page
 * 
 * POST operation. Check to make sure legal criteria are met and validate all input.
 * 
 *************************************************************************************/

	var ValidateCreateAccountForm = function() {
		// check email field
		var addr = $('#create_addr').val();
		var atpos = addr.indexOf('@');
		var dotpos = addr.lastIndexOf('.');
		if( !addr || addr.length > 1024 || addr.length < 5 || atpos < 1 || dotpos < atpos+2 || dotpos+2 >= addr.length) {
			$('#create_addr').addClass('invalidtext');
			return 'Invalid email address';
		}
		$('#create_addr').removeClass('invalidtext');

		// check password field
		var pwd = $('#create_password').val();
		if( !pwd || pwd.length > 1024 || pwd.indexOf('/') != -1 || pwd.indexOf('?') != -1) {
			$('#create_password').addClass('invalidtext');
			return 'Invalid password. Password cannot contain "/" or "?".';
		}
		$('#create_password').removeClass('invalidtext');

		// check password confirmation field
		var confirm = $('#create_confirm').val();
		if( pwd != confirm) {
			$('#create_confirm').addClass('invalidtext');
			return 'Invalid password confirmation';
		}
		$('#create_confirm').removeClass('invalidtext');

		// check Terms of Use checkbox
		var tou = $('#create_checkbox').is(':checked');
		if( !tou) {
			$('#create_checkbox').addClass('invalidtext');
			return 'You must accept the Terms of Use';
		}
		$('#create_checkbox').removeClass('invalidtext');

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

						setAccountData( new Account(response));
						$.mobile.changePage( $('#homepage'),{transition:'slide'});
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


/*************************************************************************************
 *
 * HOME page
 * 
 * Data fetched at LOGIN or CREATEACCOUNT page. Occasional POST operations if the user
 * inputs anything. GET operation for image, and pre-fetched GET for thumbnail on
 * DETAILS page.
 * 
 *************************************************************************************/

	$('#homepage').live('pageshow', function() {
		createKidList();
		if( getKidData() == null)
			setKidData( getAccountData().getCurrentKid());
		else
			setHomePageWidgets();
	});

	$('#homepage').live('pagehide', function(event,ui) {
		if( ui.nextPage[0].id != 'detailspage') {
			/*
			 * Logging out
			 * 
			 * POST the data now.
			 * 
			 */
			getAccountData().postNow( function() {
				setAccountData( null);	// clear out the old data
				setKidData( null);		// clear out the old data
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

	$('#homepage').live('swipeleft', function() {
		$.mobile.changePage( $('#detailspage'));
	});

	var createKidList = function() {
		var acctData = getAccountData();
		
		if( acctData) {
			// populate the dropdown list
			var items = [];
			$.each(acctData.kids, function(i,k) {
				if( k.kidName == unnamedKidName) // unnamed kid goes first in list
					items.unshift( '<option value="' + k.kidName + '">' + k.kidName + '</option>');
				else
					items.push( '<option value="' + k.kidName + '">' + k.kidName + '</option>');
			});
			
			// join and add the list to the select widget
			itemData = items.join(' ');
			$('#home_childDDL').html( itemData);
		}
	}

	/*
	 * Set the child's portrait
	 * 
	 * An image with a URL (blobKey or static). Keep track of the last
	 * url used so that we know whether or not to reload.
	 * 
	 * width and height are not always accurate after the orientationchange
	 * event. If bugs appear on orientationchange in showing the portrait,
	 * revisit this section to get the portrait layout correct.
	 * 
	 */
	var lastURL = '';
	var setHomePortrait = function(kid) {
		var w = $(window).innerWidth();
		var h = $(window).innerHeight();

		var url = getImageURL(kid, w, h, false);
		console.log( 'load image from:' + url);

		if( lastURL != url) {
			var newImg = $('<img src="' + url + '" class="homeportrait" />');
			$('.homeportrait').replaceWith( newImg);

			lastURL = url;
		}
	}
	
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

		setHomePortrait(kid);

		if( kid) {
			console.log('setHomePageWidgets, kid==' + kid.kidName)

			$('#home_childDDL').val( kid.kidName).selectmenu('refresh');
			$('#home_totalL').html( kid.totalPoints());
		} else {
			// clear widgets as we're clearing the kid data
			console.log( 'clearing kid data');
			
			$('#home_childDDL').val( 'new').selectmenu('refresh');
			$('#home_totalL').html( 0);
		}
	}


	/*
	 * HOMEPAGE widget handling
	 */
	$('#home_minusB').live('tap', function( event, ui) {if( !isJQMGhostTap(event)) bonusBOnTap( -1);});
	$('#home_plusB').live('tap', function( event, ui) {if( !isJQMGhostTap(event)) bonusBOnTap( 1);});

	var bonusBOnTap = function( valChange) {
		var kid = getKidData();
		kid.changePoints( valChange);

		$('#home_totalL').html( kid.totalPoints());
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

	
/*************************************************************************************
 *
 * DETAILS page
 * 
 * Data fetched at LOGIN or CREATEACCOUNT page. GET operation for thumbnail, possibly
 * pre-fetch GET for HOME page's background image. Occasional POST operations to either
 * the account object or the kid object if the user inputs anything.
 * 
 *************************************************************************************/

	$('#detailspage').live('pageshow', function() {
		setDetailsWidgets();
	})

	$('#detailspage').live('swiperight', function() {
		$.mobile.changePage( $('#homepage'));
	});
	
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
				// Changed name from "new" kid to something else
				console.log( 'matched new name');
				kid.changeName(newName);

				// Create a new unnamed kid and add it to the beginning of the kids array
				newKid = new Kid({'kidName':unnamedKidName});
				acctData.kids.unshift(newKid);

				acctData.changeCurrentKid( newName);
			} else {
				kid.changeName( newName);
				acctData.changeCurrentKid( newName);
			}
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
							'kid': kid.key
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
			getAccountData().postNow( function() {GetPicture();});
		else
			GetPicture();
	});
	
	var setDetailsWidgets = function() {
		var kid = getKidData();
		
		var url = getImageURL(kid, 80, 120, true);
		if( kid) {
			$('#details_name').val( kid.kidName);
			$('#details_totalL').html( kid.totalPoints());
		
			if( url.length > 0)
				$('#details_portraitImg').prop('src', url);
		} else {
			// clear the data
			$('#details_name').val( 'new');
			$('#details_totalL').html( 0);
			$('#details_portraitImg').prop('src', url);
		}
	}
	
	
/*************************************************************************************
 *
 * BROWSE page - WebApp Only Dialog
 * 
 * Load an image from the local disk and send it as the child's portrait. POST operation
 * to blobstore. Data for blobstore URL fetched from thumbnail click.
 * 
 *************************************************************************************/

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
