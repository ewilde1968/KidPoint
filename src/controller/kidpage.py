'''
Created on Aug 26, 2012

@author: ewilde
'''
import webapp2
import json

from model import kid
from model import loginerror


class KidPage(webapp2.RequestHandler):
    '''
    API to get and post accounts
    '''
    def get(self, key):
        try:
            k = kid.Kid.get( key)
            if k:
                self.response.out.write(k.toJSON())
            else:
                self.response.out.write('{"errorMsg":"invalid email address or password."}')

        except:
            self.response.out.write('{"errorMsg":"unexpected error in KidPage GET."}')

        self.response.headers['Content-Type'] = "text/json";

    def post(self, key):
        try:
            bodybs = self.request.body;
            if not bodybs or len(bodybs) < 1:
                raise ValueError( 'No JSON object in KidPage:post.')
            
            bodyObj = json.loads(bodybs)
            
            k = kid.Kid.get(key)
            if k:
                k.Merge( bodyObj)
                k.put()      # write to the datastore
                outString = k.toJSON()
                self.response.out.write(outString)
            else:
                self.response.out.write('{"errorMsg":"kid does not exist"}')

        except loginerror.LoginError as e:
            self.response.out.write('{"errorMsg":"' + e.args[0] + '"}')
        except:
            self.response.out.write('{"errorMsg":"unexpected error in AccountPage POST."}')

        self.response.headers['Content-Type'] = "text/json";
        