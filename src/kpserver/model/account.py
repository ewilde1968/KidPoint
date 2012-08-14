'''
Created on Jul 30, 2012

@author: ewilde
'''
from google.appengine.ext import db

import json

import kid
import loginerror


class Account(db.Model):
    '''
    User account that contains all kids for that user
    '''
    address = db.EmailProperty(required=True,indexed=True)
    password= db.StringProperty()
    kids = db.ListProperty(db.Key)

    def getJSONDict(self):
        outputDict = { 'address':self.address, 'password':self.password, 'key':self.key().id()}

        if self.kids and len(self.kids) > 0:
            outputDict['kids'] = []
            for k in self.kids:
                outputDict['kids'].append( db.get(k).getJSONDict())

        return outputDict
    
    def toJSON(self):
        outputDict = self.getJSONDict();
        result = json.dumps( outputDict)
        return result


def getAccount( emailAddr, pwd = None):
    '''
    Fetch an account from the database and return it
    '''
    q = Account.all()
    q.filter("address = ", emailAddr)
    result = q.get()
    
    if result:
        if pwd and pwd != result.password:
            raise loginerror.LoginError( "User account " + emailAddr + " password does not match.")
        
    return result       # can return None


def createAccount( emailAddr, pwd):
    result = Account(address=emailAddr, password=pwd)
    return result


def fromJSON( jo):
    '''
    Decoder for Account JSON objects.
    
    Required components: address
    Conditionally required components: password
    Optional components: key, create, all other components
    
    If the required address component is not a part of the JSON string, then
    assume it is a sub-object. The only sub-object available is the Kid.
    
    If the create member is true then this is an account creation attempt. In
    such a case, if the account already exists throw and exception.
    '''
    try:
        if not 'address' in jo:
            try:
                # try to create a Kid instead
                return kid.fromJSON(jo)
            except:
                raise loginerror.LoginError( 'unexpected error attempting to create Kid object')
                
        # looks like its an Account object, create one
        result = None
        if 'key' in jo:
            result = Account.get_by_id( jo['key'])

        # get the password string for future use
        pwd = None
        if 'password' in jo:
            pwd = jo['password']
            
        # check to see if this an account creation attempt
        if 'create' in jo and (result or getAccount( jo['address'])):
            raise loginerror.LoginError( 'account already exists')
            
        # address must be in jo
        if not result:
            result = getAccount( jo['address'], pwd) 
            
            if not result and 'create' in jo:
                result = createAccount( jo['address'], pwd)
        else:
            result.address = jo['address']

        # result must now exist
        if pwd:
            result.password = pwd
                
        if 'kids' in jo:
            if not result.kids:
                result.kids = []
            for k in jo['kids']:
                # all Kids are now created
                append = not k.is_saved()
                k.put()
                
                if append:
                    result.kids.append( k.key())

        return result
    except loginerror.LoginError:
        raise
    except:
        raise loginerror.LoginError( 'unexpected error in Account.fromJSON')
