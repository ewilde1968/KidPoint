'''
Created on Aug 25, 2012

@author: ewilde
'''
import webapp2
import json

from model import account
from model import loginerror


class LoginPage(webapp2.RequestHandler):
    '''
    API to login and create accounts
    '''
    def get(self):
        address = self.request.get("login_addr")
        pwd = self.request.get("login_pwd")
        
        try:
            if not address or len(address) < 6:
                raise loginerror.LoginError('invalid email address')

            acct = account.getAccount(address,pwd)
            if acct:
                self.response.out.write(acct.toJSON())
            else:
                self.response.out.write('{"errorMsg":"invalid email address or password."}')

        except loginerror.LoginError as e:
            self.response.out.write('{"errorMsg":"' + e.args[0] + '"}')
        except:
            self.response.out.write('{"errorMsg":"unexpected error in AccountPage GET."}')

        self.response.headers['Content-Type'] = "text/json";

    def post(self):
        address = self.request.get("create_addr")
        pwd = self.request.get("create_password")

        try:
            if account.getAccount(address):
                raise loginerror.LoginError('account already exists')
            
            acct = account.createAccount(address, pwd)
            if acct:
                acct.put()      # write to the datastore
                outString = acct.toJSON()
                self.response.out.write(outString)
            else:
                self.response.out.write('{"errorMsg":"account does not exist or incorrect password."}')

        except loginerror.LoginError as e:
            self.response.out.write('{"errorMsg":"' + e.args[0] + '"}')
        except:
            self.response.out.write('{"errorMsg":"unexpected error in AccountPage POST."}')

        self.response.headers['Content-Type'] = "text/json";
