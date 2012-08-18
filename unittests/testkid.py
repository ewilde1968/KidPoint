'''
Created on Jul 31, 2012

@author: ewilde
'''
from google.appengine.ext import testbed
from google.appengine.ext import db

import unittest
import json

from model import kid
from model import account


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

    def testCreateKid(self):
        # mimic the POST data from the client's account creation page
        kidName = "Leia"
        postData = '{ "kidName":"' + kidName + '"}'

        result = json.JSONDecoder(object_hook=kid.fromJSON).decode(postData)

        self.assertIsNotNone(result)
        self.assertEqual( result.kidName, kidName)

    def testGetKid(self):
        kidName = "Leia"
        k = kid.Kid(kidName=kidName)
        k.put()
        
        result = db.get( k.key())

        # test the account values
        self.assertIsNotNone(result)
        self.assertEqual( result.kidName, kidName)
        
        # test the json encoder
        resultStr = k.toJSON()
        self.assertIsNotNone(resultStr)
        result = json.JSONDecoder(object_hook=kid.fromJSON).decode(resultStr)
        self.assertIsNotNone(result)
        self.assertEqual( result.kidName, kidName)

    def testGetKidWithEvents(self):
        # mimic the POST data from the client's account creation page
        kidName = 'Leia'
        points0 = '1'
        points1 = '2'
        postData = '{ "kidName":"' + kidName + '", '
        postData +=  '"events":[ { "points":' + points0 + ' }, { "points":' + points1 + ' } ] }'

        kr = json.JSONDecoder(object_hook=kid.fromJSON).decode(postData)
        kr.put()
        
        result = db.get(kr.key())
        self.assertIsNotNone(result)
        self.assertEqual( result.kidName, kidName)
        self.assertIsNotNone(result.events)
        self.assertEqual( len(result.events), 2)
        self.assertEqual( db.get(result.events[0]).points, int(points0))
        self.assertEqual( db.get(result.events[1]).points, int(points1))

        jStr = kr.toJSON()
        result = json.JSONDecoder(object_hook=kid.fromJSON).decode(jStr)
        self.assertIsNotNone(result)
        self.assertEqual( result.kidName, kidName)
        self.assertIsNotNone(result.events)
        self.assertEqual( len(result.events), 4)
        self.assertEqual( db.get(result.events[0]).points, int(points0))
        self.assertEqual( db.get(result.events[1]).points, int(points1))
        
    def testMoveKidToAncestor(self):
        # mimic the POST data from the client's account creation page
        kidName = 'Leia'
        points0 = '1'
        postData = '{ "kidName":"' + kidName + '", '
        postData +=  '"events":[ { "points":' + points0 + ' } ] }'

        kr = json.JSONDecoder(object_hook=kid.fromJSON).decode(postData)
        kr.put()

        result = db.get(kr.key())
        self.assertIsNotNone(result)
        self.assertEqual( result.kidName, kidName)
        self.assertIsNotNone(result.events)
        self.assertEqual( len(result.events), 1)
        self.assertEqual( db.get(result.events[0]).points, int(points0))
        
        addr = "test@tester.com"
        pwd = "dummypwd"
        account.createAccount(addr, pwd).put()
        acct = account.getAccount(addr, pwd)

        result = result.moveToAncestor(acct)
        self.assertIsNotNone(result)
        self.assertEqual( result.kidName, kidName)
        self.assertIsNotNone(result.events)
        self.assertEqual( len(result.events), 1)
        self.assertEqual( db.get(result.events[0]).points, int(points0))
        self.assertIsNotNone( result.parent())
        self.assertEqual( result.parent_key(), acct.key())

    def testSetImage(self):
        pass    # not worth writing a test case with GAE's simplistic implementation
    

if __name__ == '__main__':
    unittest.main()    
