'''
Created on Jul 31, 2012

@author: ewilde
'''
from google.appengine.ext import testbed
from google.appengine.ext import db

import unittest
import json

from kpserver import kid


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
        imageURL = "http://miggle.biggle.com/myfoofyimage.jpg"
        postData = '{ "kidName":"' + kidName + '", "imageURL":"' + imageURL + '" }'

        result = json.JSONDecoder(object_hook=kid.fromJSON).decode(postData)

        self.assertIsNotNone(result)
        self.assertEqual( result.kidName, kidName)
        self.assertEqual( result.imageURL, imageURL)

    def testGetKid(self):
        kidName = "Leia"
        imageURL = "http://miggle.biggle.com/myfoofyimage.jpg"
        k = kid.Kid(kidName=kidName,imageURL=imageURL)
        k.put()
        
        result = db.get( k.key())

        # test the account values
        self.assertIsNotNone(result)
        self.assertEqual( result.kidName, kidName)
        self.assertEqual( result.imageURL, imageURL)
        
        # test the json encoder
        resultStr = k.toJSON()
        self.assertIsNotNone(resultStr)
        result = json.JSONDecoder(object_hook=kid.fromJSON).decode(resultStr)
        self.assertIsNotNone(result)
        self.assertEqual( result.kidName, kidName)
        self.assertEqual( result.imageURL, imageURL)

    def testGetKidWithEvents(self):
        # mimic the POST data from the client's account creation page
        kidName = 'Leia'
        imageURL = 'http://miggle.biggle.com/myfoofyimage.jpg'
        points0 = '1'
        points1 = '2'
        postData = '{ "kidName":"' + kidName + '", "imageURL":"' + imageURL + '", '
        postData +=  '"events":[ { "points":' + points0 + ' }, { "points":' + points1 + ' } ] }'

        kr = json.JSONDecoder(object_hook=kid.fromJSON).decode(postData)
        kr.put()
        
        result = db.get(kr.key())
        self.assertIsNotNone(result)
        self.assertEqual( result.kidName, kidName)
        self.assertEqual( result.imageURL, imageURL)
        

if __name__ == '__main__':
    unittest.main()    
