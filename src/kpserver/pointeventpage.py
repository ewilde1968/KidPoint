'''
Created on Jul 31, 2012

@author: ewilde
'''
import webapp2

import account


class PointEventPage(webapp2.RequestHandler):
    '''
    API to post just a new point event for a specific child
    '''
    def post(self):
        bodybs = self.request.body;
        if not bodybs or len(bodybs) < 1:
            raise ValueError( 'No JSON object in AccountPage:post.')

        acct = account.fromJSON( bodybs)
        if not acct:
            raise ValueError( 'Invalid JSON object in AccountPage:post.')

        acct.put()

        self.response.out.write("ok")
        