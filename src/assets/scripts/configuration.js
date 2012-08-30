/*************************************************************************************
 *
 * Configuration Parameters
 * 
 * The constants that configure URLs, endpoints, POST delays, image resources and
 * the 'new' kid workflow.
 * 
 * The endpoint configuration data should be pulled into another file or perhaps
 * index.html in order to simplify the build system for Phone Gap Build vs. webapp
 * target environments.
 *  
 *************************************************************************************/
Configuration = function() {
	rootURL = 'http://localhost:8082/';
	unnamedKidName = "new";
	queueInterval = 5000;	// wait 5 seconds between last activity and post
}
