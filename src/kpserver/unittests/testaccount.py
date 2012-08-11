'''
Created on Jul 31, 2012

@author: ewilde
'''
from google.appengine.ext import testbed
from google.appengine.ext import db

import unittest
import json

from kpserver import account
from kpserver import kid
from kpserver import pointevent


class DemoTestCase(unittest.TestCase):

    def setUp(self):
        # First, create an instance of the Testbed class.
        self.testbed = testbed.Testbed()
        # Then activate the testbed, which prepares the service stubs for use.
        self.testbed.activate()
        # Next, declare which service stubs you want to use.
        self.testbed.init_datastore_v3_stub()

    def tearDown(self):
        self.testbed.deactivate()

    def testCreateAccount(self):
        # mimic the POST data from the client's account creation page
        addr = "test@tester.com"
        pwd = "dummypwd"
        postData = '{ "address":"' + addr + '", "password":"' + pwd + '", "create":"true" }'
        
        # create the account or fetch an existing account
        result = json.JSONDecoder(object_hook=account.fromJSON).decode(postData)

        # test the account values
        self.assertIsNotNone(result)
        self.assertEqual( result.address, addr)
        self.assertEqual( result.password, pwd)
        
    def testGetAccount(self):
        # mimic a GET of an account
        addr = "test@tester.com"
        pwd = "dummypwd"
        account.createAccount(addr, pwd).put()

        result = account.getAccount(addr, pwd)

        # test the account values
        self.assertIsNotNone(result)
        self.assertEqual( result.address, addr)
        self.assertEqual( result.password, pwd)
        
        # test the json encoder
        resultStr = result.toJSON()
        self.assertIsNotNone(resultStr)

        # fetch again via the JSON string
        result = json.JSONDecoder(object_hook=account.fromJSON).decode(resultStr)
        self.assertIsNotNone(result)
        self.assertEqual( result.address, addr)
        self.assertEqual( result.password, pwd)

    def testAccountWithKid(self):
        kidName = 'Alisa'
        imageURL = 'http://miggle.biggle.com/myfoofyimage.jpg'
        addr = "test@tester.com"
        pwd = "dummypwd"

        postData = '{ "address":"' + addr + '", "password":"' + pwd + '", "create":"true", '
        postData +=  '"kids": [ { "kidName":"' + kidName + '", "imageURL":"' + imageURL + '" } ] }'

        acct = json.JSONDecoder(object_hook=account.fromJSON).decode(postData)
        acct.put()
        
        result = db.get( acct.key())
        self.assertIsNotNone(result)
        self.assertEqual( result.address, addr)
        self.assertEqual( result.password, pwd)
        self.assertIsNotNone(result.kids)
        
        result = db.get( result.kids[0])
        self.assertIsNotNone(result)
        self.assertEqual( result.kidName, kidName)

    
    def testAccountAddPointsToKid(self):
        kidName = 'Alisa'
        addr = "test@tester.com"
        pwd = "dummypwd"
        points0 = 1
        points1 = 2

        pe0 = pointevent.PointEvent( points = points0)
        pe0.put()
        pe1 = pointevent.PointEvent( points = points1)
        pe1.put()
        pl = [ pe0.key(), pe1.key()]
        k = kid.Kid( kidName=kidName, events=pl)
        k.put()
        kl = [ k.key() ]
        a = account.Account( address=addr, password=pwd, kids=kl)
        a.put()

        # initial types created and put into datastore
        # POST additional points
        points2 = '3'
        postData = '{ "address":"' + addr + '", "kids":[{"kidName":"' + kidName + '", "events":[{"points":' + points2 + '}]}]}'

        result = json.JSONDecoder(object_hook=account.fromJSON).decode(postData)
        self.assertIsNotNone(result)
        self.assertEqual( result.address, addr)
        self.assertEqual( result.password, pwd)
        self.assertIsNotNone(result.kids)

        result = db.get( result.kids[0])
        self.assertIsNotNone(result)
        self.assertEqual( result.kidName, kidName)
        self.assertIsNotNone( result.events)
        self.assertEqual( len(result.events), 3)

        self.assertEqual( db.get(result.events[0]).points, int(points0))
        self.assertEqual( db.get(result.events[1]).points, int(points1))
        self.assertEqual( db.get(result.events[2]).points, int(points2))


if __name__ == '__main__':
    unittest.main()    
