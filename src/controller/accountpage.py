'''
Created on Jul 30, 2012

@author: ewilde
'''
import webapp2
import json

from model import account
from model import loginerror


class AccountPage(webapp2.RequestHandler):
    '''
    API to get and post accounts
    '''
    def get(self, key):
        try:
            acct = account.Account.get( key)
            if acct:
                self.response.out.write(acct.toJSON())
            else:
                self.response.out.write('{"errorMsg":"invalid email address or password."}')

        except:
            self.response.out.write('{"errorMsg":"unexpected error in AccountPage GET."}')

        self.response.headers['Content-Type'] = "text/json";

    def post(self, key):
        try:
            bodybs = self.request.body;
            if not bodybs or len(bodybs) < 1:
                raise ValueError( 'No JSON object in AccountPage:post.')
            
            bodyObj = json.loads(bodybs)
            
            acct = account.Account.get(key)
            if acct:
                acct.Merge( bodyObj)
                acct.put()      # write to the datastore
                outString = acct.toJSON()
                self.response.out.write(outString)
            else:
                self.response.out.write('{"errorMsg":"account does not exist or incorrect password."}')

        except loginerror.LoginError as e:
            self.response.out.write('{"errorMsg":"' + e.args[0] + '"}')
        except:
            #self.response.out.write('{"errorMsg":"unexpected error in AccountPage POST."}')
            raise

        self.response.headers['Content-Type'] = "text/json";
        