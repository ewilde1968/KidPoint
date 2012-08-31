/*************************************************************************************
 *
 * ENVIRONMENT_CONSTANT
 * 
 * The constants that determines whether this is a devserver, browser app or mobile app
 * 
 *************************************************************************************/
ENVIRONMENT_CONSTANT = "devserver"
/*ENVIRONMENT_CONSTANT = "browser"
/*ENVIRONMENT_CONSTANT = "device"


/*************************************************************************************
 *
 * Configuration Parameters
 * 
 * The constants that configure endpoints
 * 
 *************************************************************************************/
if( ENVIRONMENT_CONSTANT == "devserver")
	rootURL = 'http://localhost:8082/';
else if( ENVIRONMENT_CONSTANT == "browser")
	rootURL = 'http://kidspointsbeta.appspot.com/';
else if( ENVIRONMENT_CONSTANT == "device")
	jQuery.ajax({
		async: false,
		type: "GET",
		url: "phonegap.js",
		data: null,
		dataType: 'script',
		success: function() {
			rootURL = 'http://kidspointsbeta.appspot.com/';

			// setup for Phone Gap access cross domain
			if( $.support)
				$.support.cors = true;
			if( $.mobile) {
				$.mobile.allowCrossDomainPages = true;
				$.mobile.pushState = false;
			}
		}
	});
loginURL = rootURL + 'login';
accountURL = rootURL + 'account';
kidURL = rootURL + 'kid';
imagestoreURL = rootURL + 'imagestore';
blobstoreURL = rootURL + 'blobstore';


/*************************************************************************************
 *
 * Configuration Parameters
 * 
 * The constants that configure POST delays, image resources and the 'new' kid workflow.
 * 
 *************************************************************************************/
unnamedKidName = "new";
queueInterval = 5000;	// wait 5 seconds between last activity and post
defaultPortrait = '';
defaultThumbnail = 'stylesheets/images/camera.png';


/*************************************************************************************
 *
 * Support for mobile devices
 * 
 * Determine if we're on a phone/tablet with a camera. Used to see if images should
 * be pulled from a hard drive or a picture gallery.
 * 
 * Also make sure that cross domain access exists.
 * 
 *************************************************************************************/

var isPhone = function() {
	return navigator && navigator.camera;
}
