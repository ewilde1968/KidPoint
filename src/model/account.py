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
    currentKid = db.StringProperty()

    def getJSONDict(self):
        outputDict = {'address':self.address,
                      'password':self.password,
                      'key':str(self.key()),
                      'currentKid':self.currentKid
                      }

        if self.kids and len(self.kids) > 0:
            outputDict['kids'] = []
            for k in self.kids:
                outputDict['kids'].append( db.get(k).getJSONDict())

        return outputDict
    
    def toJSON(self):
        outputDict = self.getJSONDict();
        result = json.dumps( outputDict)
        return result
    
    def Merge(self, inDict):
        for k in inDict:
            v = inDict[k]
            if k == 'address':
                self.address = v
            elif k == 'password':
                self.password = v
            elif k == 'currentKid':
                self.currentKid = v
            elif k == 'kids':
                if not self.kids:
                    self.kids = []

                for kidObj in v:
                    # merge kid or create new kid
                    mustAppend = False
                    if 'key' in kidObj:
                        newKid = kid.Kid.get(kidObj['key'])
                        # make sure the kid has the right ancestor
                        if newKid.parent() != self:
                            newKid = newKid.moveToAncestor(self)
                            mustAppend = True
                    else:
                        # create a new kid, must have a kidName
                        newKid = kid.Kid( kidName=kidObj['kidName'], parent=self)
                        mustAppend = True

                    newKid.Merge(kidObj)
                    newKid.put()

                    if mustAppend:
                        self.kids.append(newKid.key())


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
